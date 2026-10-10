import unittest
from unittest.mock import patch
from flask import g
from test_person_monsters import app, FakeConnection, ORGANIZATION_ID, PERSON_ID
from src.person_views import add_person, update_person


class PersonVerificationTests(unittest.TestCase):
    def call_update(self, data, rows):
        conn = FakeConnection(rows)
        with app.test_request_context('/api/v1/update_person', method='PUT', json={'id': PERSON_ID, **data}):
            g.organization_id = ORGANIZATION_ID
            with patch('src.person_views.get_db_connection', return_value=conn), patch('src.person_views.hash_name', side_effect=lambda value: f'server-{value}'):
                response, status = update_person()
        return response.get_json(), status, conn.fake_cursor.executions

    def test_wrong_name_phrase_cannot_edit_or_change_identity(self):
        _, status, queries = self.call_update({'currentHashedName': 'wrong', 'newHashedName': 'new', 'gender': 'Changed'}, [None])
        self.assertEqual(status, 403)
        self.assertEqual(len(queries), 1)
        self.assertIn('FOR UPDATE', queries[0][0])
        self.assertEqual(queries[0][1], (PERSON_ID, ORGANIZATION_ID, 'server-wrong'))

    def test_verified_edit_and_phrase_change_are_one_update(self):
        _, status, queries = self.call_update({'currentHashedName': 'current', 'newHashedName': 'new', 'gender': 'Updated', 'isPublic': True, 'publicName': 'Never store this', 'monsterSeed': 'forged'}, [(1,), None])
        self.assertEqual(status, 200)
        sql, params = queries[-1]
        self.assertIn('UPDATE persons', sql)
        self.assertIn('gender = %s', sql)
        self.assertIn('hashed_name = %s', sql)
        self.assertNotIn('is_public =', sql)
        self.assertNotIn('public_name', sql)
        self.assertNotIn('monster_seed', sql)
        self.assertEqual(params, ['Updated', 'server-new', PERSON_ID, ORGANIZATION_ID])

    def test_phrase_collision_does_not_save_any_details(self):
        _, status, queries = self.call_update({'currentHashedName': 'current', 'newHashedName': 'other', 'gender': 'Changed'}, [(1,), (1,)])
        self.assertEqual(status, 409)
        self.assertFalse(any(sql.startswith('UPDATE') for sql, _ in queries))

    def test_unverified_request_cannot_reclassify_private_person_as_public(self):
        conn = FakeConnection()
        conn.fake_cursor.rowcount = 0
        with app.test_request_context('/api/v1/update_person', method='PUT', json={'id': PERSON_ID, 'isPublic': True, 'publicName': 'Bypass', 'gender': 'Changed'}):
            g.organization_id = ORGANIZATION_ID
            with patch('utils.get_db_connection', return_value=conn):
                _, status = update_person()
        self.assertEqual(status, 404)
        sql, params = conn.fake_cursor.executions[0]
        self.assertIn('AND is_public = %s', sql)
        self.assertIs(params[-1], True)
        self.assertNotIn('is_public', sql.split('WHERE')[0])

    def test_duplicate_creation_is_rejected_without_insert(self):
        conn = FakeConnection([(1,)])
        with app.test_request_context('/api/v1/add_person', method='POST', json={'hashedName': 'existing', 'isPublic': False}):
            g.organization_id = ORGANIZATION_ID
            with patch('src.person_views.get_db_connection', return_value=conn):
                _, status = add_person()
        self.assertEqual(status, 409)
        self.assertIn('pg_advisory_xact_lock', conn.fake_cursor.executions[0][0])
        self.assertFalse(any(sql.startswith('INSERT') for sql, _ in conn.fake_cursor.executions))

    def test_lookup_failure_never_proceeds_to_insert(self):
        conn = FakeConnection()
        with app.test_request_context('/api/v1/add_person', method='POST', json={'hashedName': 'new', 'isPublic': False}):
            g.organization_id = ORGANIZATION_ID
            with patch('src.person_views.get_db_connection', return_value=conn), patch.object(conn.fake_cursor, 'fetchone', side_effect=RuntimeError('offline')):
                _, status = add_person()
        self.assertEqual(status, 500)
        self.assertFalse(any(sql.startswith('INSERT') for sql, _ in conn.fake_cursor.executions))

if __name__ == '__main__':
    unittest.main()
