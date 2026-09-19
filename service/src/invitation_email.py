"""Microsoft 365 invitation delivery. Never log message bodies or credentials."""
import json
import logging
import os
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)
SENDER = 'admin@ombuddi.com'


def deliver_invitation(recipient, invite_url, expires_at):
    """Called only after commit; delivery failure must not undo a valid invitation.

    No automatic retries: a timeout can occur after Microsoft accepted the mail.
    """
    result = {'sender': SENDER, 'status': 'not_configured'}
    if os.environ.get('INVITATION_EMAIL_ENABLED', '').lower() != 'true':
        return result
    try:
        tenant = os.environ['MICROSOFT_TENANT_ID'].strip()
        client = os.environ['MICROSOFT_CLIENT_ID'].strip()
        secret = os.environ['MICROSOFT_CLIENT_SECRET'].strip()
        if not all((tenant, client, secret)):
            raise ValueError('Incomplete Microsoft configuration')
        url = urlsplit(invite_url)
        if url.scheme != 'https' or not url.hostname or url.username or url.password:
            raise ValueError('Invitation email requires an HTTPS frontend URL')
        token_request = Request(
            f'https://login.microsoftonline.com/{quote(tenant, safe="")}/oauth2/v2.0/token',
            data=urlencode({
                'client_id': client,
                'client_secret': secret,
                'scope': 'https://graph.microsoft.com/.default',
                'grant_type': 'client_credentials',
            }).encode(),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            method='POST',
        )
        with urlopen(token_request, timeout=10) as response:
            token = json.load(response)['access_token']
        message = {
            'message': {
                'subject': 'Your Ombuddi invitation',
                'body': {
                    'contentType': 'Text',
                    'content': (
                        'You have been invited to Ombuddi.\n\n'
                        f'Accept your invitation: {invite_url}\n\n'
                        f'Sign in or create an account using {recipient}, then verify your email.\n'
                        f'This one-time invitation expires at {expires_at.isoformat()}.\n\n'
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
        with urlopen(request, timeout=10) as response:
            if response.status != 202:
                raise ValueError('Unexpected sendMail response')
        result['status'] = 'accepted'
    except Exception:
        # Provider exceptions can contain tokens, message content, and recipient data.
        logger.warning('Microsoft invitation email was not confirmed; check sender configuration and Microsoft message trace')
        result['status'] = 'unconfirmed'
    return result
