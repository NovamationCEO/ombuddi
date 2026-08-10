import os
import sys
import unittest
from unittest.mock import patch
from uuid import UUID


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from src.principal import PrincipalLookupError, get_principal


class FakeCursor:
    def __init__(self, row=None, error=None):
        self.row = row
        self.error = error
        self.executed = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, sql, params):
        if self.error:
            raise self.error
        self.executed = (sql, params)

    def fetchone(self):
        return self.row


class FakeConnection:
    def __init__(self, cursor):
        self.fake_cursor = cursor
        self.closed = False

    def cursor(self):
        return self.fake_cursor

    def close(self):
        self.closed = True


class PrincipalTests(unittest.TestCase):
    def test_resolves_auth0_sub_to_local_ids(self):
        ombuds_id = UUID("b73d0105-af49-484f-87a3-217af3feff90")
        organization_id = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        cursor = FakeCursor((ombuds_id, organization_id, True))
        connection = FakeConnection(cursor)

        with patch("src.principal.get_db_connection", return_value=connection):
            principal = get_principal("auth0|6a416db3b92ce3ffd623bb34")

        self.assertEqual(
            principal,
            {
                "ombuds_id": str(ombuds_id),
                "organization_id": str(organization_id),
                "is_admin": True,
            },
        )
        self.assertEqual(
            cursor.executed[1],
            ("auth0|6a416db3b92ce3ffd623bb34",),
        )
        self.assertTrue(connection.closed)

    def test_returns_none_for_unlinked_subject(self):
        connection = FakeConnection(FakeCursor(None))
        with patch("src.principal.get_db_connection", return_value=connection):
            self.assertIsNone(get_principal("auth0|unlinked"))

    def test_wraps_database_errors(self):
        connection = FakeConnection(FakeCursor(error=RuntimeError("db unavailable")))
        with patch("src.principal.get_db_connection", return_value=connection):
            with self.assertRaises(PrincipalLookupError):
                get_principal("auth0|example")
        self.assertTrue(connection.closed)


if __name__ == "__main__":
    unittest.main()
