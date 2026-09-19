import os
import sys
import unittest
from unittest.mock import MagicMock, patch

from flask import Flask, g

SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, os.path.join(SERVICE_DIR, 'src'))
from src.admin_views import get_metrics


class AdminMetricsTests(unittest.TestCase):
    def test_maps_remaining_metrics_after_removing_contributor_count(self):
        conn = MagicMock()
        cursor = conn.cursor.return_value.__enter__.return_value
        cursor.fetchone.return_value = (11, 29, 3, 17)
        with Flask(__name__).test_request_context(), patch('src.admin_views.get_db_connection', return_value=conn):
            g.organization_id = 'organization-id'
            response = get_metrics()
        self.assertEqual(response.get_json(), {
            'entriesLast30Days': 11, 'entriesYtd': 29, 'openCases': 3, 'totalCases': 17,
        })
        conn.close.assert_called_once()
