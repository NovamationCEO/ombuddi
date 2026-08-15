import os
import sys
import unittest
from unittest.mock import patch
from uuid import UUID

from flask import g


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app
from src.system_admin_views import (
    cancel_org_invitation,
    create_org_ombuds,
    require_system_admin,
    update_org_ombuds_role,
)


ACTOR_ID = "b73d0105-af49-484f-87a3-217af3feff90"
ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
OMBUDS_ID = UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
INVITATION_ID = UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")


class SeatCursor:
    def __init__(self, mode):
        self.mode = mode
        self.executions = []
        self.current_row = None
        self.rowcount = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        normalized = " ".join(sql.split())
        self.executions.append((normalized, params))
        self.current_row = None
        self.rowcount = 0

        if normalized.startswith("SELECT seat_limit, is_active"):
            self.current_row = (25, True)
        elif normalized.startswith("SELECT COUNT"):
            self.current_row = (1,)
        elif normalized.startswith("INSERT INTO ombuds ("):
            self.current_row = (OMBUDS_ID,)
        elif normalized.startswith("INSERT INTO ombuds_invitations"):
            self.current_row = (INVITATION_ID,)
        elif normalized.startswith("SELECT id FROM organizations"):
            self.current_row = (ORGANIZATION_ID,)
        elif normalized.startswith("SELECT is_admin, is_system_admin, is_active"):
            if self.mode == "last_admin":
                self.current_row = (True, False, True)
            else:
                self.current_row = (False, False, True)
        elif normalized.startswith("SELECT id FROM ombuds"):
            self.current_row = (OMBUDS_ID,)
        elif normalized.startswith("UPDATE ombuds_invitations"):
            self.rowcount = 1

    def fetchone(self):
        return self.current_row


class SeatConnection:
    def __init__(self, mode):
        self.fake_cursor = SeatCursor(mode)
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self.fake_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


class SystemAdminSeatTests(unittest.TestCase):
    def test_system_admin_guard(self):
        with app.test_request_context("/api/v1/system/organizations"):
            g.is_system_admin = False
            self.assertEqual(require_system_admin()[1], 403)
            g.is_system_admin = True
            self.assertIsNone(require_system_admin())

    def test_system_admin_can_create_and_invite_admin_in_existing_org(self):
        connection = SeatConnection("create")
        with app.test_request_context(
            f"/api/v1/system/organizations/{ORGANIZATION_ID}/ombuds",
            method="POST",
            json={
                "name": "Replacement Admin",
                "email": "replacement@example.com",
                "isAdmin": True,
                "createInvitation": True,
            },
        ):
            g.ombuds_id = ACTOR_ID
            with (
                patch("src.system_admin_views.get_db_connection", return_value=connection),
                patch("src.system_admin_views.secrets.token_urlsafe", return_value="replacement-token"),
            ):
                response, status = create_org_ombuds(ORGANIZATION_ID)

        self.assertEqual(status, 201)
        self.assertEqual(response.get_json()["ombudsId"], str(OMBUDS_ID))
        self.assertIn("replacement-token", response.get_json()["inviteUrl"])
        self.assertTrue(connection.committed)
        audit_events = [
            params[3]
            for sql, params in connection.fake_cursor.executions
            if sql.startswith("INSERT INTO administrative_events")
        ]
        self.assertEqual(audit_events, ["ombuds_created", "ombuds_invitation_created"])

    def test_system_admin_can_promote_existing_user(self):
        connection = SeatConnection("promote")
        with app.test_request_context(
            f"/api/v1/system/organizations/{ORGANIZATION_ID}/ombuds/{OMBUDS_ID}/role",
            method="PUT",
            json={"isAdmin": True},
        ):
            g.ombuds_id = ACTOR_ID
            with patch("src.system_admin_views.get_db_connection", return_value=connection):
                response = update_org_ombuds_role(ORGANIZATION_ID, str(OMBUDS_ID))

        self.assertTrue(response.get_json()["success"])
        self.assertTrue(any(
            sql.startswith("UPDATE ombuds SET is_admin")
            for sql, _params in connection.fake_cursor.executions
        ))
        self.assertTrue(connection.committed)

    def test_system_admin_cannot_demote_last_active_admin(self):
        connection = SeatConnection("last_admin")
        with app.test_request_context(
            f"/api/v1/system/organizations/{ORGANIZATION_ID}/ombuds/{OMBUDS_ID}/role",
            method="PUT",
            json={"isAdmin": False},
        ):
            g.ombuds_id = ACTOR_ID
            with patch("src.system_admin_views.get_db_connection", return_value=connection):
                response, status = update_org_ombuds_role(ORGANIZATION_ID, str(OMBUDS_ID))

        self.assertEqual(status, 409)
        self.assertIn("at least one active administrator", response.get_json()["message"])
        self.assertTrue(connection.rolled_back)

    def test_system_admin_can_cancel_active_invitation(self):
        connection = SeatConnection("cancel")
        with app.test_request_context(
            f"/api/v1/system/organizations/{ORGANIZATION_ID}/ombuds/{OMBUDS_ID}/invitation/cancel",
            method="POST",
            json={},
        ):
            g.ombuds_id = ACTOR_ID
            with patch("src.system_admin_views.get_db_connection", return_value=connection):
                response = cancel_org_invitation(ORGANIZATION_ID, str(OMBUDS_ID))

        self.assertTrue(response.get_json()["success"])
        self.assertEqual(response.get_json()["cancelledCount"], 1)
        self.assertTrue(connection.committed)


if __name__ == "__main__":
    unittest.main()
