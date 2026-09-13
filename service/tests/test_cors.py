import os
import sys
import unittest


SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
SRC_DIR = os.path.join(SERVICE_DIR, "src")
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, SRC_DIR)

from app import app, frontend_origin


class CorsTests(unittest.TestCase):
    def test_configured_frontend_origin_is_allowed(self):
        response = app.test_client().get('/', headers={'Origin': frontend_origin})

        self.assertEqual(response.headers.get('Access-Control-Allow-Origin'), frontend_origin)

    def test_unconfigured_origin_is_not_allowed(self):
        response = app.test_client().get('/', headers={'Origin': 'https://not-ombuddi.example'})

        self.assertIsNone(response.headers.get('Access-Control-Allow-Origin'))


if __name__ == '__main__':
    unittest.main()
