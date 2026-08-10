import hashlib
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
from src.admin_views import create_invitation, require_admin
from src.auth_views import claim_invitation


OMBUDS_ID = UUID("b73d0105-af49-484f-87a3-217af3feff90")
ORGANIZATION_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
INVITATION_ID = UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")


class InvitationCursor:
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
        self.rowcount = 0

        if self.mode == "create" and normalized.startswith("SELECT id, auth0_sub"):
            self.current_row = (OMBUDS_ID, None)
        elif self.mode == "create" and normalized.startswith("INSERT INTO ombuds_invitations"):
            self.current_row = (INVITATION_ID,)
        elif self.mode == "claim" and normalized.startswith("SELECT i.id"):
            self.current_row = (INVITATION_ID, OMBUDS_ID, ORGANIZATION_ID, None)
        elif self.mode == "claim" and normalized.startswith("UPDATE ombuds SET auth0_sub"):
            self.current_row = None
            self.rowcount = 1
        else:
            self.current_row = None

    def fetchone(self):
        return self.current_row


class InvitationConnection:
    def __init__(self, mode):
        self.fake_cursor = InvitationCursor(mode)
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self.fake_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class AdminInvitationTests(unittest.TestCase):
    def test_admin_guard(self):
        with app.test_request_context("/api/v1/admin/ombuds"):
            g.is_admin = False
            self.assertEqual(require_admin()[1], 403)
            g.is_admin = True
            self.assertIsNone(require_admin())

    def test_invitation_returns_raw_token_but_stores_only_hash(self):
        connection = InvitationConnection("create")
        with app.test_request_context(
            f"/api/v1/admin/ombuds/{OMBUDS_ID}/invitation",
            method="POST",
            json={},
        ):
            g.organization_id = str(ORGANIZATION_ID)
            g.ombuds_id = str(OMBUDS_ID)
            with (
                patch("src.admin_views.get_db_connection", return_value=connection),
                patch("src.admin_views.secrets.token_urlsafe", return_value="raw-secret-token"),
                patch.dict(os.environ, {"FRONTEND_URL": "https://ombuddi.example"}),
            ):
                response, status = create_invitation(str(OMBUDS_ID))

        self.assertEqual(status, 201)
        self.assertEqual(
            response.get_json()["inviteUrl"],
            "https://ombuddi.example/accept-invite?token=raw-secret-token",
        )
        insert = next(
            execution for execution in connection.fake_cursor.executions
            if execution[0].startswith("INSERT INTO ombuds_invitations")
        )
        self.assertIn(hashlib.sha256(b"raw-secret-token").hexdigest(), insert[1])
        self.assertNotIn("raw-secret-token", insert[1])
        self.assertTrue(connection.committed)

    def test_claim_links_auth0_sub_to_local_seat(self):
        connection = InvitationConnection("claim")
        with app.test_request_context(
            "/api/v1/auth/claim-invitation",
            method="POST",
            json={"token": "raw-secret-token"},
        ):
            g.auth0_sub = "auth0|invited-user"
            with patch("src.auth_views.get_db_connection", return_value=connection):
                response = claim_invitation()

        self.assertEqual(response.get_json()["ombudsId"], str(OMBUDS_ID))
        link_update = next(
            execution for execution in connection.fake_cursor.executions
            if execution[0].startswith("UPDATE ombuds SET auth0_sub")
        )
        self.assertEqual(link_update[1], ("auth0|invited-user", OMBUDS_ID))
        self.assertTrue(connection.committed)


if __name__ == "__main__":
    unittest.main()
