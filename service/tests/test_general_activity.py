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
from src.ombuddi_views import ensure_general_activity_case, get_general_activity_case


ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
OMBUDS_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
CASE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"


class FakeCursor:
    def __init__(self, fetchone_rows):
        self.fetchone_rows = list(fetchone_rows)
        self.executions = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        self.executions.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.fetchone_rows.pop(0) if self.fetchone_rows else None


class FakeConnection:
    def __init__(self, fetchone_rows):
        self.fake_cursor = FakeCursor(fetchone_rows)
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


class GeneralActivityTests(unittest.TestCase):
    def _request_context(self, path, method="GET"):
        context = app.test_request_context(path, method=method, json={} if method == "POST" else None)
        context.push()
        self.addCleanup(context.pop)
        g.organization_id = ORGANIZATION_ID
        g.ombuds_id = OMBUDS_ID

    def test_missing_general_activity_case_returns_null(self):
        connection = FakeConnection([None])
        self._request_context("/api/v1/get_general_activity_case")

        with patch("src.ombuddi_views.get_db_connection", return_value=connection):
            response = get_general_activity_case()

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.get_json())
        sql, params = connection.fake_cursor.executions[0]
        self.assertIn("case_kind = 'general'", sql)
        self.assertEqual(params, (ORGANIZATION_ID, OMBUDS_ID))

    def test_create_general_activity_case_is_owned_by_current_ombuds(self):
        connection = FakeConnection([(CASE_ID,)])
        self._request_context("/api/v1/general_activity_case", method="POST")

        with patch("src.ombuddi_views.get_db_connection", return_value=connection):
            response, status = ensure_general_activity_case()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["id"], CASE_ID)
        self.assertEqual(len(connection.fake_cursor.executions), 1)
        sql, params = connection.fake_cursor.executions[0]
        self.assertIn("'general'", sql)
        self.assertIn("'{}'", sql)
        self.assertEqual(params, (ORGANIZATION_ID, OMBUDS_ID, OMBUDS_ID))
        self.assertTrue(connection.committed)
        self.assertTrue(connection.closed)

    def test_existing_general_activity_case_is_reused(self):
        connection = FakeConnection([None, (CASE_ID,)])
        self._request_context("/api/v1/general_activity_case", method="POST")

        with patch("src.ombuddi_views.get_db_connection", return_value=connection):
            response, status = ensure_general_activity_case()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["id"], CASE_ID)
        self.assertEqual(len(connection.fake_cursor.executions), 2)
        _, params = connection.fake_cursor.executions[1]
        self.assertEqual(params, (ORGANIZATION_ID, OMBUDS_ID))


if __name__ == "__main__":
    unittest.main()
