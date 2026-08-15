import os
import sys
import unittest
from unittest.mock import patch

from flask import g


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app
from src.admin_views import update_ombuds_status
from src.system_admin_views import update_organization_status


ACTOR_ID = "b73d0105-af49-484f-87a3-217af3feff90"
TARGET_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
OTHER_ORGANIZATION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


class StatusCursor:
    def __init__(self, mode):
        self.mode = mode
        self.executions = []
        self.current_row = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        normalized = " ".join(sql.split())
        self.executions.append((normalized, params))
        self.current_row = None

        if normalized.startswith("SELECT seat_limit"):
            self.current_row = (2,)
        elif normalized.startswith("SELECT is_admin"):
            if self.mode == "last_admin":
                self.current_row = (True, False, True)
            elif self.mode == "reactivate_full":
                self.current_row = (False, False, False)
            else:
                self.current_row = (False, False, True)
        elif normalized.startswith("SELECT COUNT"):
            self.current_row = (2 if self.mode == "reactivate_full" else 1,)
        elif normalized.startswith("SELECT is_active FROM organizations"):
            self.current_row = (True,)

    def fetchone(self):
        return self.current_row


class StatusConnection:
    def __init__(self, mode):
        self.fake_cursor = StatusCursor(mode)
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


class DeactivationTests(unittest.TestCase):
    def test_status_requires_a_boolean_and_limits_audit_reason(self):
        for payload in (
            {},
            {"active": "false"},
            {"active": False, "reason": "x" * 1001},
        ):
            with self.subTest(payload=payload):
                with app.test_request_context(
                    f"/api/v1/admin/ombuds/{TARGET_ID}/status",
                    method="PUT",
                    json=payload,
                ):
                    g.ombuds_id = ACTOR_ID
                    g.organization_id = ORGANIZATION_ID
                    with patch("src.admin_views.get_db_connection") as get_connection:
                        response, status = update_ombuds_status(TARGET_ID)

                self.assertEqual(status, 400)
                self.assertEqual(response.get_json()["error"], "Input error")
                get_connection.assert_not_called()

    def test_org_admin_cannot_deactivate_self(self):
        connection = StatusConnection("deactivate")
        with app.test_request_context(
            f"/api/v1/admin/ombuds/{ACTOR_ID}/status",
            method="PUT",
            json={"active": False},
        ):
            g.ombuds_id = ACTOR_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.admin_views.get_db_connection", return_value=connection):
                response, status = update_ombuds_status(ACTOR_ID)

        self.assertEqual(status, 409)
        self.assertIn("own account", response.get_json()["message"])
        self.assertTrue(connection.rolled_back)

    def test_org_admin_deactivation_revokes_invites_and_records_event(self):
        connection = StatusConnection("deactivate")
        with app.test_request_context(
            f"/api/v1/admin/ombuds/{TARGET_ID}/status",
            method="PUT",
            json={"active": False, "reason": "Left the organization"},
        ):
            g.ombuds_id = ACTOR_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.admin_views.get_db_connection", return_value=connection):
                response = update_ombuds_status(TARGET_ID)

        self.assertTrue(response.get_json()["success"])
        statements = [execution[0] for execution in connection.fake_cursor.executions]
        self.assertTrue(any(statement.startswith("UPDATE ombuds SET is_active") for statement in statements))
        self.assertTrue(any(statement.startswith("UPDATE ombuds_invitations") for statement in statements))
        audit = next(
            execution for execution in connection.fake_cursor.executions
            if execution[0].startswith("INSERT INTO administrative_events")
        )
        self.assertIn("ombuds_deactivated", audit[1])
        self.assertIn("Left the organization", audit[1])
        self.assertTrue(connection.committed)

    def test_cannot_deactivate_last_active_organization_admin(self):
        connection = StatusConnection("last_admin")
        with app.test_request_context(
            f"/api/v1/admin/ombuds/{TARGET_ID}/status",
            method="PUT",
            json={"active": False},
        ):
            g.ombuds_id = ACTOR_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.admin_views.get_db_connection", return_value=connection):
                response, status = update_ombuds_status(TARGET_ID)

        self.assertEqual(status, 409)
        self.assertIn("at least one active administrator", response.get_json()["message"])
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)

    def test_reactivation_cannot_exceed_seat_limit(self):
        connection = StatusConnection("reactivate_full")
        with app.test_request_context(
            f"/api/v1/admin/ombuds/{TARGET_ID}/status",
            method="PUT",
            json={"active": True},
        ):
            g.ombuds_id = ACTOR_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.admin_views.get_db_connection", return_value=connection):
                response, status = update_ombuds_status(TARGET_ID)

        self.assertEqual(status, 409)
        self.assertEqual(response.get_json()["error"], "Seat limit reached")
        self.assertTrue(connection.rolled_back)

    def test_system_admin_cannot_deactivate_own_organization(self):
        with app.test_request_context(
            f"/api/v1/system/organizations/{ORGANIZATION_ID}/status",
            method="PUT",
            json={"active": False},
        ):
            g.ombuds_id = ACTOR_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.system_admin_views.get_db_connection") as get_connection:
                response, status = update_organization_status(ORGANIZATION_ID)

        self.assertEqual(status, 409)
        get_connection.assert_not_called()

    def test_organization_deactivation_revokes_invites_and_records_event(self):
        connection = StatusConnection("deactivate_org")
        with app.test_request_context(
            f"/api/v1/system/organizations/{OTHER_ORGANIZATION_ID}/status",
            method="PUT",
            json={"active": False, "reason": "Subscription ended"},
        ):
            g.ombuds_id = ACTOR_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.system_admin_views.get_db_connection", return_value=connection):
                response = update_organization_status(OTHER_ORGANIZATION_ID)

        self.assertTrue(response.get_json()["success"])
        audit = next(
            execution for execution in connection.fake_cursor.executions
            if execution[0].startswith("INSERT INTO administrative_events")
        )
        self.assertIn("organization_deactivated", audit[1])
        self.assertTrue(connection.committed)


if __name__ == "__main__":
    unittest.main()
