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
from src.ombuddi_views import create_case, get_case_referral_sources, update_case_referral_sources


ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
CASE_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
HR_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
OTHER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
UNKNOWN_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"


class FakeCursor:
    def __init__(self, fetchone_rows=None, fetchall_rows=None):
        self.fetchone_rows = list(fetchone_rows or [])
        self.fetchall_rows = list(fetchall_rows or [])
        self.executions = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        self.executions.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.fetchone_rows.pop(0) if self.fetchone_rows else None

    def fetchall(self):
        return self.fetchall_rows.pop(0) if self.fetchall_rows else []


class FakeConnection:
    def __init__(self, fetchone_rows=None, fetchall_rows=None):
        self.fake_cursor = FakeCursor(fetchone_rows, fetchall_rows)
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


class CaseReferralSourceTests(unittest.TestCase):
    def test_case_and_referral_relationship_are_created_in_one_transaction(self):
        connection = FakeConnection(
            fetchone_rows=[(CASE_ID,)],
            fetchall_rows=[[(OTHER_ID, "other_detail")]],
        )
        with app.test_request_context(
            "/api/v1/create_case",
            method="POST",
            json={
                "id": CASE_ID,
                "name": "Referral test",
                "description": "",
                "status": "active",
                "referralSources": [{"id": OTHER_ID, "detail": "Professional association"}],
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = create_case()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["id"], CASE_ID)
        self.assertTrue(connection.committed)
        self.assertTrue(connection.closed)
        relationship_inserts = [
            execution for execution in connection.fake_cursor.executions
            if "INSERT INTO case_referral_sources" in execution[0]
        ]
        self.assertEqual(len(relationship_inserts), 1)
        self.assertEqual(
            relationship_inserts[0][1],
            (CASE_ID, ORGANIZATION_ID, OTHER_ID, "Professional association"),
        )

    def test_unknown_cannot_be_combined_with_another_source(self):
        connection = FakeConnection(
            fetchall_rows=[[
                (HR_ID, "standard"),
                (UNKNOWN_ID, "exclusive"),
            ]],
        )
        with app.test_request_context(
            "/api/v1/create_case",
            method="POST",
            json={
                "name": "Invalid referral combination",
                "referralSources": [{"id": HR_ID}, {"id": UNKNOWN_ID}],
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = create_case()

        self.assertEqual(status, 400)
        self.assertIn("cannot be combined", response.get_json()["error"])
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)
        self.assertFalse(any(
            "INSERT INTO cases" in sql for sql, _params in connection.fake_cursor.executions
        ))

    def test_invalid_update_rolls_back_instead_of_committing_the_read_transaction(self):
        connection = FakeConnection(
            fetchone_rows=[(1,)],
            fetchall_rows=[[(OTHER_ID, "other_detail")]],
        )
        with app.test_request_context(
            "/api/v1/update_case_referral_sources",
            method="PUT",
            json={
                "caseId": CASE_ID,
                "referralSources": [{"id": OTHER_ID}],
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = update_case_referral_sources()

        self.assertEqual(status, 400)
        self.assertIn("Please specify", response.get_json()["error"])
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)
        self.assertFalse(any(
            "DELETE FROM case_referral_sources" in sql
            for sql, _params in connection.fake_cursor.executions
        ))

    def test_case_referrals_are_retrieved_with_current_labels_and_detail(self):
        connection = FakeConnection(
            fetchone_rows=[(1,)],
            fetchall_rows=[[
                (HR_ID, "HR", "standard", None),
                (OTHER_ID, "Other (please specify)", "other_detail", "Professional association"),
            ]],
        )
        with app.test_request_context(f"/api/v1/get_case_referral_sources/{CASE_ID}"):
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response = get_case_referral_sources(CASE_ID)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [
            {"id": HR_ID, "name": "HR", "behavior": "standard", "detail": None},
            {
                "id": OTHER_ID,
                "name": "Other (please specify)",
                "behavior": "other_detail",
                "detail": "Professional association",
            },
        ])

    def test_updating_referrals_replaces_the_case_relationships(self):
        connection = FakeConnection(
            fetchone_rows=[(1,)],
            fetchall_rows=[[
                (HR_ID, "standard"),
                (OTHER_ID, "other_detail"),
            ]],
        )
        with app.test_request_context(
            "/api/v1/update_case_referral_sources",
            method="PUT",
            json={
                "caseId": CASE_ID,
                "referralSources": [
                    {"id": HR_ID},
                    {"id": OTHER_ID, "detail": "Professional association"},
                ],
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = update_case_referral_sources()

        self.assertEqual(status, 200)
        self.assertTrue(response.get_json()["success"])
        self.assertTrue(connection.committed)
        self.assertTrue(any(
            "DELETE FROM case_referral_sources" in sql
            for sql, _params in connection.fake_cursor.executions
        ))
        relationship_inserts = [
            params for sql, params in connection.fake_cursor.executions
            if "INSERT INTO case_referral_sources" in sql
        ]
        self.assertEqual(relationship_inserts, [
            (CASE_ID, ORGANIZATION_ID, HR_ID, None),
            (CASE_ID, ORGANIZATION_ID, OTHER_ID, "Professional association"),
        ])


if __name__ == "__main__":
    unittest.main()
