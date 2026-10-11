"""RUN_POSTGRES_TESTS=1 in local Compose. All fixtures are temporary and rolled back."""
import os
import unittest
from datetime import date
from uuid import uuid4
from test_case_themes import app
from src.case_themes import record_theme_suggestions
from src.report_views import _execute_reports


@unittest.skipUnless(os.getenv('RUN_POSTGRES_TESTS') == '1', 'Opt-in local Postgres test')
class CaseThemesPostgresTests(unittest.TestCase):
    def test_defaults_snapshots_retirement_and_reporting(self):
        import psycopg2
        conn = psycopg2.connect(host='db', user=os.environ['DB_USER'],
                               password=os.environ['DB_PASS'], dbname=os.environ['DB_NAME'])
        try:
            with conn.cursor() as cur:
                cur.execute('''
                    CREATE TEMP TABLE organizations (id uuid PRIMARY KEY);
                    CREATE TEMP TABLE picklists (LIKE public.picklists INCLUDING ALL);
                    CREATE TEMP TABLE cases (LIKE public.cases INCLUDING ALL);
                    CREATE TEMP TABLE entries (id uuid PRIMARY KEY, case_id uuid, organization_id uuid,
                        ombuds_id uuid, date date, medium text, duration integer);
                    CREATE TEMP TABLE persons (id uuid, race text, generation text, primary_role text);
                    CREATE TEMP TABLE entry_person (entry_id uuid, person_id uuid, entry_role text);
                    CREATE TEMP TABLE codes (id uuid, code text);
                    CREATE TRIGGER seed_themes AFTER INSERT ON organizations
                        FOR EACH ROW EXECUTE FUNCTION seed_organization_case_themes();
                ''')
                org, other_org, case, ombuds = [str(uuid4()) for _ in range(4)]
                cur.execute('INSERT INTO organizations VALUES (%s)', (org,))
                cur.execute("SELECT name FROM picklists WHERE organization_id = %s ORDER BY index", (org,))
                self.assertEqual([r[0] for r in cur.fetchall()], [
                    'Advising Issues', 'Staff/Faculty Conflict', 'Staff/Administration Conflict',
                    'Student/Faculty Conflict', 'Supervising Conflict', 'Title IX', 'Equity Issues', 'Job Insecurity'])
                themes = record_theme_suggestions(cur, org, ['advising issues', 'Local Concern'])
                self.assertEqual(themes, ['Advising Issues', 'Local Concern'])
                cur.execute('INSERT INTO cases (id, organization_id, name, themes) VALUES (%s, %s, %s, %s)',
                            (case, org, 'Fixture case', themes))
                cur.execute("UPDATE picklists SET soft_delete = TRUE WHERE organization_id = %s AND name = 'Advising Issues'", (org,))
                cur.execute("UPDATE picklists SET name = 'Revised Concern' WHERE organization_id = %s AND name = 'Local Concern'", (org,))
                self.assertEqual(record_theme_suggestions(cur, org, themes, themes), themes)
                cur.execute('SELECT themes FROM cases WHERE id = %s', (case,))
                self.assertEqual(cur.fetchone()[0], themes)
                cur.execute("SELECT count(*) FROM picklists WHERE organization_id = %s AND name = 'Advising Issues' AND NOT soft_delete", (org,))
                self.assertEqual(cur.fetchone()[0], 0)
                # Repeated notes count a case once for each theme; periods and scopes still apply.
                for _ in range(2):
                    cur.execute("INSERT INTO entries VALUES (%s, %s, %s, %s, '2026-07-01', 'Phone', 30)",
                                (str(uuid4()), case, org, ombuds))
                with app.app_context():
                    report = _execute_reports(cur, org, date(2026, 7, 1), date(2026, 7, 31), ombuds).get_json()
                    self.assertEqual(report['casesByTheme'], [
                        {'theme': 'Advising Issues', 'count': 1}, {'theme': 'Local Concern', 'count': 1}])
                    self.assertEqual(_execute_reports(cur, other_org, date(2026, 7, 1), date(2026, 7, 31)).get_json()['casesByTheme'], [])
                    self.assertEqual(_execute_reports(cur, org, date(2026, 8, 1), date(2026, 8, 31)).get_json()['casesByTheme'], [])
                # An intentionally emptied list stays empty, and existing customized lists are not seeded.
                cur.execute('UPDATE picklists SET soft_delete = TRUE WHERE organization_id = %s', (org,))
                cur.execute('SELECT seed_default_case_themes(%s)', (org,))
                cur.execute('SELECT count(*) FROM picklists WHERE organization_id = %s AND NOT soft_delete', (org,))
                self.assertEqual(cur.fetchone()[0], 0)
                record_theme_suggestions(cur, other_org, ['Custom Theme'])
                cur.execute('INSERT INTO organizations VALUES (%s)', (other_org,))
                cur.execute('SELECT count(*) FROM picklists WHERE organization_id = %s', (other_org,))
                self.assertEqual(cur.fetchone()[0], 1)
        finally:
            conn.rollback()
            conn.close()
