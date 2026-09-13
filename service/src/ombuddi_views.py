import logging
from datetime import date
from uuid import UUID

from flask import Blueprint, request, g, jsonify
from connection import get_db_connection, managed_connection
from utils import add_one, get_many, get_one, return_one, update_one

ombuddi_views = Blueprint('ombuddi_views', __name__)
logger = logging.getLogger(__name__)

MAX_REFERRAL_DETAIL_LENGTH = 250


class _ReferralTransactionAbort(Exception):
    """Carry a client response through managed_connection so it rolls back."""

    def __init__(self, response):
        super().__init__('Referral transaction aborted')
        self.response = response

def _org():
    return {'organization_id': g.organization_id}


def _require_owned_reference(table, row_id, label):
    """Return an error response unless row_id belongs to the current tenant."""
    if not row_id:
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': f'Missing {label}',
        }), 400
    if table not in {'cases', 'code_categories'}:
        raise ValueError(f'Unsupported tenant reference table: {table}')

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT 1 FROM {table} WHERE id = %s AND organization_id = %s',
                (row_id, g.organization_id),
            )
            exists = cur.fetchone() is not None
        if not exists:
            return jsonify({
                'success': False,
                'status': '404 error',
                'error': 'Not found',
            }), 404
        return None
    except Exception:
        logger.exception('Failed to validate tenant-owned %s reference', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': f'Unable to validate {label}',
        }), 500
    finally:
        if conn:
            conn.close()


def _require_writable_case_reference(row_id, label='caseId'):
    """Allow shared standard cases, but only the owner's General container."""
    if not row_id:
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': f'Missing {label}',
        }), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM cases
                WHERE id = %s
                  AND organization_id = %s
                  AND (case_kind = 'standard' OR owner_ombuds_id = %s)
                """,
                (row_id, g.organization_id, g.ombuds_id),
            )
            exists = cur.fetchone() is not None
        if not exists:
            return jsonify({
                'success': False,
                'status': '404 error',
                'error': 'Not found',
            }), 404
        return None
    except Exception:
        logger.exception('Failed to validate writable case reference')
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': f'Unable to validate {label}',
        }), 500
    finally:
        if conn:
            conn.close()


def _entry_input_error(message):
    return jsonify({
        'success': False,
        'status': 'input error',
        'error': message,
    }), 400


def _normalized_uuid_list(values, label):
    if values is None:
        return [], None
    if not isinstance(values, list):
        return None, _entry_input_error(f'{label} must be a list')
    try:
        normalized = [str(UUID(str(value))) for value in values]
    except (ValueError, TypeError, AttributeError):
        return None, _entry_input_error(f'{label} contains an invalid id')
    return list(dict.fromkeys(normalized)), None


def _reject_foreign_code_references(code_ids):
    """Reject DB-backed code ids owned by another tenant.

    IDs absent from the codes table remain valid because IOA reference codes
    intentionally live in application code rather than in Postgres.
    """
    if not isinstance(code_ids, list):
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'codes must be a list',
        }), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM codes
                WHERE id = ANY(%s::uuid[])
                  AND organization_id <> %s
                LIMIT 1
                """,
                (code_ids, g.organization_id),
            )
            has_foreign_code = cur.fetchone() is not None
        if has_foreign_code:
            return jsonify({
                'success': False,
                'status': '404 error',
                'error': 'Not found',
            }), 404
        return None
    except Exception:
        logger.exception('Failed to validate case code ownership')
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'Invalid code identifiers',
        }), 400
    finally:
        if conn:
            conn.close()

case_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'caseKind': 'case_kind',
    'ownerOmbudsId': 'owner_ombuds_id',
    'createdByOmbudsId': 'created_by_ombuds_id',
    'name': 'name',
    'description': 'description',
    'codes': 'codes',
    'status': 'status',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
}

CASE_SELECT_COLUMNS = ', '.join(case_model.values())


def _referral_input_error(message):
    return jsonify({
        'success': False,
        'status': 'input error',
        'error': message,
    }), 400


