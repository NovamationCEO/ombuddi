"""Microsoft 365 invitation delivery. Never log message bodies or credentials."""
import hashlib
import time
from threading import Lock
from datetime import timezone
from urllib.error import HTTPError

import json
import logging
import os
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)
SENDER = 'admin@ombuddi.com'
TOKEN_LOCK_TIMEOUT_SECONDS = 2


class TokenRefreshBusy(Exception):
    """Another request is still refreshing the shared Microsoft token."""


_token_cache = {}
_token_lock = Lock()


def _access_token(tenant, client, secret):
    key = (tenant, client, hashlib.sha256(secret.encode()).digest())
    if not _token_lock.acquire(timeout=TOKEN_LOCK_TIMEOUT_SECONDS):
        raise TokenRefreshBusy()
    try:
        cached = _token_cache.get(key)
        if cached and cached[1] > time.monotonic():
            return cached[0]
        request = Request(
            f'https://login.microsoftonline.com/{quote(tenant, safe="")}/oauth2/v2.0/token',
            data=urlencode({'client_id': client, 'client_secret': secret,
                            'scope': 'https://graph.microsoft.com/.default',
                            'grant_type': 'client_credentials'}).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded'}, method='POST',
        )
        started = time.monotonic()
        with urlopen(request, timeout=10) as response:
            payload = json.load(response)
        token = payload['access_token']
        if not isinstance(token, str) or not token:
            raise ValueError('Invalid token response')
        lifetime = max(0, float(payload.get('expires_in', 0)) - 60)
        _token_cache.clear()
        _token_cache[key] = (token, started + lifetime)
        return token
    finally:
        _token_lock.release()


def deliver_invitation(recipient, invite_url, expires_at):
    """Called only after commit; delivery failure must not undo a valid invitation.

    Retry once only after an explicit 401 rejection; never retry an uncertain send.
    """
    result = {'sender': SENDER, 'status': 'not_configured'}
    if os.environ.get('INVITATION_EMAIL_ENABLED', '').lower() != 'true':
        return result
    stage = 'configuration'
    try:
        tenant = os.environ['MICROSOFT_TENANT_ID'].strip()
        client = os.environ['MICROSOFT_CLIENT_ID'].strip()
        secret = os.environ['MICROSOFT_CLIENT_SECRET'].strip()
        if not all((tenant, client, secret)):
            raise ValueError('Incomplete Microsoft configuration')
        url = urlsplit(invite_url)
        if url.scheme != 'https' or not url.hostname or url.username or url.password:
            raise ValueError('Invitation email requires an HTTPS frontend URL')
        stage = 'authentication'
        token = _access_token(tenant, client, secret)
        message = {
            'message': {
                'subject': 'Your Ombuddi invitation',
                'body': {
                    'contentType': 'Text',
                    'content': (
                        'You have been invited to Ombuddi.\n\n'
                        f'Accept your invitation: {invite_url}\n\n'
                        f'Sign in or create an account using {recipient}, then verify your email.\n'
                        f"This one-time invitation expires at {expires_at.astimezone(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}.\n\n"
                        'If you were not expecting this invitation, you can ignore it.\n'
                        f'For help, reply to {SENDER}.\n\nOmbuddi'
                    ),
                },
                'toRecipients': [{'emailAddress': {'address': recipient}}],
                'replyTo': [{'emailAddress': {'address': SENDER}}],
            },
            'saveToSentItems': True,
        }
        for attempt in range(2):
            request = Request(
                f'https://graph.microsoft.com/v1.0/users/{quote(SENDER, safe="")}/sendMail',
                data=json.dumps(message).encode(),
                headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
                method='POST',
            )
            stage = 'submission'
            result['submissionAttempts'] = attempt + 1
            try:
                with urlopen(request, timeout=10) as response:
                    if response.status != 202:
                        raise ValueError('Unexpected sendMail response')
                break
            except HTTPError as exc:
                if exc.code != 401:
                    raise
                # Preserve the rejection if refresh subsequently fails locally.
                result['previousHttpStatus'] = 401
                # Invalidate only the token rejected, not another thread's refresh.
                stage = 'authentication'
                if not _token_lock.acquire(timeout=TOKEN_LOCK_TIMEOUT_SECONDS):
                    exc.close()
                    raise TokenRefreshBusy()
                try:
                    for key, cached in list(_token_cache.items()):
                        if cached[0] == token:
                            del _token_cache[key]
                finally:
                    _token_lock.release()
                if attempt == 1:
                    stage = 'submission'
                    raise
                exc.close()
                stage = 'authentication'
                token = _access_token(tenant, client, secret)
        result['status'] = 'accepted'
    except Exception as exc:
        code = exc.code if isinstance(exc, HTTPError) else None
        logger.warning('Invitation email failed: stage=%s type=%s http_status=%s previous_http_status=%s',
                       stage, type(exc).__name__, code, result.get('previousHttpStatus'))
        result['stage'] = stage
        if code is not None:
            result['httpStatus'] = code
        if isinstance(exc, TokenRefreshBusy):
            result.update(status='failed', reason='token_refresh_busy')
        elif stage == 'configuration':
            result.update(status='configuration_error', reason='invalid_configuration')
        elif stage == 'authentication':
            result.update(status='failed', reason='authentication_failed')
        elif code is not None and 400 <= code < 500:
            result.update(status='rejected', reason='provider_rejected')
        else:
            result.update(status='unconfirmed', reason='submission_unknown')
        if isinstance(exc, HTTPError):
            exc.close()
    return result
