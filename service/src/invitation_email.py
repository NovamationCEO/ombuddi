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
_token_cache = {}
_token_lock = Lock()


def _access_token(tenant, client, secret):
    key = (tenant, client, hashlib.sha256(secret.encode()).digest())
    with _token_lock:
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


def deliver_invitation(recipient, invite_url, expires_at):
    """Called only after commit; delivery failure must not undo a valid invitation.

    No automatic retries: a timeout can occur after Microsoft accepted the mail.
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
        request = Request(
            f'https://graph.microsoft.com/v1.0/users/{quote(SENDER, safe="")}/sendMail',
            data=json.dumps(message).encode(),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            method='POST',
        )
        stage = 'submission'
        with urlopen(request, timeout=10) as response:
            if response.status != 202:
                raise ValueError('Unexpected sendMail response')
        result['status'] = 'accepted'
    except Exception as exc:
        code = exc.code if isinstance(exc, HTTPError) else None
        logger.warning('Invitation email failed: stage=%s type=%s http_status=%s',
                       stage, type(exc).__name__, code)
        result['stage'] = stage
        if code is not None:
            result['httpStatus'] = code
        if stage == 'configuration':
            result.update(status='configuration_error', message=(
                'Email was not sent. Configure the Microsoft credentials and an HTTPS FRONTEND_URL.'
            ))
        elif stage == 'authentication':
            result.update(status='failed', message=(
                'Email was not sent. Microsoft authentication failed; check credentials and service connectivity.'
            ))
        elif code is not None and 400 <= code < 500:
            result.update(status='rejected', message=(
                'Microsoft rejected the email. Check mailbox permissions, service limits, and the HTTP status.'
            ))
            if code == 401:
                with _token_lock:
                    _token_cache.clear()
        else:
            result.update(status='unconfirmed', message=(
                'Email submission could not be confirmed. Check Sent Items or Microsoft message trace before sending again.'
            ))
    return result