def _normalize_referral_sources(value):
    if value is None:
        return [], None
    if not isinstance(value, list):
        return None, _referral_input_error('referralSources must be a list')

    normalized = []
    seen = set()
    for item in value:
        if not isinstance(item, dict) or not isinstance(item.get('id'), str):
            return None, _referral_input_error('Each referral source must include an id')
        source_id = item['id'].strip()
        try:
            source_id = str(UUID(source_id))
        except (ValueError, TypeError):
            return None, _referral_input_error('Invalid referral source id')
        if source_id in seen:
            return None, _referral_input_error('Referral sources cannot be selected twice')
        seen.add(source_id)

        detail = item.get('detail')
        if detail is not None and not isinstance(detail, str):
            return None, _referral_input_error('Referral source detail must be text')
        detail = detail.strip() if isinstance(detail, str) else None
        detail = detail or None
        if detail and len(detail) > MAX_REFERRAL_DETAIL_LENGTH:
            return None, _referral_input_error(
                f'Referral source detail cannot exceed {MAX_REFERRAL_DETAIL_LENGTH} characters'
            )
        normalized.append({'id': source_id, 'detail': detail})

    return normalized, None


def _validate_referral_sources(cur, referral_sources):
    if not referral_sources:
        return None

    source_ids = [item['id'] for item in referral_sources]
    cur.execute(
        """
        SELECT id, behavior
        FROM picklists
        WHERE id = ANY(%s::uuid[])
          AND organization_id = %s
          AND kind = 'referral_source'
          AND soft_delete = FALSE
        """,
        (source_ids, g.organization_id),
    )
    available = {str(row[0]): row[1] for row in cur.fetchall()}
    if len(available) != len(source_ids):
        return jsonify({
            'success': False,
            'status': '404 error',
            'error': 'Referral source not found',
        }), 404

    if len(referral_sources) > 1 and any(available[item['id']] == 'exclusive' for item in referral_sources):
        return _referral_input_error('The exclusive referral source cannot be combined with other sources')

    for item in referral_sources:
        behavior = available[item['id']]
        if behavior == 'other_detail' and not item['detail']:
            return _referral_input_error('Please specify the Other referral source')
        if behavior != 'other_detail' and item['detail']:
            return _referral_input_error('Only the Other referral source accepts detail')

    return None


def _insert_referral_sources(cur, case_id, referral_sources):
    for item in referral_sources:
        cur.execute(
            """
            INSERT INTO case_referral_sources (
                case_id, organization_id, referral_source_id, detail
            ) VALUES (%s, %s, %s, %s)
            """,
            (case_id, g.organization_id, item['id'], item['detail']),
        )

@ombuddi_views.route('/api/v1/create_case', methods=['POST'])
def create_case():
    payload = request.get_json(silent=True) or {}
    if 'codes' in payload:
        error = _reject_foreign_code_references(payload.get('codes'))
        if error:
            return error

    referral_sources, error = _normalize_referral_sources(payload.get('referralSources'))
    if error:
        return error

    name = payload.get('name')
    if not isinstance(name, str) or not name.strip():
        return _referral_input_error('Case name is required')
    description = payload.get('description', '')
    status = payload.get('status', 'active')
    codes = payload.get('codes', [])
    if not isinstance(description, str) or not isinstance(status, str):
        return _referral_input_error('Invalid case details')

    case_id = payload.get('id')
    if case_id is not None:
        try:
            case_id = str(UUID(str(case_id)))
        except (ValueError, TypeError):
            return _referral_input_error('Invalid case id')

    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                error = _validate_referral_sources(cur, referral_sources)
                if error:
                    raise _ReferralTransactionAbort(error)
                cur.execute(
                    """
                    INSERT INTO cases (
                        id, organization_id, created_by_ombuds_id,
                        name, description, codes, status
                    )
                    VALUES (COALESCE(%s::uuid, gen_random_uuid()), %s, %s, %s, %s, %s::uuid[], %s)
                    RETURNING id
                    """,
                    (case_id, g.organization_id, g.ombuds_id, name.strip(), description, codes, status),
                )
                new_id = cur.fetchone()[0]
                _insert_referral_sources(cur, new_id, referral_sources)
        return jsonify({'success': True, 'status': 'success', 'id': new_id}), 200
    except _ReferralTransactionAbort as abort:
        return abort.response
    except Exception:
        logger.exception('Failed to create case with referral sources')
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to save the case',
        }), 500


