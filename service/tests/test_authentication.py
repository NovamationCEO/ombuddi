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
                    "session_diagnostics": getattr(g, "session_diagnostics", None),
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
        self.assertEqual(response[0].get_json()["code"], "ACCOUNT_NOT_LINKED")

    def test_invalid_token_details_are_logged_but_not_returned(self):
        with app.test_request_context(
            "/api/v1/example",
            headers={"Authorization": "Bearer invalid-token"},
        ):
            with (
                patch("app.validate_token", side_effect=RuntimeError("sensitive verifier detail")),
                self.assertLogs("app", level="WARNING") as logs,
            ):
                response, status = authenticate()

        self.assertEqual(status, 401)
        self.assertEqual(response.get_json()["message"], "Invalid access token")
        self.assertNotIn("sensitive verifier detail", response.get_data(as_text=True))
        self.assertIn("Rejected invalid access token", logs.output[0])

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
        self.assertEqual(response[0].get_json()["code"], "ORGANIZATION_CLAIM_MISMATCH")

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

    def test_diagnostics_are_available_to_an_unlinked_authenticated_subject(self):
        response, context = self.authenticate_with(
            {
                "sub": "auth0|unlinked",
                "ombuddi_email": "invited@example.com",
                "ombuddi_email_verified": True,
            },
            None,
            request_path="/api/v1/auth/session-diagnostics",
        )

        self.assertIsNone(response)
        diagnostics = context["session_diagnostics"]
        self.assertEqual(diagnostics["code"], "ACCOUNT_NOT_LINKED")
        self.assertFalse(diagnostics["canAccessApplication"])
        self.assertNotIn("auth0|unlinked", str(diagnostics))
        self.assertNotIn("invited@example.com", str(diagnostics))

    def test_diagnostics_identify_a_missing_email_claim_as_the_invitation_blocker(self):
        response, context = self.authenticate_with(
            {"sub": "auth0|unlinked"},
            None,
            request_path="/api/v1/auth/session-diagnostics",
        )

        self.assertIsNone(response)
        diagnostics = context["session_diagnostics"]
        self.assertEqual(diagnostics["code"], "EMAIL_CLAIM_MISSING")
        self.assertEqual(diagnostics["emailClaimSource"], "missing")
        self.assertFalse(diagnostics["emailClaimPresent"])

    def test_diagnostics_distinguish_an_unverified_email(self):
        response, context = self.authenticate_with(
            {
                "sub": "auth0|unlinked",
                "ombuddi_email": "invited@example.com",
                "ombuddi_email_verified": False,
                "ombuddi_email_claim_source": "namespaced",
            },
            None,
            request_path="/api/v1/auth/session-diagnostics",
        )

        self.assertIsNone(response)
        diagnostics = context["session_diagnostics"]
        self.assertEqual(diagnostics["code"], "EMAIL_NOT_VERIFIED")
        self.assertTrue(diagnostics["emailClaimPresent"])
        self.assertFalse(diagnostics["emailVerified"])

    def test_diagnostics_explain_a_stale_organization_claim_without_rejecting_the_request(self):
        response, context = self.authenticate_with(
            {
                "sub": "auth0|linked",
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
            request_path="/api/v1/auth/session-diagnostics",
        )

        self.assertIsNone(response)
        diagnostics = context["session_diagnostics"]
        self.assertEqual(diagnostics["code"], "ORGANIZATION_CLAIM_MISMATCH")
        self.assertFalse(diagnostics["organizationClaimMatches"])

    def test_diagnostics_endpoint_returns_no_store_safe_summary(self):
        principal = {
            "ombuds_id": OMBUDS_ID,
            "organization_id": ORGANIZATION_ID,
            "is_admin": True,
            "is_system_admin": False,
            "is_active": True,
            "organization_is_active": True,
        }
        with (
            patch("app.validate_token", return_value={"sub": "auth0|linked"}),
            patch("app.get_principal", return_value=principal),
        ):
            response = app.test_client().get(
                "/api/v1/auth/session-diagnostics",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["code"], "SESSION_READY")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertNotIn("auth0|linked", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
