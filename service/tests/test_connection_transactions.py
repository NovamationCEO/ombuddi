import os
import sys
import unittest
from unittest.mock import patch


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from src.connection import get_db_connection


class FakeConnection:
    def __init__(self):
        self.autocommit = True


class ConnectionTransactionTests(unittest.TestCase):
    def test_connections_do_not_autocommit(self):
        connection = FakeConnection()
        with (
            patch("src.connection.psycopg2.connect", return_value=connection),
            patch.dict(os.environ, {"DATABASE_URL": "postgres://user:pass@db/example"}),
        ):
            returned = get_db_connection()

        self.assertIs(returned, connection)
        self.assertFalse(connection.autocommit)


if __name__ == "__main__":
    unittest.main()
