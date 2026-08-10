import os
import sys
import unittest
from unittest.mock import patch

from flask import request


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app
from src.utils import add_one, get_many


class DatabaseErrorTests(unittest.TestCase):
    def test_read_error_is_logged_without_exposing_database_details(self):
        with app.test_request_context("/api/v1/example"):
            with (
                patch(
                    "src.utils.get_db_connection",
                    side_effect=RuntimeError("password secret; SELECT private_table"),
                ),
                self.assertLogs("src.utils", level="ERROR") as logs,
            ):
                response, status = get_many("example", {"id": "id"}, {})

        body = response.get_json()
        self.assertEqual(status, 500)
        self.assertEqual(body["message"], "Unable to load records")
        self.assertNotIn("private_table", response.get_data(as_text=True))
        self.assertIn("private_table", logs.output[0])

    def test_write_connection_failure_does_not_mask_the_original_error(self):
        with app.test_request_context(
            "/api/v1/example",
            method="POST",
            json={"name": "Example"},
        ):
            with (
                patch(
                    "src.utils.get_db_connection",
                    side_effect=RuntimeError("database unavailable"),
                ),
                self.assertLogs("src.utils", level="ERROR"),
            ):
                response, status = add_one(
                    "example",
                    {"id": "id", "name": "name"},
                    request,
                )

        self.assertEqual(status, 500)
        self.assertEqual(response.get_json()["message"], "Unable to save the record")


if __name__ == "__main__":
    unittest.main()
