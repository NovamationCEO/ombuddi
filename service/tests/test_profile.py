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
from src.ombuddi_views import get_current_ombuds, get_current_organization, update_current_ombuds


OMBUDS_ID = "b73d0105-af49-484f-87a3-217af3feff90"
ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


class FakeCursor:
    def __init__(self, row):
        self.row = row
        self.executions = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        self.executions.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.row


class FakeConnection:
    def __init__(self, row):
        self.fake_cursor = FakeCursor(row)
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


class ProfileTests(unittest.TestCase):
    def test_current_profile_endpoints_return_the_provisioned_defaults(self):
        ombuds_connection = FakeConnection((OMBUDS_ID, "Invited User", "invited@example.com", False, False, ORGANIZATION_ID))
        with app.test_request_context("/api/v1/get_current_ombuds"):
            g.ombuds_id = OMBUDS_ID
            g.organization_id = ORGANIZATION_ID
            with patch("utils.get_db_connection", return_value=ombuds_connection):
                response = get_current_ombuds()

        self.assertEqual(response.get_json()["name"], "Invited User")
        self.assertEqual(response.get_json()["organizationId"], ORGANIZATION_ID)

        organization_connection = FakeConnection((ORGANIZATION_ID, "Example Organization"))
        with app.test_request_context("/api/v1/get_current_organization"):
            g.organization_id = ORGANIZATION_ID
            with patch("utils.get_db_connection", return_value=organization_connection):
                response = get_current_organization()

        self.assertEqual(response.get_json(), {"id": ORGANIZATION_ID, "name": "Example Organization"})

    def test_user_can_update_only_their_own_name(self):
        connection = FakeConnection(("Updated User",))
        with app.test_request_context(
            "/api/v1/update_current_ombuds",
            method="PUT",
            json={
                "name": "  Updated User  ",
                "id": "another-user",
                "organizationId": "another-organization",
                "isAdmin": True,
            },
        ):
            g.ombuds_id = OMBUDS_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = update_current_ombuds()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["name"], "Updated User")
        sql, params = connection.fake_cursor.executions[0]
        self.assertEqual(
            sql,
            "UPDATE ombuds SET name = %s WHERE id = %s AND organization_id = %s RETURNING name",
        )
        self.assertEqual(params, ("Updated User", OMBUDS_ID, ORGANIZATION_ID))
        self.assertTrue(connection.committed)

    def test_blank_name_is_rejected_before_accessing_the_database(self):
        with app.test_request_context(
            "/api/v1/update_current_ombuds",
            method="PUT",
            json={"name": "   "},
        ):
            g.ombuds_id = OMBUDS_ID
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection") as get_connection:
                response, status = update_current_ombuds()

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json()["message"], "Name is required")
        get_connection.assert_not_called()


if __name__ == "__main__":
    unittest.main()
