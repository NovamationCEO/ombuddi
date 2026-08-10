import os
import sys
import unittest
from unittest.mock import patch

from flask import g


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app, authenticate


OMBUDS_ID = "b73d0105-af49-484f-87a3-217af3feff90"
ORGANIZATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


class AuthenticationTests(unittest.TestCase):
    def authenticate_with(self, claims, principal, request_path="/api/v1/example"):
        with app.test_request_context(
            request_path,
            headers={"Authorization": "Bearer test-token"},
        ):
            with (
                patch("app.validate_token", return_value=claims),
                patch("app.get_principal", return_value=principal),
            ):
                response = authenticate()
                context = {
                    "auth0_sub": getattr(g, "auth0_sub", None),
                    "ombuds_id": getattr(g, "ombuds_id", None),
                    "organization_id": getattr(g, "organization_id", None),
                    "is_admin": getattr(g, "is_admin", None),
                    "is_system_admin": getattr(g, "is_system_admin", None),
                    "auth0_email": getattr(g, "auth0_email", None),
                    "auth0_email_verified": getattr(g, "auth0_email_verified", None),
                }
                return response, context

    def test_sets_only_local_ids_on_request_context(self):
        response, context = self.authenticate_with(
            {
                "sub": "auth0|6a416db3b92ce3ffd623bb34",
                "organization_id": ORGANIZATION_ID,
                "ombuddi_email": "invited@example.com",
                "ombuddi_email_verified": True,
            },
            {
                "ombuds_id": OMBUDS_ID,
                "organization_id": ORGANIZATION_ID,
                "is_admin": True,
                "is_system_admin": False,
                "is_active": True,
                "organization_is_active": True,
            },
        )

        self.assertIsNone(response)
        self.assertEqual(context["auth0_sub"], "auth0|6a416db3b92ce3ffd623bb34")
        self.assertEqual(context["ombuds_id"], OMBUDS_ID)
        self.assertEqual(context["organization_id"], ORGANIZATION_ID)
        self.assertTrue(context["is_admin"])
        self.assertFalse(context["is_system_admin"])
        self.assertEqual(context["auth0_email"], "invited@example.com")
        self.assertTrue(context["auth0_email_verified"])

    def test_rejects_unlinked_auth0_subject(self):
        response, _context = self.authenticate_with(
            {"sub": "auth0|unlinked"},
            None,
        )
        self.assertEqual(response[1], 403)

    def test_rejects_stale_organization_claim(self):
        response, _context = self.authenticate_with(
            {
                "sub": "auth0|6a416db3b92ce3ffd623bb34",
                "organization_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            },
            {
                "ombuds_id": OMBUDS_ID,
                "organization_id": ORGANIZATION_ID,
                "is_admin": False,
                "is_system_admin": False,
                "is_active": True,
                "organization_is_active": True,
            },
        )
        self.assertEqual(response[1], 403)

    def test_rejects_deactivated_user(self):
        response, _context = self.authenticate_with(
            {"sub": "auth0|inactive-user"},
            {
                "ombuds_id": OMBUDS_ID,
                "organization_id": ORGANIZATION_ID,
                "is_admin": False,
                "is_system_admin": False,
                "is_active": False,
                "organization_is_active": True,
            },
        )
        self.assertEqual(response[1], 403)
        self.assertIn("user account is deactivated", response[0].get_json()["message"])

    def test_rejects_user_in_deactivated_organization(self):
        response, _context = self.authenticate_with(
            {"sub": "auth0|suspended-org-user"},
            {
                "ombuds_id": OMBUDS_ID,
                "organization_id": ORGANIZATION_ID,
                "is_admin": True,
                "is_system_admin": False,
                "is_active": True,
                "organization_is_active": False,
            },
        )
        self.assertEqual(response[1], 403)
        self.assertIn("organization is deactivated", response[0].get_json()["message"])

    def test_allows_unlinked_subject_to_claim_invitation_only(self):
        response, context = self.authenticate_with(
            {"sub": "auth0|invited"},
            None,
            request_path="/api/v1/auth/claim-invitation",
        )
        self.assertIsNone(response)
        self.assertEqual(context["auth0_sub"], "auth0|invited")
        self.assertIsNone(context["ombuds_id"])


if __name__ == "__main__":
    unittest.main()
