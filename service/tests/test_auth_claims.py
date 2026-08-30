import os
import sys
import unittest
from unittest.mock import Mock, patch


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from src.auth import (
    CLAIM_EMAIL,
    CLAIM_EMAIL_VERIFIED,
    CLAIM_ORG_ID,
    validate_token,
)


class AuthClaimTests(unittest.TestCase):
    def test_maps_signed_ombuddi_identity_claims(self):
        jwks_client = Mock()
        jwks_client.get_signing_key_from_jwt.return_value.key = "public-key"
        decoded = {
            "sub": "auth0|invited-user",
            CLAIM_ORG_ID: None,
            CLAIM_EMAIL: "invited@example.com",
            CLAIM_EMAIL_VERIFIED: True,
        }
        with (
            patch("src.auth._get_jwks_client", return_value=jwks_client),
            patch("src.auth.jwt.decode", return_value=decoded.copy()),
        ):
            claims = validate_token("signed-token")

        self.assertEqual(claims["ombuddi_email"], "invited@example.com")
        self.assertTrue(claims["ombuddi_email_verified"])
        self.assertEqual(claims["ombuddi_email_claim_source"], "namespaced")

    def test_accepts_signed_standard_oidc_email_claims_as_a_fallback(self):
        jwks_client = Mock()
        jwks_client.get_signing_key_from_jwt.return_value.key = "public-key"
        decoded = {
            "sub": "auth0|invited-user",
            "email": "invited@example.com",
            "email_verified": True,
        }
        with (
            patch("src.auth._get_jwks_client", return_value=jwks_client),
            patch("src.auth.jwt.decode", return_value=decoded.copy()),
        ):
            claims = validate_token("signed-token")

        self.assertEqual(claims["ombuddi_email"], "invited@example.com")
        self.assertTrue(claims["ombuddi_email_verified"])
        self.assertEqual(claims["ombuddi_email_claim_source"], "standard")

    def test_namespaced_email_and_verification_are_kept_as_one_identity_pair(self):
        jwks_client = Mock()
        jwks_client.get_signing_key_from_jwt.return_value.key = "public-key"
        decoded = {
            "sub": "auth0|invited-user",
            CLAIM_EMAIL: "invited@example.com",
            CLAIM_EMAIL_VERIFIED: False,
            "email": "different@example.com",
            "email_verified": True,
        }
        with (
            patch("src.auth._get_jwks_client", return_value=jwks_client),
            patch("src.auth.jwt.decode", return_value=decoded.copy()),
        ):
            claims = validate_token("signed-token")

        self.assertEqual(claims["ombuddi_email"], "invited@example.com")
        self.assertFalse(claims["ombuddi_email_verified"])
        self.assertEqual(claims["ombuddi_email_claim_source"], "namespaced")

    def test_verified_claim_must_be_boolean_true(self):
        jwks_client = Mock()
        jwks_client.get_signing_key_from_jwt.return_value.key = "public-key"
        decoded = {
            "sub": "auth0|invited-user",
            CLAIM_EMAIL: "invited@example.com",
            CLAIM_EMAIL_VERIFIED: "true",
        }
        with (
            patch("src.auth._get_jwks_client", return_value=jwks_client),
            patch("src.auth.jwt.decode", return_value=decoded.copy()),
        ):
            claims = validate_token("signed-token")

        self.assertFalse(claims["ombuddi_email_verified"])


if __name__ == "__main__":
    unittest.main()