@ombuddi_views.route('/api/v1/get_case_referral_sources/<case_id>')
def get_case_referral_sources(case_id):
    try:
        UUID(case_id)
    except (ValueError, TypeError):
        return _referral_input_error('Invalid case id')

    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT 1 FROM cases WHERE id = %s AND organization_id = %s',
                    (case_id, g.organization_id),
                )
                if cur.fetchone() is None:
                    return jsonify({'error': 'Not found', 'message': 'Case not found'}), 404
                cur.execute(
                    """
                    SELECT picklists.id, picklists.name, picklists.behavior, case_referral_sources.detail
                    FROM case_referral_sources
                    JOIN picklists
                      ON picklists.id = case_referral_sources.referral_source_id
                     AND picklists.organization_id = case_referral_sources.organization_id
                    WHERE case_referral_sources.case_id = %s
                      AND case_referral_sources.organization_id = %s
                    ORDER BY picklists.index, picklists.name
                    """,
                    (case_id, g.organization_id),
                )
                rows = cur.fetchall()
        return jsonify([
            {
                'id': str(row[0]),
                'name': row[1],
                'behavior': row[2],
                'detail': row[3],
            }
            for row in rows
        ])
    except Exception:
        logger.exception('Failed to load case referral sources')
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to load referral sources',
        }), 500


@ombuddi_views.route('/api/v1/update_case_referral_sources', methods=['PUT'])
def update_case_referral_sources():
    payload = request.get_json(silent=True) or {}
    case_id = payload.get('caseId')
    try:
        case_id = str(UUID(str(case_id)))
    except (ValueError, TypeError):
        return _referral_input_error('Invalid case id')

    referral_sources, error = _normalize_referral_sources(payload.get('referralSources'))
    if error:
        return error

    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT case_kind FROM cases WHERE id = %s AND organization_id = %s FOR UPDATE',
                    (case_id, g.organization_id),
                )
                case_row = cur.fetchone()
                if case_row is None:
                    raise _ReferralTransactionAbort(
                        (jsonify({'error': 'Not found', 'message': 'Case not found'}), 404)
                    )
                if case_row[0] == 'general':
                    raise _ReferralTransactionAbort(
                        (_referral_input_error('General activity does not use referral sources'))
                    )
                error = _validate_referral_sources(cur, referral_sources)
                if error:
                    raise _ReferralTransactionAbort(error)
                cur.execute(
                    'DELETE FROM case_referral_sources WHERE case_id = %s AND organization_id = %s',
                    (case_id, g.organization_id),
                )
                _insert_referral_sources(cur, case_id, referral_sources)
        return jsonify({'success': True, 'status': 'success'}), 200
    except _ReferralTransactionAbort as abort:
        return abort.response
    except Exception:
        logger.exception('Failed to update case referral sources')
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to save referral sources',
        }), 500

@ombuddi_views.route('/api/v1/get_case_by_id/<id>')
def get_case_by_id(id):
    return get_one('cases', case_model, {'id': id}, owner_constraint=_org())


