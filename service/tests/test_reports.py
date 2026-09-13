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
OMBUDS_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


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

    def test_invalid_scope_returns_400_without_opening_database(self):
        with app.test_request_context(
            "/api/v1/reports?scope=team&start=2026-01-02&end=2026-03-04",
        ):
            g.organization_id = ORGANIZATION_ID
            g.ombuds_id = OMBUDS_ID
            with patch("src.report_views.get_db_connection") as get_connection:
                response, status = get_reports()

        self.assertEqual(status, 400)
        self.assertIn("scope", response.get_json()["message"])
        get_connection.assert_not_called()

    def test_timestamp_reports_include_the_entire_end_date_in_utc(self):
        connection = EmptyReportConnection()
        with app.test_request_context(
            "/api/v1/reports?scope=organization&start=2026-01-02&end=2026-03-04",
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

    def test_general_containers_are_excluded_only_from_case_and_code_reports(self):
        connection = EmptyReportConnection()
        with app.test_request_context(
            "/api/v1/reports?scope=organization&start=2026-01-02&end=2026-03-04",
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.report_views.get_db_connection", return_value=connection):
                response = get_reports()

        self.assertEqual(response.status_code, 200)
        case_queries = [
            sql
            for sql, _params in connection.fake_cursor.executions
            if "FROM cases" in sql
        ]
        self.assertEqual(len(case_queries), 5)
        self.assertTrue(all("case_kind = 'standard'" in sql for sql in case_queries))

        entry_only_queries = [
            sql
            for sql, _params in connection.fake_cursor.executions
            if "FROM entries" in sql and "JOIN cases" not in sql
        ]
        self.assertGreater(len(entry_only_queries), 0)
        self.assertTrue(all("case_kind" not in sql for sql in entry_only_queries))

    def test_my_scope_filters_every_aggregation_to_the_current_ombuds(self):
        connection = EmptyReportConnection()
        with app.test_request_context(
            "/api/v1/reports?scope=my&start=2026-01-02&end=2026-03-04",
        ):
            g.organization_id = ORGANIZATION_ID
            g.ombuds_id = OMBUDS_ID
            with patch("src.report_views.get_db_connection", return_value=connection):
                response = get_reports()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["scope"], "my")
        self.assertTrue(connection.fake_cursor.executions)
        for sql, params in connection.fake_cursor.executions:
            self.assertEqual(params[-1], OMBUDS_ID)
            self.assertTrue(
                "ombuds_id = %s" in sql or "created_by_ombuds_id = %s" in sql,
                sql,
            )

    def test_organization_scope_does_not_add_an_ombuds_filter(self):
        connection = EmptyReportConnection()
        with app.test_request_context(
            "/api/v1/reports?scope=organization&start=2026-01-02&end=2026-03-04",
        ):
            g.organization_id = ORGANIZATION_ID
            g.ombuds_id = OMBUDS_ID
            with patch("src.report_views.get_db_connection", return_value=connection):
                response = get_reports()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["scope"], "organization")
        self.assertTrue(all(OMBUDS_ID not in params for _sql, params in connection.fake_cursor.executions))


if __name__ == "__main__":
    unittest.main()
