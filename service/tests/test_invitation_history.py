import os
import sys
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from flask import g
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from app import app
from src.admin_views import list_invitation_email_history
from invitation_history import email_history


class InvitationHistoryTests(unittest.TestCase):
    def test_other_organization_seat_returns_404_without_reading_events(self):
        conn = MagicMock()
        cur = conn.cursor.return_value.__enter__.return_value
        cur.fetchone.return_value = None
        with app.test_request_context('/'):
            response, status = email_history(conn, 'my-org', 'other-seat')
        self.assertEqual(status, 404)
        self.assertEqual(cur.execute.call_count, 1)
        self.assertEqual(cur.execute.call_args.args[1], ('other-seat', 'my-org'))

    def test_route_uses_authenticated_org_and_returns_only_safe_fields(self):
        conn = MagicMock()
        cur = conn.cursor.return_value.__enter__.return_value
        cur.fetchone.return_value = ('seat',)
        cur.fetchall.return_value = [('event', datetime.now(timezone.utc), {
            'invitationId': 'invite', 'status': 'accepted', 'sender': 'admin@ombuddi.com',
            'message': 'old UI copy', 'token': 'secret', 'previousHttpStatus': 401,
        })]
        with app.test_request_context('/?organizationId=other-org'):
            g.organization_id = 'my-org'
            with patch('src.admin_views.get_db_connection', return_value=conn):
                response = list_invitation_email_history('seat')
        self.assertEqual(cur.execute.call_args.args[1], ('my-org', 'seat'))
        self.assertIn("event_type = 'ombuds_invitation_email'", cur.execute.call_args.args[0])
        self.assertEqual(response.get_json()[0]['delivery']['status'], 'accepted')
        self.assertEqual(response.get_json()[0]['delivery']['previousHttpStatus'], 401)
        self.assertNotIn('secret', response.get_data(as_text=True))
        self.assertNotIn('message', response.get_json()[0]['delivery'])
        conn.close.assert_called_once()
