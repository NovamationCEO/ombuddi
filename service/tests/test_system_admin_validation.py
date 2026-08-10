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
from src.system_admin_views import create_organization, update_organization


ACTOR_ID = "b73d0105-af49-484f-87a3-217af3feff90"
ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


class OrganizationCursor:
    def __init__(self):
        self.executions = []
        self.current_row = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        normalized = " ".join(sql.split())
        self.executions.append((normalized, params))
        if normalized.startswith("SELECT id FROM organizations"):
            self.current_row = (ORGANIZATION_ID,)
        elif normalized.startswith("SELECT COUNT"):
            self.current_row = (3,)
        else:
            self.current_row = None

    def fetchone(self):
        return self.current_row


class OrganizationConnection:
    def __init__(self):
        self.fake_cursor = OrganizationCursor()
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


class SystemAdminValidationTests(unittest.TestCase):
    def test_create_organization_requires_positive_numeric_seat_limit(self):
        base_payload = {
            "name": "Example Organization",
            "adminName": "First Admin",
            "adminEmail": "admin@example.com",
        }
        for invalid_limit in (0, -1, "not-a-number"):
            with self.subTest(seat_limit=invalid_limit):
                with app.test_request_context(
                    "/api/v1/system/organizations",
                    method="POST",
                    json={**base_payload, "seatLimit": invalid_limit},
                ):
                    g.ombuds_id = ACTOR_ID
                    with patch("src.system_admin_views.get_db_connection") as get_connection:
                        response, status = create_organization()

                self.assertEqual(status, 400)
                self.assertEqual(response.get_json()["error"], "Input error")
                get_connection.assert_not_called()

    def test_update_organization_requires_positive_numeric_seat_limit(self):
        for invalid_limit in (0, -1, "not-a-number"):
            with self.subTest(seat_limit=invalid_limit):
                with app.test_request_context(
                    f"/api/v1/system/organizations/{ORGANIZATION_ID}",
                    method="PUT",
                    json={"seatLimit": invalid_limit},
                ):
                    with patch("src.system_admin_views.get_db_connection") as get_connection:
                        response, status = update_organization(ORGANIZATION_ID)

                self.assertEqual(status, 400)
                self.assertEqual(response.get_json()["error"], "Input error")
                get_connection.assert_not_called()

    def test_seat_limit_cannot_drop_below_active_seat_count(self):
        connection = OrganizationConnection()
        with app.test_request_context(
            f"/api/v1/system/organizations/{ORGANIZATION_ID}",
            method="PUT",
            json={"seatLimit": 2},
        ):
            with patch(
                "src.system_admin_views.get_db_connection",
                return_value=connection,
            ):
                response, status = update_organization(ORGANIZATION_ID)

        self.assertEqual(status, 409)
        self.assertIn("3 active seats", response.get_json()["message"])
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)
        self.assertFalse(any(
            sql.startswith("UPDATE organizations")
            for sql, _params in connection.fake_cursor.executions
        ))


if __name__ == "__main__":
    unittest.main()