@ombuddi_views.route('/api/v1/get_general_activity_case')
def get_general_activity_case():
    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT {CASE_SELECT_COLUMNS}
                    FROM cases
                    WHERE organization_id = %s
                      AND owner_ombuds_id = %s
                      AND case_kind = 'general'
                    """,
                    (g.organization_id, g.ombuds_id),
                )
                row = cur.fetchone()
        return jsonify(None) if row is None else return_one(case_model, row)
    except Exception:
        logger.exception('Failed to load General activity case')
        return jsonify({
            'error': 'Database error',
            'message': 'Unable to load General activity',
        }), 500


@ombuddi_views.route('/api/v1/general_activity_case', methods=['POST'])
def ensure_general_activity_case():
    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO cases (
                        organization_id, case_kind, owner_ombuds_id, created_by_ombuds_id,
                        name, description, codes, status
                    ) VALUES (%s, 'general', %s, %s, 'General activity', '', '{}', 'active')
                    ON CONFLICT (owner_ombuds_id) WHERE case_kind = 'general'
                    DO NOTHING
                    RETURNING id
                    """,
                    (g.organization_id, g.ombuds_id, g.ombuds_id),
                )
                row = cur.fetchone()
                if row is None:
                    cur.execute(
                        """
                        SELECT id FROM cases
                        WHERE organization_id = %s
                          AND owner_ombuds_id = %s
                          AND case_kind = 'general'
                        """,
                        (g.organization_id, g.ombuds_id),
                    )
                    row = cur.fetchone()
        return jsonify({'success': True, 'status': 'success', 'id': row[0]}), 200
    except Exception:
        logger.exception('Failed to create General activity case')
        return jsonify({
            'error': 'Database error',
            'message': 'Unable to open General activity',
        }), 500

@ombuddi_views.route('/api/v1/get_all_cases')
def get_all_cases():
    return get_many(
        'cases',
        case_model,
        {'status': 'active', 'case_kind': 'standard'},
        owner_constraint=_org(),
    )

@ombuddi_views.route('/api/v1/get_cases_by_status/<status>')
def get_cases_by_status(status):
    return get_many(
        'cases',
        case_model,
        {'status': status, 'case_kind': 'standard'},
        owner_constraint=_org(),
    )

@ombuddi_views.route('/api/v1/update_case', methods=['PUT'])
def update_case():
    payload = request.get_json(silent=True) or {}
    if 'codes' in payload:
        error = _reject_foreign_code_references(payload.get('codes'))
        if error:
            return error
    return update_one(
        'cases',
        case_model,
        request,
        owner_constraint={**_org(), 'case_kind': 'standard'},
        immutable_columns={'case_kind', 'owner_ombuds_id', 'created_by_ombuds_id'},
    )


organization_model = {
    'id': 'id',
    'name': 'name'
}

@ombuddi_views.route('/api/v1/get_current_organization')
def get_current_organization():
    # Organizations don't carry organization_id themselves — id IS the org.
    return get_one('organizations', organization_model, {'id': g.organization_id})

@ombuddi_views.route('/api/v1/update_organization', methods=['PUT'])
def update_organization():
    return update_one(
        'organizations',
        organization_model,
        request,
        owner_constraint={'id': g.organization_id},
    )

ombuds_model = {
    'id': 'id',
    'name': 'name',
    'email': 'email',
    'isAdmin': 'is_admin',
    'isSystemAdmin': 'is_system_admin',
    'personAvatarStyle': 'person_avatar_style',
    'organizationId': 'organization_id',
}

@ombuddi_views.route('/api/v1/get_current_ombuds')
def get_current_ombuds():
    return get_one('ombuds', ombuds_model, {'id': g.ombuds_id}, owner_constraint=_org())


