import logging
from datetime import date, timedelta

from flask import Blueprint, request, jsonify, g

from src.connection import get_db_connection, managed_connection

report_views = Blueprint('report_views', __name__)
logger = logging.getLogger(__name__)
REPORT_SCOPES = {'my', 'organization'}


def _report_date_range(args, today=None):
    today = today or date.today()
    raw_end = args.get('end', today.isoformat())
    raw_start = args.get(
        'start',
        (today.replace(day=1) - timedelta(days=364)).isoformat(),
    )
    try:
        start = date.fromisoformat(raw_start)
        end = date.fromisoformat(raw_end)
    except (TypeError, ValueError):
        raise ValueError('start and end must be valid dates in YYYY-MM-DD format')
    if start > end:
        raise ValueError('start must be on or before end')
    return start, end

@report_views.route('/api/v1/reports')
def get_reports():
    organization_id = g.organization_id
    scope = request.args.get('scope', 'my')
    if scope not in REPORT_SCOPES:
        return jsonify({
            'error': 'Input error',
            'message': 'scope must be my or organization',
        }), 400
    try:
        start, end = _report_date_range(request.args)
    except ValueError as exc:
        return jsonify({'error': 'Input error', 'message': str(exc)}), 400

    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                return _execute_reports(
                    cur,
                    organization_id,
                    start,
                    end,
                    ombuds_id=g.ombuds_id if scope == 'my' else None,
                )
    except Exception:
        logger.exception('Failed to generate reports')
        return jsonify({
            'error': 'Database error',
            'message': 'Unable to generate reports',
        }), 500


def _scope_filter(ombuds_id, column):
    if ombuds_id is None:
        return '', ()
    return f' AND {column} = %s', (ombuds_id,)


