import json
import os
import sys
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from invitation_delivery import deliver_invitation


class DeliveryAuditTests(unittest.TestCase):
    def deliver(self, conn):
        return deliver_invitation('recipient@example.com', 'https://example.com/?token=secret',
                                  datetime.now(timezone.utc), conn=conn,
                                  invitation_id='invitation-id', organization_id='org-id',
                                  actor_ombuds_id='actor-id', target_ombuds_id='seat-id')

    @patch('invitation_delivery.send_email')
    def test_attempt_is_committed_before_send_and_outcome_is_persisted(self, send):
        conn = MagicMock()
        def sending(*args):
            self.assertEqual(conn.commit.call_count, 1)
            return {'sender': 'admin@ombuddi.com', 'status': 'accepted', 'message': 'Do not persist', 'unknownField': 'secret', 'invitationId': 'spoofed-id'}
        send.side_effect = sending
        result = self.deliver(conn)
        self.assertEqual(result['status'], 'accepted')
        self.assertEqual(conn.commit.call_count, 2)
        calls = conn.cursor.return_value.__enter__.return_value.execute.call_args_list
        details = [json.loads(call.args[1][-1]) for call in calls]
        self.assertEqual([d['status'] for d in details], ['started', 'accepted'])
        self.assertEqual(details[1]['invitationId'], 'invitation-id')
        self.assertNotIn('secret', json.dumps(details))
        self.assertNotIn('message', details[1])

    @patch('invitation_delivery.send_email')
    def test_failed_attempt_audit_prevents_send(self, send):
        conn = MagicMock()
        conn.commit.side_effect = RuntimeError('unavailable')
        self.assertEqual(self.deliver(conn)['status'], 'failed')
        send.assert_not_called()
        conn.rollback.assert_called_once()

    @patch('invitation_delivery.send_email', return_value={'status': 'accepted'})
    def test_failed_outcome_audit_does_not_misreport_send(self, send):
        conn = MagicMock()
        conn.commit.side_effect = [None, RuntimeError('unavailable')]
        result = self.deliver(conn)
        self.assertEqual(result['status'], 'accepted')
        self.assertIn('auditWarning', result)
        send.assert_called_once()
