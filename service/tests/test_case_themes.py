import unittest
from unittest.mock import patch

from flask import g
from test_case_referral_sources import app, FakeConnection, CASE_ID, ORGANIZATION_ID, OMBUDS_ID
from src.case_themes import normalize_themes, record_theme_suggestions
from src.ombuddi_views import create_case, update_case_themes, update_case


class CaseThemeTests(unittest.TestCase):
    def test_theme_normalization_rejects_invalid_values_and_deduplicates_names(self):
        self.assertEqual(normalize_themes([' Equity  Issues ', 'equity issues', 'Title IX']),
                         ['Equity Issues', 'Title IX'])
        for value in [None, 'Title IX', [None], [' '], ['a' * 121], ['x'] * 51]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_themes(value)

    def test_retained_theme_does_not_reactivate_deleted_suggestion(self):
        conn = FakeConnection(fetchone_rows=[('New Theme',)])
        result = record_theme_suggestions(conn.fake_cursor, ORGANIZATION_ID,
                                         ['Old Theme', 'New Theme'], ['Old Theme'])
        self.assertEqual(result, ['Old Theme', 'New Theme'])
        self.assertEqual(len(conn.fake_cursor.executions), 1)
        self.assertEqual(conn.fake_cursor.executions[0][1], (ORGANIZATION_ID, 'New Theme', ORGANIZATION_ID))

    def test_creating_case_and_new_suggestions_is_one_transaction(self):
        conn = FakeConnection(fetchone_rows=[('Advising Issues',), (CASE_ID,)])
        with app.test_request_context('/api/v1/create_case', method='POST', json={
            'name': 'Case with themes', 'themes': ['advising issues'],
        }):
            g.organization_id, g.ombuds_id = ORGANIZATION_ID, OMBUDS_ID
            with patch('src.ombuddi_views.get_db_connection', return_value=conn):
                _, status = create_case()
        self.assertEqual(status, 200)
        case_insert = next(params for sql, params in conn.fake_cursor.executions if 'INSERT INTO cases' in sql)
        self.assertEqual(case_insert[-1], ['Advising Issues'])
        self.assertTrue(conn.committed)

    def test_updates_preserve_retired_values_and_add_only_new_names(self):
        conn = FakeConnection(fetchone_rows=[(['Retired Theme'],), ('Title IX',)])
        with app.test_request_context('/api/v1/update_case_themes', method='PUT', json={
            'caseId': CASE_ID, 'themes': ['Retired Theme', 'Title IX'],
            'organizationId': 'untrusted',
        }):
            g.organization_id = ORGANIZATION_ID
            with patch('src.ombuddi_views.get_db_connection', return_value=conn):
                response, status = update_case_themes()
        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()['themes'], ['Retired Theme', 'Title IX'])
        self.assertEqual(conn.fake_cursor.executions[0][1], (CASE_ID, ORGANIZATION_ID))
        self.assertIn("case_kind = 'standard'", conn.fake_cursor.executions[0][0])
        self.assertEqual(conn.fake_cursor.executions[-1][1], (['Retired Theme', 'Title IX'], CASE_ID, ORGANIZATION_ID))
        self.assertTrue(conn.committed)

    def test_missing_or_foreign_case_does_not_create_suggestions(self):
        conn = FakeConnection()
        with app.test_request_context('/api/v1/update_case_themes', method='PUT', json={
            'caseId': CASE_ID, 'themes': ['New Theme'],
        }):
            g.organization_id = ORGANIZATION_ID
            with patch('src.ombuddi_views.get_db_connection', return_value=conn):
                _, status = update_case_themes()
        self.assertEqual(status, 404)
        self.assertEqual(len(conn.fake_cursor.executions), 1)

    def test_failed_case_update_rolls_back_new_suggestions(self):
        conn = FakeConnection(fetchone_rows=[([],), ('New Theme',)])
        execute = conn.fake_cursor.execute
        def fail_update(sql, params):
            if sql.startswith('UPDATE cases'):
                raise RuntimeError('fixture failure')
            execute(sql, params)
        conn.fake_cursor.execute = fail_update
        with app.test_request_context('/api/v1/update_case_themes', method='PUT', json={
            'caseId': CASE_ID, 'themes': ['New Theme'],
        }):
            g.organization_id = ORGANIZATION_ID
            with patch('src.ombuddi_views.get_db_connection', return_value=conn):
                _, status = update_case_themes()
        self.assertEqual(status, 500)
        self.assertTrue(conn.rolled_back)
        self.assertFalse(conn.committed)

    def test_generic_case_update_cannot_bypass_theme_handling(self):
        with app.test_request_context('/api/v1/update_case', method='PUT', json={'id': CASE_ID, 'themes': ['A']}):
            g.organization_id = ORGANIZATION_ID
            with patch('src.ombuddi_views.update_one') as update:
                update_case()
        self.assertIn('themes', update.call_args.kwargs['immutable_columns'])
