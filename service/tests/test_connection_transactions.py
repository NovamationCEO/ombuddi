import os
import sys
import unittest
from unittest.mock import patch


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from src.connection import get_db_connection, managed_connection


class FakeConnection:
    def __init__(self):
        self.autocommit = True
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class ConnectionTransactionTests(unittest.TestCase):
    def test_connections_do_not_autocommit(self):
        connection = FakeConnection()
        with (
            patch("src.connection.psycopg2.connect", return_value=connection) as connect,
            patch.dict(os.environ, {"DATABASE_URL": "postgres://user:pass@db/example"}),
        ):
            returned = get_db_connection()

        self.assertIs(returned, connection)
        self.assertFalse(connection.autocommit)
        connect.assert_called_once_with(
            "postgres://user:pass@db/example",
            connect_timeout=10,
        )

    def test_managed_connection_commits_and_closes_successful_work(self):
        connection = FakeConnection()

        with managed_connection(lambda: connection) as returned:
            self.assertIs(returned, connection)

        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)
        self.assertTrue(connection.closed)

    def test_managed_connection_rolls_back_and_closes_failed_work(self):
        connection = FakeConnection()

        with self.assertRaisesRegex(RuntimeError, "failed operation"):
            with managed_connection(lambda: connection):
                raise RuntimeError("failed operation")

        self.assertFalse(connection.committed)
        self.assertTrue(connection.rolled_back)
        self.assertTrue(connection.closed)


if __name__ == "__main__":
    unittest.main()
