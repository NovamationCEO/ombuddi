import os
import sys
import unittest


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from src.email_identity import normalize_email


class EmailIdentityTests(unittest.TestCase):
    def test_normalizes_like_the_auth0_action(self):
        self.assertEqual(
            normalize_email("  Invited.User+Alpha@Example.COM  "),
            "invited.user+alpha@example.com",
        )

    def test_rejects_missing_or_structurally_invalid_email(self):
        for value in (None, "", "missing-at.example.com", "a@@example.com", "a @example.com"):
            with self.subTest(value=value):
                self.assertIsNone(normalize_email(value))


if __name__ == "__main__":
    unittest.main()
