"""Opt-in local Postgres test; uses temporary tables and rolls back all fixtures."""
import os
import sys
import unittest
from datetime import date
from uuid import uuid4

SERVICE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, SERVICE_DIR)
sys.path.insert(0, os.path.join(SERVICE_DIR, 'src'))
from app import app
from src.person_views import SQL_ADD_ENTRY_PERSON
from src.report_views import _execute_reports


@unittest.skipUnless(os.getenv('RUN_POSTGRES_TESTS') == '1', 'Opt-in local Postgres test')
class EntryRolePostgresTests(unittest.TestCase):
    def test_visitor_counts_follow_roles_without_losing_other_links(self):
        import psycopg2
        # Explicit local Compose host, never a potentially remote DATABASE_URL.
        conn = psycopg2.connect(host='db', user=os.environ['DB_USER'],
                               password=os.environ['DB_PASS'], dbname=os.environ['DB_NAME'])
        try:
            with conn.cursor() as cur:
                cur.execute('''
                    CREATE TEMP TABLE entries (id uuid PRIMARY KEY, organization_id uuid,
                        ombuds_id uuid, case_id uuid, date date, medium text, duration integer);
                    CREATE TEMP TABLE cases (id uuid PRIMARY KEY, organization_id uuid,
                        case_kind text, status text, codes uuid[], themes text[]);
                    CREATE TEMP TABLE persons (id uuid PRIMARY KEY, race text,
                        primary_role text, generation text);
                    CREATE TEMP TABLE codes (id uuid PRIMARY KEY, code text);
                    CREATE TEMP TABLE entry_person (LIKE public.entry_person INCLUDING ALL);
                ''')
                org, owner, colleague, case = [str(uuid4()) for _ in range(4)]
                entries = [str(uuid4()) for _ in range(3)]
                people = [str(uuid4()) for _ in range(6)]
                cur.execute("INSERT INTO cases VALUES (%s, %s, 'standard', 'open', '{}', '{Advising Issues}')", (case, org))
                for index, entry in enumerate(entries):
                    cur.execute("INSERT INTO entries VALUES (%s, %s, %s, %s, '2026-07-01', 'Phone', 30)",
                                (entry, org, owner if index < 2 else colleague, case))
                for person in people:
                    cur.execute("INSERT INTO persons VALUES (%s, 'Race', 'Staff', 'Generation')", (person,))
                # Legacy writes default to Visitor; Bob visits twice.
                cur.execute('INSERT INTO entry_person (entry_id, person_id) VALUES (%s, %s)',
                            (entries[0], people[0]))
                cur.execute(SQL_ADD_ENTRY_PERSON, (entries[1], people[0], 'visitor'))
                for person, role in zip(people[1:], ['referenced', 'consulted', 'support_person', 'participant', 'other']):
                    cur.execute(SQL_ADD_ENTRY_PERSON, (entries[0], person, role))
                # Alice is also a visitor in a colleague's note.
                cur.execute(SQL_ADD_ENTRY_PERSON, (entries[2], people[1], 'visitor'))

                def report(ombuds=None):
                    with app.app_context():
                        return _execute_reports(cur, org, date(2026, 7, 1), date(2026, 7, 31), ombuds).get_json()

                personal = report(owner)
                self.assertEqual(personal['personsByMonth'], [
                    {'month': '2026-07', 'uniquePersons': 1, 'totalAppearances': 2}])
                for key in ['personsByRace', 'personsByRole', 'personsByGeneration']:
                    self.assertEqual(personal[key][0]['count'], 1)
                self.assertEqual(personal['entriesByMonth'][0]['count'], 2)
                self.assertEqual(report()['personsByMonth'][0]['uniquePersons'], 2)
                cur.execute(SQL_ADD_ENTRY_PERSON, (entries[0], people[1], 'visitor'))
                self.assertEqual(report(owner)['personsByMonth'][0]['uniquePersons'], 2)
                cur.execute(SQL_ADD_ENTRY_PERSON, (entries[0], people[0], 'referenced'))
                cur.execute(SQL_ADD_ENTRY_PERSON, (entries[1], people[0], 'consulted'))
                self.assertEqual(report(owner)['personsByMonth'][0]['uniquePersons'], 1)
                cur.execute('SELECT COUNT(*) FROM entry_person')
                self.assertEqual(cur.fetchone()[0], 8)
                cur.execute('SAVEPOINT invalid_role')
                with self.assertRaises(psycopg2.errors.CheckViolation):
                    cur.execute(SQL_ADD_ENTRY_PERSON, (entries[0], people[0], 'invalid'))
                cur.execute('ROLLBACK TO SAVEPOINT invalid_role')
        finally:
            conn.rollback()
            conn.close()
