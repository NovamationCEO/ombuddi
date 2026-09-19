import io
import json
import os
import sys
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from invitation_email import deliver_invitation, _token_cache


class InvitationEmailTests(unittest.TestCase):
    def setUp(self):
        _token_cache.clear()
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
        self.assertEqual(self.deliver('http://localhost:5173/invite')['status'], 'configuration_error')
        del os.environ['MICROSOFT_CLIENT_SECRET']
        self.assertEqual(self.deliver()['status'], 'configuration_error')
        send.assert_not_called()

    @patch('invitation_email.urlopen')
    def test_graph_acceptance_sender_recipient_and_message(self, send):
        response = MagicMock()
        response.__enter__.return_value.status = 202
        send.side_effect = [io.BytesIO(b'{"access_token":"access-secret"}'), response]
        self.assertEqual(self.deliver(), {'status': 'accepted', 'sender': 'admin@ombuddi.com', 'submissionAttempts': 1})
        token_request = send.call_args_list[0].args[0]
        self.assertIn(b'grant_type=client_credentials', token_request.data)
        request = send.call_args_list[1].args[0]
        self.assertEqual(request.full_url, 'https://graph.microsoft.com/v1.0/users/admin%40ombuddi.com/sendMail')
        payload = json.loads(request.data)
        self.assertEqual(payload['message']['toRecipients'], [{'emailAddress': {'address': 'invitee@example.com'}}])
        self.assertIn('private-token', payload['message']['body']['content'])
        self.assertTrue(payload['saveToSentItems'])
        self.assertIn('October 01, 2026 at 00:00 UTC', payload['message']['body']['content'])

    @patch('invitation_email.urlopen')
    def test_failure_does_not_leak_provider_error_or_retry(self, send):
        send.side_effect = HTTPError('https://example.com/private-token', 403, 'private-secret', {}, None)
        with self.assertLogs('invitation_email', level='WARNING') as logs:
            self.assertEqual(self.deliver()['status'], 'failed')
        self.assertNotIn('private-', ' '.join(logs.output))
        self.assertEqual(send.call_count, 1)

    @patch('invitation_email.urlopen')
    def test_send_timeout_is_unconfirmed_without_retry(self, send):
        send.side_effect = [io.BytesIO(b'{"access_token":"token"}'), TimeoutError()]
        self.assertEqual(self.deliver()['status'], 'unconfirmed')
        self.assertEqual(send.call_count, 2)

    @patch('invitation_email.urlopen')
    def test_token_reused_until_expiry(self, send):
        response = MagicMock()
        response.__enter__.return_value.status = 202
        send.side_effect = [io.BytesIO(b'{"access_token":"token","expires_in":3600}'), response, response,
                            io.BytesIO(b'{"access_token":"renewed","expires_in":3600}'), response]
        with patch('invitation_email.time.monotonic', return_value=100):
            self.assertEqual(self.deliver()['status'], 'accepted')
            self.assertEqual(self.deliver()['status'], 'accepted')
        self.assertEqual(send.call_count, 3)
        with patch('invitation_email.time.monotonic', return_value=3700):
            self.assertEqual(self.deliver()['status'], 'accepted')
        self.assertEqual(send.call_count, 5)

    @patch('invitation_email.urlopen')
    def test_rejection_has_safe_status_and_stage(self, send):
        send.side_effect = [io.BytesIO(b'{"access_token":"token"}'),
                            HTTPError('https://example.com/private-token', 403, 'private-secret', {}, None)]
        result = self.deliver()
        self.assertEqual(result['status'], 'rejected')
        self.assertEqual(result['httpStatus'], 403)
        self.assertEqual(result['stage'], 'submission')
        self.assertNotIn('private-', json.dumps(result))

    @patch('invitation_email.urlopen')
    def test_unexpected_success_is_not_reported_as_accepted(self, send):
        response = MagicMock()
        response.__enter__.return_value.status = 200
        send.side_effect = [io.BytesIO(b'{"access_token":"token"}'), response]
        self.assertEqual(self.deliver()['status'], 'unconfirmed')

    @patch('invitation_email.urlopen')
    def test_401_refreshes_once_and_succeeds(self, send):
        response = MagicMock()
        response.__enter__.return_value.status = 202
        send.side_effect = [io.BytesIO(b'{"access_token":"old","expires_in":3600}'),
                            HTTPError('https://graph.microsoft.com', 401, 'invalid', {}, None),
                            io.BytesIO(b'{"access_token":"new","expires_in":3600}'), response]
        result = self.deliver()
        self.assertEqual(result['status'], 'accepted')
        self.assertEqual(result['submissionAttempts'], 2)
        self.assertEqual(send.call_count, 4)
        self.assertEqual(send.call_args_list[3].args[0].get_header('Authorization'), 'Bearer new')

    @patch('invitation_email.urlopen')
    def test_second_401_is_not_retried(self, send):
        send.side_effect = [io.BytesIO(b'{"access_token":"old"}'),
                            HTTPError('https://graph.microsoft.com', 401, 'invalid', {}, None),
                            io.BytesIO(b'{"access_token":"new"}'),
                            HTTPError('https://graph.microsoft.com', 401, 'invalid', {}, None)]
        result = self.deliver()
        self.assertEqual(result['status'], 'rejected')
        self.assertEqual(result['submissionAttempts'], 2)
        self.assertEqual(send.call_count, 4)

    @patch('invitation_email.urlopen')
    def test_refresh_failure_does_not_resubmit(self, send):
        send.side_effect = [io.BytesIO(b'{"access_token":"old"}'),
                            HTTPError('https://graph.microsoft.com', 401, 'invalid', {}, None), TimeoutError()]
        self.assertEqual(self.deliver()['status'], 'failed')
        self.assertEqual(send.call_count, 3)

    @patch('invitation_email.TOKEN_LOCK_TIMEOUT_SECONDS', 0.01)
    @patch('invitation_email.urlopen')
    def test_wait_for_concurrent_refresh_is_bounded(self, send):
        import threading
        from invitation_email import _token_lock
        result = []
        _token_lock.acquire()
        try:
            worker = threading.Thread(target=lambda: result.append(self.deliver()))
            worker.start()
            worker.join(timeout=4)
            self.assertFalse(worker.is_alive())
        finally:
            _token_lock.release()
        worker.join()
        self.assertEqual(result[0]['status'], 'failed')
        self.assertEqual(result[0]['reason'], 'token_refresh_busy')
        send.assert_not_called()

    @patch('invitation_email._token_lock')
    @patch('invitation_email.urlopen')
    def test_busy_during_401_invalidation_does_not_resubmit(self, send, lock):
        lock.acquire.side_effect = [True, False]
        send.side_effect = [io.BytesIO(b'{"access_token":"old"}'),
                            HTTPError('https://graph.microsoft.com', 401, 'invalid', {}, None)]
        result = self.deliver()
        self.assertEqual(result['reason'], 'token_refresh_busy')
        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['submissionAttempts'], 1)
        self.assertEqual(send.call_count, 2)
        lock.release.assert_called_once()
