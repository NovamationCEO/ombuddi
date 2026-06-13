from flask import Blueprint, request, jsonify
from src.connection import get_db_connection
from utils import add_one, get_many, get_one, return_many, update_one, remove_one
from hash_name import hash_name
import logging

logger = logging.getLogger(__name__)

person_views = Blueprint('person_views', __name__)

person_model = {
    'id': 'id',
    'hashedName': 'hashed_name',
    'publicName': 'public_name',
    'isPublic': 'is_public',
    'gender': 'gender',
    'generation': 'generation',
    'race': 'race',
    'primaryRole': 'primary_role',
    'isInternational': 'is_international',
    'category1': 'category_1',
    'category2': 'category_2',
    'category3': 'category_3',
    'organizationId': 'organization_id',
}

@person_views.before_request
def _salt_name():
    #  Does not target URL params
    payload = request.get_json(silent=True) or {}
    if 'hashedName' in payload:
        payload['hashedName'] = hash_name(payload['hashedName'])
        request._cached_json = {
            False: payload,
            True:  payload,
        }

@person_views.route('/api/v1/get_person_by_id/<person_id>')
def get_person_by_id(person_id):
    constraints = {'id': person_id}
    return get_one('persons', person_model, constraints)

@person_views.route('/api/v1/get_persons_by_hashed_name/<raw_hash>')
def get_persons_by_hashed_name(raw_hash):
    final_hash = hash_name(raw_hash)
    return get_many('persons', person_model, {'hashed_name': final_hash})

@person_views.route('/api/v1/add_person', methods=['POST'])
def add_person():
    return add_one('persons', person_model, request)

@person_views.route('/api/v1/update_person', methods=['PUT'])
def update_person():
    return update_one('persons', person_model, request)

@person_views.route('/api/v1/get_persons_by_organization_id/<organization_id>')
def get_persons_by_organization_id(organization_id):
    constraints = {'organization_id': organization_id}
    return get_many('persons', person_model, constraints)

@person_views.route('/api/v1/get_public_persons_by_organization_id/<organization_id>')
def get_public_persons_by_organization_id(organization_id):
    constraints = {'organization_id': organization_id, 'is_public': True}
    return get_many('persons', person_model, constraints)

@person_views.route('/api/v1/delete_person', methods=['DELETE'])
def delete_person():
    return remove_one('persons', request)

def _get_persons_by_sql(sql: str, params: tuple):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                return return_many(person_model, rows)
    except Exception as e:
        logger.exception("Person query failed")
        return (
            jsonify(
                {
                    "success": False,
                    "status": "db error",
                    "error": "Database error",
                    "message": str(e),
                }
            ),
            500,
        )

SQL_PERSONS_BY_CASE_ID = """
    SELECT p.*
    FROM persons p
    WHERE EXISTS (
        SELECT 1
        FROM entry_person ep
        JOIN entries e ON e.id = ep.entry_id
        WHERE e.case_id = %s
          AND ep.person_id = p.id
    )
    ORDER BY p.id;
"""

SQL_PERSONS_BY_ENTRY_ID = """
    SELECT p.*
    FROM persons p
    WHERE EXISTS (
        SELECT 1
        FROM entry_person ep
        WHERE ep.entry_id = %s
          AND ep.person_id = p.id
    )
    ORDER BY p.id;
"""

@person_views.route("/api/v1/get_persons_by_case_id/<case_id>")
def get_persons_by_case_id(case_id):
    return _get_persons_by_sql(SQL_PERSONS_BY_CASE_ID, (case_id,))

@person_views.route("/api/v1/get_persons_by_entry_id/<entry_id>")
def get_persons_by_entry_id(entry_id):
    return _get_persons_by_sql(SQL_PERSONS_BY_ENTRY_ID, (entry_id,))


# ---------------------------------------------------------------------------
# entry_person join: attach / detach a person to / from a specific entry.
# Inline SQL because the join table has a composite PK (no `id` column) so
# the generic add_one helper in utils.py doesn't fit.
# ---------------------------------------------------------------------------

SQL_ADD_ENTRY_PERSON = """
    INSERT INTO entry_person (entry_id, person_id)
    VALUES (%s, %s)
    ON CONFLICT (entry_id, person_id) DO NOTHING;
"""

SQL_REMOVE_ENTRY_PERSON = """
    DELETE FROM entry_person
    WHERE entry_id = %s AND person_id = %s;
"""


def _exec_entry_person(sql: str, entry_id, person_id):
    if not entry_id or not person_id:
        return (
            jsonify(
                {
                    "success": False,
                    "status": "input error",
                    "error": "Missing entryId or personId",
                }
            ),
            400,
        )
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (entry_id, person_id))
        return jsonify({"success": True, "status": "success"}), 200
    except Exception as e:
        logger.exception("entry_person mutation failed")
        return (
            jsonify(
                {
                    "success": False,
                    "status": "db error",
                    "error": "Database error",
                    "message": str(e),
                }
            ),
            500,
        )


@person_views.route("/api/v1/add_entry_person", methods=["POST"])
def add_entry_person():
    data = request.get_json(silent=True) or {}
    return _exec_entry_person(SQL_ADD_ENTRY_PERSON, data.get("entryId"), data.get("personId"))


@person_views.route("/api/v1/remove_entry_person", methods=["DELETE"])
def remove_entry_person():
    data = request.get_json(silent=True) or {}
    return _exec_entry_person(SQL_REMOVE_ENTRY_PERSON, data.get("entryId"), data.get("personId"))
