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
from src.ombuddi_views import add_entry


class EntryIdentityTests(unittest.TestCase):
    def test_entry_creation_force_stamps_local_principal_ids(self):
        with app.test_request_context(
            "/api/v1/add_entry",
            method="POST",
            json={
                "caseId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
                "ombudsId": "auth0|must-not-be-used",
                "organizationId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
                "date": "2026-08-03",
            },
        ):
            g.ombuds_id = "b73d0105-af49-484f-87a3-217af3feff90"
            g.organization_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
            with (
                patch("src.ombuddi_views._require_owned_reference", return_value=None),
                patch("src.ombuddi_views.add_one", return_value="ok") as add_one,
            ):
                self.assertEqual(add_entry(), "ok")

        self.assertEqual(
            add_one.call_args.kwargs["owner_constraint"],
            {
                "ombuds_id": "b73d0105-af49-484f-87a3-217af3feff90",
                "organization_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            },
        )


if __name__ == "__main__":
    unittest.main()
