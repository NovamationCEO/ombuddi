import logging

from flask import Blueprint, request, g, jsonify
from connection import get_db_connection, managed_connection
from utils import add_one, get_many, update_one

logger = logging.getLogger(__name__)


UNIVERSAL_REFERRAL_SOURCES = (
    ('Other (please specify)', 10000, 'other_detail'),
    ('Unknown', 10001, 'exclusive'),
)


def _ensure_universal_referral_sources():
    """Repair missing application-managed referral choices for this tenant."""
    values = []
    placeholders = []
    for name, index, behavior in UNIVERSAL_REFERRAL_SOURCES:
        placeholders.append('(%s, %s, %s, %s, %s, FALSE, %s)')
        values.extend((g.organization_id, 'referral_source', name, '', index, behavior))

    sql = f'''
        INSERT INTO picklists (
            organization_id, kind, name, description, index, soft_delete, behavior
        )
        VALUES {', '.join(placeholders)}
        ON CONFLICT (organization_id, kind, name) WHERE soft_delete = FALSE
        DO UPDATE SET
            behavior = EXCLUDED.behavior,
            index = EXCLUDED.index
        WHERE picklists.behavior IS DISTINCT FROM EXCLUDED.behavior
           OR picklists.index IS DISTINCT FROM EXCLUDED.index
    '''

    with managed_connection(get_db_connection) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, values)


def _org():
    return {'organization_id': g.organization_id}

# See service/schema.sql for the rationale on a single generic table vs.
# per-list tables (mediums / priorities / etc.). Frontend filters by `kind`.

picklist_views = Blueprint('picklist_views', __name__)

picklist_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'kind': 'kind',
    'name': 'name',
    'description': 'description',
    'behavior': 'behavior',
    'index': 'index',
    'softDelete': 'soft_delete',
}


@picklist_views.route('/api/v1/get_picklists_by_organization_id/<organization_id>')
def get_picklists_by_organization_id(organization_id):
    try:
        _ensure_universal_referral_sources()
    except Exception:
        logger.exception('Failed to ensure universal referral sources')
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to load referral sources',
        }), 500
    return get_many('picklists', picklist_model, {'soft_delete': False}, owner_constraint=_org())


@picklist_views.route('/api/v1/add_picklist', methods=['POST'])
def add_picklist():
    payload = request.get_json(silent=True) or {}
    if payload.get('behavior', 'standard') != 'standard':
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'Universal referral sources are managed by the application',
        }), 400
    return add_one('picklists', picklist_model, request, owner_constraint=_org())


@picklist_views.route('/api/v1/update_picklist', methods=['PUT'])
def update_picklist():
    payload = request.get_json(silent=True) or {}
    row_id = payload.get('id')
    if row_id:
        try:
            with managed_connection(get_db_connection) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        '''
                        SELECT behavior
                        FROM picklists
                        WHERE id = %s AND organization_id = %s
                        ''',
                        (row_id, g.organization_id),
                    )
                    row = cur.fetchone()
        except Exception:
            logger.exception('Failed to check picklist behavior')
            return jsonify({
                'success': False,
                'status': 'db error',
                'error': 'Database error',
                'message': 'Unable to update the referral source',
            }), 500

        if row is None:
            return jsonify({
                'success': False,
                'status': '404 error',
                'error': 'Not found',
            }), 404
        if row[0] != 'standard':
            return jsonify({
                'success': False,
                'status': 'input error',
                'error': 'Universal referral sources cannot be modified',
            }), 400

    if payload.get('behavior', 'standard') != 'standard':
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'Universal referral sources are managed by the application',
        }), 400
    return update_one('picklists', picklist_model, request, owner_constraint=_org())
