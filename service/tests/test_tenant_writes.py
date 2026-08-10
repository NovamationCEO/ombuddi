import os
import sys
import unittest
from unittest.mock import patch

from flask import g, request


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app
from src.ombuddi_views import _require_owned_reference
from src.person_views import SQL_ADD_ENTRY_PERSON, _exec_entry_person
from src.utils import update_one


ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
OTHER_ORGANIZATION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ROW_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
PERSON_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"


class FakeCursor:
    def __init__(self, rows=None):
        self.rows = list(rows or [])
        self.executions = []
        self.rowcount = 1

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        self.executions.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.rows.pop(0) if self.rows else None


class FakeConnection:
    def __init__(self, rows=None):
        self.fake_cursor = FakeCursor(rows)
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_args):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        return False

    def cursor(self):
        return self.fake_cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class TenantWriteTests(unittest.TestCase):
    def test_update_does_not_allow_organization_reassignment(self):
        connection = FakeConnection()
        model = {
            "id": "id",
            "name": "name",
            "ombudsId": "ombuds_id",
            "organizationId": "organization_id",
        }
        with app.test_request_context(
            "/api/v1/example",
            method="PUT",
            json={
                "id": ROW_ID,
                "name": "Updated",
                "ombudsId": PERSON_ID,
                "organizationId": OTHER_ORGANIZATION_ID,
            },
        ):
            with patch("src.utils.get_db_connection", return_value=connection):
                _response, status = update_one(
                    "example",
                    model,
                    request=request,
                    owner_constraint={"organization_id": ORGANIZATION_ID},
                    immutable_columns={"ombuds_id"},
                )

        self.assertEqual(status, 200)
        sql, params = connection.fake_cursor.executions[0]
        self.assertEqual(
            sql,
            "UPDATE example SET name = COALESCE(%s, name) WHERE id = %s AND organization_id = %s",
        )
        self.assertEqual(params, ["Updated", ROW_ID, ORGANIZATION_ID])
        self.assertNotIn(OTHER_ORGANIZATION_ID, params)

    def test_reference_lookup_rejects_another_organization(self):
        connection = FakeConnection(rows=[])
        with app.test_request_context("/api/v1/add_entry"):
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                _response, status = _require_owned_reference("cases", ROW_ID, "caseId")

        self.assertEqual(status, 404)
        _sql, params = connection.fake_cursor.executions[0]
        self.assertEqual(params, (ROW_ID, ORGANIZATION_ID))

    def test_entry_person_mutation_requires_both_rows_in_tenant(self):
        connection = FakeConnection(rows=[])
        with app.test_request_context("/api/v1/add_entry_person", method="POST"):
            g.organization_id = ORGANIZATION_ID
            with patch("src.person_views.get_db_connection", return_value=connection):
                _response, status = _exec_entry_person(SQL_ADD_ENTRY_PERSON, ROW_ID, PERSON_ID)

        self.assertEqual(status, 404)
        self.assertEqual(len(connection.fake_cursor.executions), 1)
        _sql, params = connection.fake_cursor.executions[0]
        self.assertEqual(
            params,
            (PERSON_ID, ROW_ID, ORGANIZATION_ID, ORGANIZATION_ID),
        )


if __name__ == "__main__":
    unittest.main()
