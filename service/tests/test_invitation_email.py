import io
import json
import os
import sys
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from invitation_email import deliver_invitation


class InvitationEmailTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            'INVITATION_EMAIL_ENABLED': 'true',
            'MICROSOFT_TENANT_ID': 'tenant',
            'MICROSOFT_CLIENT_ID': 'client',
            'MICROSOFT_CLIENT_SECRET': 'private-secret',
        }, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        self.expires = datetime(2026, 10, 1, tzinfo=timezone.utc)

    def deliver(self, url='https://app.ombuddi.com/accept-invite?token=private-token'):
        return deliver_invitation('invitee@example.com', url, self.expires)

    @patch('invitation_email.urlopen')
    def test_disabled_makes_no_network_calls(self, send):
        os.environ['INVITATION_EMAIL_ENABLED'] = 'false'
        self.assertEqual(self.deliver()['status'], 'not_configured')
        send.assert_not_called()

    @patch('invitation_email.urlopen')
    def test_missing_credentials_or_insecure_url_does_not_send(self, send):
        self.assertEqual(self.deliver('http://localhost:5173/invite')['status'], 'unconfirmed')
        del os.environ['MICROSOFT_CLIENT_SECRET']
        self.assertEqual(self.deliver()['status'], 'unconfirmed')
        send.assert_not_called()

    @patch('invitation_email.urlopen')
    def test_graph_acceptance_sender_recipient_and_message(self, send):
        response = MagicMock()
        response.__enter__.return_value.status = 202
        send.side_effect = [io.BytesIO(b'{"access_token":"access-secret"}'), response]
        self.assertEqual(self.deliver(), {'status': 'accepted', 'sender': 'admin@ombuddi.com'})
        token_request = send.call_args_list[0].args[0]
        self.assertIn(b'grant_type=client_credentials', token_request.data)
        request = send.call_args_list[1].args[0]
        self.assertEqual(request.full_url, 'https://graph.microsoft.com/v1.0/users/admin%40ombuddi.com/sendMail')
        payload = json.loads(request.data)
        self.assertEqual(payload['message']['toRecipients'], [{'emailAddress': {'address': 'invitee@example.com'}}])
        self.assertIn('private-token', payload['message']['body']['content'])
        self.assertTrue(payload['saveToSentItems'])

    @patch('invitation_email.urlopen')
    def test_failure_does_not_leak_provider_error_or_retry(self, send):
        send.side_effect = HTTPError('https://example.com/private-token', 403, 'private-secret', {}, None)
        with self.assertLogs('invitation_email', level='WARNING') as logs:
            self.assertEqual(self.deliver()['status'], 'unconfirmed')
        self.assertNotIn('private-', ' '.join(logs.output))
        self.assertEqual(send.call_count, 1)

    @patch('invitation_email.urlopen')
    def test_send_timeout_is_unconfirmed_without_retry(self, send):
        send.side_effect = [io.BytesIO(b'{"access_token":"token"}'), TimeoutError()]
        self.assertEqual(self.deliver()['status'], 'unconfirmed')
        self.assertEqual(send.call_count, 2)