def _execute_reports(cur, organization_id, start, end, ombuds_id=None):
    entry_scope, entry_scope_params = _scope_filter(ombuds_id, 'ombuds_id')
    aliased_entry_scope, aliased_entry_scope_params = _scope_filter(ombuds_id, 'e.ombuds_id')

    cur.execute(f"""
        SELECT TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month, COUNT(*) AS count
        FROM entries
        WHERE organization_id = %s AND date >= %s AND date <= %s
        {entry_scope}
        GROUP BY month ORDER BY month
    """, (organization_id, start, end, *entry_scope_params))
    entries_by_month = [{'month': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.execute(f"""
        SELECT TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
               COALESCE(SUM(duration), 0) AS total_minutes
        FROM entries
        WHERE organization_id = %s AND date >= %s AND date <= %s
        {entry_scope}
        GROUP BY month ORDER BY month
    """, (organization_id, start, end, *entry_scope_params))
    duration_by_month = [{'month': r[0], 'totalMinutes': int(r[1])} for r in cur.fetchall()]

    if ombuds_id is None:
        cur.execute("""
            SELECT TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                   COUNT(*) AS count
            FROM cases
            WHERE organization_id = %s
              AND case_kind = 'standard'
              AND created_at >= (%s::date::timestamp AT TIME ZONE 'UTC')
              AND created_at < ((%s::date + 1)::timestamp AT TIME ZONE 'UTC')
            GROUP BY month ORDER BY month
        """, (organization_id, start, end))
    else:
        cur.execute("""
            SELECT TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS month,
                   COUNT(DISTINCT c.id) AS count
            FROM entries e
            JOIN cases c ON c.id = e.case_id
            WHERE e.organization_id = %s
              AND c.case_kind = 'standard'
              AND e.date >= %s AND e.date <= %s
              AND e.ombuds_id = %s
            GROUP BY month ORDER BY month
        """, (organization_id, start, end, ombuds_id))
    cases_by_month = [{'month': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.execute(f"""
        SELECT TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS month,
               COUNT(DISTINCT ep.person_id) AS unique_persons,
               COUNT(ep.person_id) AS total_appearances
        FROM entries e
        JOIN entry_person ep ON ep.entry_id = e.id
        WHERE e.organization_id = %s AND e.date >= %s AND e.date <= %s
        {aliased_entry_scope}
        GROUP BY month ORDER BY month
    """, (organization_id, start, end, *aliased_entry_scope_params))
    persons_by_month = [
        {'month': r[0], 'uniquePersons': r[1], 'totalAppearances': r[2]}
        for r in cur.fetchall()
    ]

    cur.execute(f"""
        SELECT COALESCE(NULLIF(TRIM(p.race), ''), 'Not specified') AS race,
               COUNT(DISTINCT ep.person_id) AS count
        FROM entry_person ep
        JOIN persons p ON p.id = ep.person_id
        JOIN entries e ON e.id = ep.entry_id
        WHERE e.organization_id = %s AND e.date >= %s AND e.date <= %s
        {aliased_entry_scope}
        GROUP BY race ORDER BY count DESC
    """, (organization_id, start, end, *aliased_entry_scope_params))
    persons_by_race = [{'race': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.execute(f"""
        SELECT COALESCE(NULLIF(TRIM(medium), ''), 'Not specified') AS medium,
               COUNT(*) AS count
        FROM entries
        WHERE organization_id = %s AND date >= %s AND date <= %s
        {entry_scope}
        GROUP BY medium ORDER BY count DESC
    """, (organization_id, start, end, *entry_scope_params))
    entries_by_medium = [{'medium': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.execute(f"""
        SELECT COALESCE(NULLIF(TRIM(medium), ''), 'Not specified') AS medium,
               ROUND(AVG(duration)::numeric, 1) AS avg_minutes
        FROM entries
        WHERE organization_id = %s AND date >= %s AND date <= %s AND duration IS NOT NULL
        {entry_scope}
        GROUP BY medium ORDER BY avg_minutes DESC
    """, (organization_id, start, end, *entry_scope_params))
    avg_duration_by_medium = [{'medium': r[0], 'avgMinutes': float(r[1])} for r in cur.fetchall()]

    cur.execute(f"""
        SELECT COALESCE(NULLIF(TRIM(p.primary_role), ''), 'Not specified') AS role,
               COUNT(DISTINCT ep.person_id) AS count
        FROM entry_person ep
        JOIN persons p ON p.id = ep.person_id
        JOIN entries e ON e.id = ep.entry_id
        WHERE e.organization_id = %s AND e.date >= %s AND e.date <= %s
        {aliased_entry_scope}
        GROUP BY role ORDER BY count DESC
    """, (organization_id, start, end, *aliased_entry_scope_params))
    persons_by_role = [{'role': r[0], 'count': r[1]} for r in cur.fetchall()]

    cur.execute(f"""
        SELECT COALESCE(NULLIF(TRIM(p.generation), ''), 'Not specified') AS generation,
               COUNT(DISTINCT ep.person_id) AS count
        FROM entry_person ep
        JOIN persons p ON p.id = ep.person_id
        JOIN entries e ON e.id = ep.entry_id
        WHERE e.organization_id = %s AND e.date >= %s AND e.date <= %s
        {aliased_entry_scope}
        GROUP BY generation ORDER BY count DESC
    """, (organization_id, start, end, *aliased_entry_scope_params))
    persons_by_generation = [{'generation': r[0], 'count': r[1]} for r in cur.fetchall()]

    # Organization status is a current snapshot. Personal status includes each
    # standard case the ombuds worked during the selected period exactly once.
    if ombuds_id is None:
        cur.execute("""
            SELECT COALESCE(NULLIF(TRIM(status), ''), 'unknown') AS status, COUNT(*) AS count
            FROM cases
            WHERE organization_id = %s
              AND case_kind = 'standard'
            GROUP BY status ORDER BY count DESC
        """, (organization_id,))
    else:
        cur.execute("""
            SELECT COALESCE(NULLIF(TRIM(c.status), ''), 'unknown') AS status, COUNT(*) AS count
            FROM cases c
            WHERE c.organization_id = %s
              AND c.case_kind = 'standard'
              AND EXISTS (
                  SELECT 1 FROM entries e
                  WHERE e.case_id = c.id
                    AND e.organization_id = %s
                    AND e.date >= %s AND e.date <= %s
                    AND e.ombuds_id = %s
              )
            GROUP BY status ORDER BY count DESC
        """, (organization_id, organization_id, start, end, ombuds_id))
    cases_by_status = [{'status': r[0], 'count': r[1]} for r in cur.fetchall()]

    # Most common codes across cases (by number of cases carrying each code)
    if ombuds_id is None:
        cur.execute("""
            SELECT code_id::text,
                   org_code.code AS code_label,
                   COUNT(DISTINCT c.id) AS case_count
            FROM cases c
            CROSS JOIN unnest(c.codes) AS code_id
            LEFT JOIN codes org_code ON org_code.id = code_id
            WHERE c.organization_id = %s
              AND c.case_kind = 'standard'
              AND c.created_at >= (%s::date::timestamp AT TIME ZONE 'UTC')
              AND c.created_at < ((%s::date + 1)::timestamp AT TIME ZONE 'UTC')
            GROUP BY code_id, org_code.code
            ORDER BY case_count DESC
            LIMIT 20
        """, (organization_id, start, end))
    else:
        cur.execute("""
            SELECT code_id::text,
                   org_code.code AS code_label,
                   COUNT(DISTINCT c.id) AS case_count
            FROM cases c
            CROSS JOIN unnest(c.codes) AS code_id
            LEFT JOIN codes org_code ON org_code.id = code_id
            WHERE c.organization_id = %s
              AND c.case_kind = 'standard'
              AND EXISTS (
                  SELECT 1 FROM entries e
                  WHERE e.case_id = c.id
                    AND e.organization_id = %s
                    AND e.date >= %s AND e.date <= %s
                    AND e.ombuds_id = %s
              )
            GROUP BY code_id, org_code.code
            ORDER BY case_count DESC
            LIMIT 20
        """, (organization_id, organization_id, start, end, ombuds_id))
    codes_by_case_count = [
        {'codeId': r[0], 'codeLabel': r[1], 'count': r[2]}
        for r in cur.fetchall()
    ]

    # Total contact time attributed to each code (sum of entry durations for cases carrying that code)
    cur.execute(f"""
        SELECT code_id::text,
               org_code.code AS code_label,
               COALESCE(SUM(e.duration), 0) AS total_minutes
        FROM cases c
        CROSS JOIN unnest(c.codes) AS code_id
        JOIN entries e ON e.case_id = c.id
        LEFT JOIN codes org_code ON org_code.id = code_id
        WHERE c.organization_id = %s
          AND c.case_kind = 'standard'
          AND e.date >= %s AND e.date <= %s
          {aliased_entry_scope}
        GROUP BY code_id, org_code.code
        ORDER BY total_minutes DESC
        LIMIT 20
    """, (organization_id, start, end, *aliased_entry_scope_params))
    codes_by_duration = [
        {'codeId': r[0], 'codeLabel': r[1], 'totalMinutes': int(r[2])}
        for r in cur.fetchall()
    ]

    # Codes with the most individual entries
    cur.execute(f"""
        SELECT code_id::text,
               org_code.code AS code_label,
               COUNT(e.id) AS entry_count
        FROM cases c
        CROSS JOIN unnest(c.codes) AS code_id
        JOIN entries e ON e.case_id = c.id
        LEFT JOIN codes org_code ON org_code.id = code_id
        WHERE c.organization_id = %s
          AND c.case_kind = 'standard'
          AND e.date >= %s AND e.date <= %s
          {aliased_entry_scope}
        GROUP BY code_id, org_code.code
        ORDER BY entry_count DESC
        LIMIT 20
    """, (organization_id, start, end, *aliased_entry_scope_params))
    codes_by_entry_count = [
        {'codeId': r[0], 'codeLabel': r[1], 'count': r[2]}
        for r in cur.fetchall()
    ]

    return jsonify({
        'scope': 'my' if ombuds_id is not None else 'organization',
        'entriesByMonth': entries_by_month,
        'durationByMonth': duration_by_month,
        'casesByMonth': cases_by_month,
        'personsByMonth': persons_by_month,
        'personsByRace': persons_by_race,
        'entriesByMedium': entries_by_medium,
        'avgDurationByMedium': avg_duration_by_medium,
        'personsByRole': persons_by_role,
        'personsByGeneration': persons_by_generation,
        'casesByStatus': cases_by_status,
        'codesByCaseCount': codes_by_case_count,
        'codesByDuration': codes_by_duration,
        'codesByEntryCount': codes_by_entry_count,
    })
