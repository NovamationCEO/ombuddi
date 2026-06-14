from flask import Blueprint, request, jsonify
from src.connection import get_db_connection
from datetime import date, timedelta

report_views = Blueprint('report_views', __name__)

@report_views.route('/api/v1/reports/<organization_id>')
def get_reports(organization_id):
    today = date.today()
    end = request.args.get('end', today.isoformat())
    start = request.args.get('start', (today.replace(day=1) - timedelta(days=364)).isoformat())

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month, COUNT(*) AS count
        FROM entries
        WHERE organization_id = %s AND date >= %s AND date <= %s
        GROUP BY month ORDER BY month
    """, (organization_id, start, end))
    entries_by_month = [{'month': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.execute("""
        SELECT TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
               COALESCE(SUM(duration), 0) AS total_minutes
        FROM entries
        WHERE organization_id = %s AND date >= %s AND date <= %s
        GROUP BY month ORDER BY month
    """, (organization_id, start, end))
    duration_by_month = [{'month': r[0], 'totalMinutes': int(r[1])} for r in cur.fetchall()]

    cur.execute("""
        SELECT TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
               COUNT(*) AS count
        FROM cases
        WHERE organization_id = %s AND created_at >= %s AND created_at <= %s
        GROUP BY month ORDER BY month
    """, (organization_id, start, end))
    cases_by_month = [{'month': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.execute("""
        SELECT TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS month,
               COUNT(DISTINCT ep.person_id) AS unique_persons,
               COUNT(ep.person_id) AS total_appearances
        FROM entries e
        JOIN entry_person ep ON ep.entry_id = e.id
        WHERE e.organization_id = %s AND e.date >= %s AND e.date <= %s
        GROUP BY month ORDER BY month
    """, (organization_id, start, end))
    persons_by_month = [
        {'month': r[0], 'uniquePersons': r[1], 'totalAppearances': r[2]}
        for r in cur.fetchall()
    ]

    cur.execute("""
        SELECT COALESCE(NULLIF(TRIM(p.race), ''), 'Not specified') AS race,
               COUNT(DISTINCT ep.person_id) AS count
        FROM entry_person ep
        JOIN persons p ON p.id = ep.person_id
        JOIN entries e ON e.id = ep.entry_id
        WHERE e.organization_id = %s AND e.date >= %s AND e.date <= %s
        GROUP BY race ORDER BY count DESC
    """, (organization_id, start, end))
    persons_by_race = [{'race': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.close()
    conn.close()

    return jsonify({
        'entriesByMonth': entries_by_month,
        'durationByMonth': duration_by_month,
        'casesByMonth': cases_by_month,
        'personsByMonth': persons_by_month,
        'personsByRace': persons_by_race,
    })