@ombuddi_views.route('/api/v1/update_current_ombuds', methods=['PUT'])
def update_current_ombuds():
    payload = request.get_json(silent=True) or {}
    updates = []
    values = []

    if 'name' in payload:
        raw_name = payload.get('name')
        name = raw_name.strip() if isinstance(raw_name, str) else ''
        if not name:
            return jsonify({
                'error': 'Input error',
                'message': 'Name is required',
            }), 400
        if len(name) > 200:
            return jsonify({
                'error': 'Input error',
                'message': 'Name must be 200 characters or fewer',
            }), 400
        updates.append('name = %s')
        values.append(name)

    if 'personAvatarStyle' in payload:
        avatar_style = payload.get('personAvatarStyle')
        if avatar_style not in {'monster', 'geometric'}:
            return jsonify({
                'error': 'Input error',
                'message': 'Person avatar style must be monster or geometric',
            }), 400
        updates.append('person_avatar_style = %s')
        values.append(avatar_style)

    if not updates:
        return jsonify({
            'error': 'Input error',
            'message': 'No profile fields supplied',
        }), 400

    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE ombuds
                    SET {', '.join(updates)}
                    WHERE id = %s AND organization_id = %s
                    RETURNING name, person_avatar_style
                    """,
                    (*values, g.ombuds_id, g.organization_id),
                )
                updated = cur.fetchone()
        if updated is None:
            return jsonify({'error': 'Not found', 'message': 'Ombuddi profile not found'}), 404
        return jsonify({
            'success': True,
            'name': updated[0],
            'personAvatarStyle': updated[1],
        }), 200
    except Exception:
        logger.exception('Failed to update current Ombuddi profile')
        return jsonify({
            'error': 'Database error',
            'message': 'Unable to update your profile',
        }), 500

code_category_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'name': 'name',
    'softDelete': 'soft_delete',
    'index': 'index',
}

@ombuddi_views.route('/api/v1/get_code_categories_by_organization_id/<id>')
def get_code_categories_by_organization_id(id):
    return get_many('code_categories', code_category_model,
                    {'soft_delete': False}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/add_code_category', methods=['POST'])
def add_code_category():
    return add_one('code_categories', code_category_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/update_code_category', methods=['PUT'])
def update_code_category():
    return update_one('code_categories', code_category_model, request, owner_constraint=_org())

code_model = {
    'id': 'id',
    'categoryId': 'category_id',
    'organizationId': 'organization_id',
    'softDelete': 'soft_delete',
    'code': 'code',
    'description': 'description'
}

@ombuddi_views.route('/api/v1/get_codes_by_category_id/<id>')
def get_codes_by_category_id(id):
    return get_many('codes', code_model, {'category_id': id, 'soft_delete': False},
                    owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_codes_by_organization_id/<id>')
def get_codes_by_organization_id(id):
    return get_many('codes', code_model, {'soft_delete': False}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/add_code', methods=['POST'])
def add_code():
    payload = request.get_json(silent=True) or {}
    error = _require_owned_reference('code_categories', payload.get('categoryId'), 'categoryId')
    if error:
        return error
    return add_one('codes', code_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/update_code', methods=['PUT'])
def update_code():
    payload = request.get_json(silent=True) or {}
    if 'categoryId' in payload:
        error = _require_owned_reference('code_categories', payload.get('categoryId'), 'categoryId')
        if error:
            return error
    return update_one('codes', code_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_code_by_id/<id>')
def get_code_by_id(id):
    return get_one('codes', code_model, {'id': id}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_all_codes_by_organization_id/<code>')
def get_all_codes_by_organization_id(code):
    return get_many('codes', code_model, {}, owner_constraint=_org())

primary_role_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'name': 'name',
    'index': 'index',
    'softDelete': 'soft_delete'
}

@ombuddi_views.route('/api/v1/get_primary_roles_by_organization_id/<id>')
def get_primary_roles_by_organization_id(id):
    return get_many('primary_roles', primary_role_model,
                    {'soft_delete': False}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_primary_role_by_id/<id>')
def get_primary_role_by_id(id):
    return get_one('primary_roles', primary_role_model, {'id': id}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/add_primary_role', methods=['POST'])
def add_primary_role():
    return add_one('primary_roles', primary_role_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/update_primary_role', methods=['PUT'])
def update_primary_role():
    return update_one('primary_roles', primary_role_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_all_primary_roles_by_organization_id/<id>')
def get_all_primary_roles_by_organization_id(id):
    return get_many('primary_roles', primary_role_model, {}, owner_constraint=_org())


entry_model = {
    'id': 'id',
    'caseId': 'case_id',
    'ombudsId': 'ombuds_id',
    'organizationId': 'organization_id',
    'date': 'date',
    'medium': 'medium',
    'duration': 'duration',
    'notes': 'notes',
}

@ombuddi_views.route('/api/v1/get_entry_by_id/<id>')
def get_entry_by_id(id):
    return get_one('entries', entry_model, {'id': id}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/add_entry', methods=['POST'])
def add_entry():
    payload = request.get_json(silent=True) or {}
    try:
        case_id = str(UUID(str(payload.get('caseId'))))
    except (ValueError, TypeError, AttributeError):
        return _entry_input_error('Invalid caseId')

    event_date = payload.get('date')
    try:
        date.fromisoformat(event_date)
    except (ValueError, TypeError):
        return _entry_input_error('date must use YYYY-MM-DD')

    medium = payload.get('medium', 'inPerson')
    duration = payload.get('duration', 0)
    notes = payload.get('notes', '')
    if not isinstance(medium, str) or not isinstance(notes, str):
        return _entry_input_error('Invalid entry details')
    if isinstance(duration, bool) or not isinstance(duration, int) or duration < 0:
        return _entry_input_error('duration must be a non-negative whole number')

    person_ids, error = _normalized_uuid_list(payload.get('personIds'), 'personIds')
    if error:
        return error

    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT case_kind, owner_ombuds_id
                    FROM cases
                    WHERE id = %s AND organization_id = %s
                    FOR KEY SHARE
                    """,
                    (case_id, g.organization_id),
                )
                case_row = cur.fetchone()
                if case_row is None or (
                    case_row[0] == 'general'
                    and str(case_row[1]) != str(g.ombuds_id)
                ):
                    return jsonify({
                        'success': False,
                        'status': '404 error',
                        'error': 'Not found',
                    }), 404

                if person_ids:
                    cur.execute(
                        """
                        SELECT id::text
                        FROM persons
                        WHERE organization_id = %s
                          AND id = ANY(%s::uuid[])
                        FOR KEY SHARE
                        """,
                        (g.organization_id, person_ids),
                    )
                    found_person_ids = {row[0] for row in cur.fetchall()}
                    if found_person_ids != set(person_ids):
                        return jsonify({
                            'success': False,
                            'status': '404 error',
                            'error': 'One or more people were not found',
                        }), 404

                cur.execute(
                    """
                    INSERT INTO entries (
                        case_id, ombuds_id, organization_id,
                        date, medium, duration, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        case_id,
                        g.ombuds_id,
                        g.organization_id,
                        event_date,
                        medium,
                        duration,
                        notes,
                    ),
                )
                entry_id = cur.fetchone()[0]
                for person_id in person_ids:
                    cur.execute(
                        """
                        INSERT INTO entry_person (entry_id, person_id)
                        VALUES (%s, %s)
                        """,
                        (entry_id, person_id),
                    )
        return jsonify({'success': True, 'status': 'success', 'id': entry_id}), 200
    except Exception:
        logger.exception('Failed to create entry with people')
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to save the entry',
        }), 500

@ombuddi_views.route('/api/v1/get_entries_by_case_id/<case_id>')
def get_entries_by_case_id(case_id):
    return get_many('entries', entry_model, {'case_id': case_id}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/update_entry', methods=['PUT'])
def update_entry():
    payload = request.get_json(silent=True) or {}
    if 'date' in payload:
        try:
            date.fromisoformat(payload['date'])
        except (ValueError, TypeError):
            return _entry_input_error('date must use YYYY-MM-DD')
    if 'duration' in payload:
        duration = payload['duration']
        if isinstance(duration, bool) or not isinstance(duration, int) or duration < 0:
            return _entry_input_error('duration must be a non-negative whole number')
    if 'medium' in payload and not isinstance(payload['medium'], str):
        return _entry_input_error('medium must be text')
    if 'notes' in payload and not isinstance(payload['notes'], str):
        return _entry_input_error('notes must be text')
    if 'caseId' in payload:
        error = _require_writable_case_reference(payload.get('caseId'))
        if error:
            return error
    return update_one(
        'entries',
        entry_model,
        request,
        owner_constraint={
            'organization_id': g.organization_id,
            'ombuds_id': g.ombuds_id,
        },
        immutable_columns={'ombuds_id'},
    )
