import os
import sys
import unittest
from datetime import date
from unittest.mock import patch

from flask import g


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app
from src.report_views import _report_date_range, get_reports


ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


class EmptyReportCursor:
    def __init__(self):
        self.executions = []
        self.closed = False

    def execute(self, sql, params):
        self.executions.append((" ".join(sql.split()), params))

    def fetchall(self):
        return []

    def close(self):
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()


class EmptyReportConnection:
    def __init__(self):
        self.fake_cursor = EmptyReportCursor()
        self.closed = False
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self.fake_cursor

    def close(self):
        self.closed = True

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class ReportTests(unittest.TestCase):
    def test_date_range_uses_iso_dates_and_rejects_reverse_ranges(self):
        start, end = _report_date_range(
            {"start": "2026-01-02", "end": "2026-03-04"},
        )
        self.assertEqual(start, date(2026, 1, 2))
        self.assertEqual(end, date(2026, 3, 4))

        with self.assertRaisesRegex(ValueError, "start must be on or before end"):
            _report_date_range({"start": "2026-03-05", "end": "2026-03-04"})

    def test_invalid_date_returns_400_without_opening_database(self):
        with app.test_request_context(
            "/api/v1/reports?start=not-a-date&end=2026-03-04",
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.report_views.get_db_connection") as get_connection:
                response, status = get_reports()

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json()["error"], "Input error")
        get_connection.assert_not_called()

    def test_timestamp_reports_include_the_entire_end_date_in_utc(self):
        connection = EmptyReportConnection()
        with app.test_request_context(
            "/api/v1/reports?start=2026-01-02&end=2026-03-04",
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.report_views.get_db_connection", return_value=connection):
                response = get_reports()

        self.assertEqual(response.status_code, 200)
        timestamp_queries = [
            execution for execution in connection.fake_cursor.executions
            if "created_at >=" in execution[0]
        ]
        self.assertEqual(len(timestamp_queries), 2)
        for sql, params in timestamp_queries:
            self.assertIn("created_at < ((%s::date + 1)::timestamp AT TIME ZONE 'UTC')", sql)
            self.assertEqual(params[1:], (date(2026, 1, 2), date(2026, 3, 4)))
        self.assertTrue(connection.fake_cursor.closed)
        self.assertTrue(connection.closed)


if __name__ == "__main__":
    unittest.main()
