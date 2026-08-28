import os
import sys
import unittest
from unittest.mock import ANY, patch

from flask import g


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app
from src.picklist_views import (
    add_picklist,
    get_picklists_by_organization_id,
    update_picklist,
)


ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PICKLIST_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


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


class UniversalPicklistOptionTests(unittest.TestCase):
    def test_listing_picklists_repairs_missing_universal_options(self):
        connection = FakeConnection(None)
        sentinel_response = object()
        with (
            app.test_request_context(
                f"/api/v1/get_picklists_by_organization_id/{ORGANIZATION_ID}",
            ),
            patch("src.picklist_views.get_db_connection", return_value=connection),
            patch("src.picklist_views.get_many", return_value=sentinel_response) as get_many,
        ):
            g.organization_id = ORGANIZATION_ID
            response = get_picklists_by_organization_id(ORGANIZATION_ID)

        self.assertIs(response, sentinel_response)
        self.assertTrue(connection.committed)
        self.assertTrue(connection.closed)
        sql, params = connection.fake_cursor.executions[0]
        self.assertIn("ON CONFLICT", sql)
        self.assertIn("Other (please specify)", params)
        self.assertIn("Unknown", params)
        self.assertIn("other_detail", params)
        self.assertIn("exclusive", params)
        get_many.assert_called_once_with(
            "picklists",
            ANY,
            {"soft_delete": False},
            owner_constraint={"organization_id": ORGANIZATION_ID},
        )

    def test_client_cannot_create_a_universal_option(self):
        with app.test_request_context(
            "/api/v1/add_picklist",
            method="POST",
            json={
                "kind": "referral_source",
                "name": "Another unknown",
                "behavior": "exclusive",
            },
        ):
            g.organization_id = ORGANIZATION_ID
            response, status = add_picklist()

        self.assertEqual(status, 400)
        self.assertIn("managed by the application", response.get_json()["error"])

    def test_client_cannot_modify_a_universal_option(self):
        connection = FakeConnection(("other_detail",))
        with app.test_request_context(
            "/api/v1/update_picklist",
            method="PUT",
            json={"id": PICKLIST_ID, "name": "Renamed"},
        ), patch("src.picklist_views.get_db_connection", return_value=connection):
            g.organization_id = ORGANIZATION_ID
            response, status = update_picklist()

        self.assertEqual(status, 400)
        self.assertIn("cannot be modified", response.get_json()["error"])
        self.assertEqual(
            connection.fake_cursor.executions[0][1],
            (PICKLIST_ID, ORGANIZATION_ID),
        )
        self.assertTrue(connection.closed)

    def test_client_cannot_promote_an_organization_option_to_universal(self):
        connection = FakeConnection(("standard",))
        with app.test_request_context(
            "/api/v1/update_picklist",
            method="PUT",
            json={"id": PICKLIST_ID, "behavior": "exclusive"},
        ), patch("src.picklist_views.get_db_connection", return_value=connection):
            g.organization_id = ORGANIZATION_ID
            response, status = update_picklist()

        self.assertEqual(status, 400)
        self.assertIn("managed by the application", response.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
