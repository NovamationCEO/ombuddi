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
from src.ombuddi_views import add_entry, update_entry


ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
OMBUDS_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
OTHER_OMBUDS_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
CASE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
ENTRY_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
PERSON_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff"


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


class FailingJoinConnection(FakeConnection):
    def cursor(self):
        connection = self
        cursor = self.fake_cursor
        original_execute = cursor.execute

        def execute(sql, params):
            original_execute(sql, params)
            if "INSERT INTO entry_person" in sql:
                raise RuntimeError("join insert failed")

        cursor.execute = execute
        return cursor


class EntryIdentityTests(unittest.TestCase):
    def _principal(self):
        g.ombuds_id = OMBUDS_ID
        g.organization_id = ORGANIZATION_ID

    def test_entry_and_people_are_created_atomically_with_principal_ids(self):
        connection = FakeConnection(
            fetchone_rows=[("standard", None), (ENTRY_ID,)],
            fetchall_rows=[[(PERSON_ID,)]],
        )
        with app.test_request_context(
            "/api/v1/add_entry",
            method="POST",
            json={
                "caseId": CASE_ID,
                "ombudsId": "auth0|must-not-be-used",
                "organizationId": "11111111-1111-1111-1111-111111111111",
                "date": "2026-08-03",
                "medium": "Phone",
                "duration": 30,
                "notes": "protected",
                "personIds": [PERSON_ID, PERSON_ID],
            },
        ):
            self._principal()
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = add_entry()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["id"], ENTRY_ID)
        entry_insert = next(
            execution
            for execution in connection.fake_cursor.executions
            if "INSERT INTO entries" in execution[0]
        )
        self.assertEqual(
            entry_insert[1],
            (CASE_ID, OMBUDS_ID, ORGANIZATION_ID, "2026-08-03", "Phone", 30, "protected"),
        )
        person_inserts = [
            execution
            for execution in connection.fake_cursor.executions
            if "INSERT INTO entry_person" in execution[0]
        ]
        self.assertEqual(len(person_inserts), 1)
        self.assertEqual(person_inserts[0][1], (ENTRY_ID, PERSON_ID))
        self.assertTrue(connection.committed)

    def test_another_ombuds_cannot_add_to_a_general_container(self):
        connection = FakeConnection(fetchone_rows=[("general", OTHER_OMBUDS_ID)])
        with app.test_request_context(
            "/api/v1/add_entry",
            method="POST",
            json={"caseId": CASE_ID, "date": "2026-08-03"},
        ):
            self._principal()
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = add_entry()

        self.assertEqual(status, 404)
        self.assertEqual(response.get_json()["error"], "Not found")
        self.assertFalse(any(
            "INSERT INTO entries" in sql
            for sql, _params in connection.fake_cursor.executions
        ))

    def test_entry_creation_rolls_back_if_a_person_link_fails(self):
        connection = FailingJoinConnection(
            fetchone_rows=[("standard", None), (ENTRY_ID,)],
            fetchall_rows=[[(PERSON_ID,)]],
        )
        with app.test_request_context(
            "/api/v1/add_entry",
            method="POST",
            json={"caseId": CASE_ID, "date": "2026-08-03", "personIds": [PERSON_ID]},
        ):
            self._principal()
            with patch("src.ombuddi_views.get_db_connection", return_value=connection):
                response, status = add_entry()

        self.assertEqual(status, 500)
        self.assertEqual(response.get_json()["error"], "Database error")
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)

    def test_entry_updates_are_scoped_to_the_author(self):
        with app.test_request_context(
            "/api/v1/update_entry",
            method="PUT",
            json={"id": ENTRY_ID, "caseId": CASE_ID, "date": "2026-08-04"},
        ):
            self._principal()
            with (
                patch("src.ombuddi_views._require_writable_case_reference", return_value=None),
                patch("src.ombuddi_views.update_one", return_value="ok") as update_one,
            ):
                self.assertEqual(update_entry(), "ok")

        self.assertEqual(
            update_one.call_args.kwargs["owner_constraint"],
            {"organization_id": ORGANIZATION_ID, "ombuds_id": OMBUDS_ID},
        )


if __name__ == "__main__":
    unittest.main()
