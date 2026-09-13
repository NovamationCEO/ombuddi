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
from src.person_views import (
    add_person,
    change_person_name_phrase,
    get_persons_by_entry_id,
    person_model,
    update_person,
)


ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PERSON_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
MONSTER_SEED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
CLIENT_CHOSEN_SEED = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"


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

    def fetchall(self):
        rows = self.rows
        self.rows = []
        return rows


class FakeConnection:
    def __init__(self, rows=None):
        self.fake_cursor = FakeCursor(rows)

    def cursor(self):
        return self.fake_cursor

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


class PersonMonsterTests(unittest.TestCase):
    def test_person_reads_include_the_stable_portrait_fields(self):
        self.assertEqual(person_model["monsterSeed"], "monster_seed")
        self.assertEqual(person_model["monsterVersion"], "monster_version")

    def test_add_person_returns_database_generated_portrait_fields(self):
        connection = FakeConnection(rows=[(PERSON_ID, MONSTER_SEED, 1)])
        with app.test_request_context(
            "/api/v1/add_person",
            method="POST",
            json={
                "hashedName": "client-hash",
                "isPublic": False,
                "monsterSeed": CLIENT_CHOSEN_SEED,
                "monsterVersion": 99,
                "organizationId": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("utils.get_db_connection", return_value=connection):
                response, status = add_person()

        self.assertEqual(status, 200)
        self.assertEqual(
            response.get_json(),
            {
                "success": True,
                "status": "success",
                "id": PERSON_ID,
                "monsterSeed": MONSTER_SEED,
                "monsterVersion": 1,
            },
        )
        sql, params = connection.fake_cursor.executions[0]
        insert_columns = sql.split("VALUES", maxsplit=1)[0]
        self.assertNotIn("monster_seed", insert_columns)
        self.assertNotIn("monster_version", insert_columns)
        self.assertNotIn(CLIENT_CHOSEN_SEED, params)
        self.assertIn("RETURNING id, monster_seed, monster_version", sql)
        self.assertEqual(params[-1], ORGANIZATION_ID)

    def test_update_person_cannot_change_an_existing_portrait(self):
        connection = FakeConnection()
        with app.test_request_context(
            "/api/v1/update_person",
            method="PUT",
            json={
                "id": PERSON_ID,
                "publicName": "Updated public name",
                "hashedName": "replacement-must-be-ignored",
                "monsterSeed": CLIENT_CHOSEN_SEED,
                "monsterVersion": 99,
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("utils.get_db_connection", return_value=connection):
                _response, status = update_person()

        self.assertEqual(status, 200)
        sql, params = connection.fake_cursor.executions[0]
        self.assertNotIn("monster_seed", sql)
        self.assertNotIn("monster_version", sql)
        self.assertNotIn("hashed_name", sql)
        self.assertNotIn(CLIENT_CHOSEN_SEED, params)
        self.assertEqual(params, ["Updated public name", PERSON_ID, ORGANIZATION_ID])

    def test_change_phrase_conditionally_replaces_the_server_hash(self):
        connection = FakeConnection()
        with app.test_request_context(
            "/api/v1/change_person_name_phrase",
            method="PUT",
            json={
                "id": PERSON_ID,
                "currentHashedName": "current-client-hash",
                "newHashedName": "new-client-hash",
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with (
                patch("src.person_views.get_db_connection", return_value=connection),
                patch("src.person_views.hash_name", side_effect=lambda value: f"server-{value}"),
            ):
                response, status = change_person_name_phrase()

        self.assertEqual(status, 200)
        self.assertTrue(response.get_json()["success"])
        sql, params = connection.fake_cursor.executions[0]
        self.assertIn("is_public = FALSE", sql)
        self.assertIn("hashed_name = %s", sql)
        self.assertEqual(
            params,
            (
                "server-new-client-hash",
                PERSON_ID,
                ORGANIZATION_ID,
                "server-current-client-hash",
            ),
        )

    def test_change_phrase_rejects_a_non_matching_current_hash(self):
        connection = FakeConnection()
        connection.fake_cursor.rowcount = 0
        with app.test_request_context(
            "/api/v1/change_person_name_phrase",
            method="PUT",
            json={
                "id": PERSON_ID,
                "currentHashedName": "wrong-client-hash",
                "newHashedName": "new-client-hash",
            },
        ):
            g.organization_id = ORGANIZATION_ID
            with patch("src.person_views.get_db_connection", return_value=connection):
                response, status = change_person_name_phrase()

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json()["error"], "Verification failed")

    def test_entry_person_query_uses_model_column_order_instead_of_select_star(self):
        row = (
            PERSON_ID,
            MONSTER_SEED,
            1,
            "private-hash",
            None,
            False,
            "Woman",
            "Millennial",
            "Multiracial",
            "Faculty",
            True,
            "Graduate program",
            None,
            None,
            ORGANIZATION_ID,
        )
        connection = FakeConnection(rows=[row])
        with app.test_request_context(f"/api/v1/get_persons_by_entry_id/{PERSON_ID}"):
            g.organization_id = ORGANIZATION_ID
            with patch("src.person_views.get_db_connection", return_value=connection):
                response = get_persons_by_entry_id(PERSON_ID)

        data = response.get_json()
        self.assertEqual(data[0]["monsterSeed"], MONSTER_SEED)
        self.assertEqual(data[0]["gender"], "Woman")
        self.assertTrue(data[0]["isInternational"])
        sql, _params = connection.fake_cursor.executions[0]
        self.assertNotIn("SELECT p.*", sql)
        self.assertIn("SELECT p.id, p.monster_seed, p.monster_version", sql)


if __name__ == "__main__":
    unittest.main()
