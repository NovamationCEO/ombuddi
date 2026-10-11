from flask import Blueprint, request, jsonify, g
from src.connection import get_db_connection, managed_connection
from utils import get_many, get_one, return_many, update_one
from hash_name import hash_name
from src.entry_roles import valid_entry_role
import logging

logger = logging.getLogger(__name__)

person_views = Blueprint('person_views', __name__)

person_model = {
    'id': 'id',
    'monsterSeed': 'monster_seed',
    'monsterVersion': 'monster_version',
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

# The portrait fields are database-generated and never accepted from clients.
# They remain in the read model above so every person response can render the
# same portrait, while the write model prevents choosing another person's
# seed or changing an established appearance.
person_write_model = {
    key: column
    for key, column in person_model.items()
    if key not in {'monsterSeed', 'monsterVersion'}
}

# Queries below must select columns in the model's order.  SELECT * is unsafe
# here because ALTER TABLE appends columns, so upgraded and freshly-created
# databases can have different physical column orders.
PERSON_SELECT_COLUMNS = ', '.join(f'p.{column}' for column in person_model.values())


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

def _org():
    return {'organization_id': g.organization_id}

@person_views.route('/api/v1/get_person_by_id/<person_id>')
def get_person_by_id(person_id):
    return get_one('persons', person_model, {'id': person_id}, owner_constraint=_org())

@person_views.route('/api/v1/get_persons_by_hashed_name/<raw_hash>')
def get_persons_by_hashed_name(raw_hash):
    final_hash = hash_name(raw_hash)
    return get_many('persons', person_model, {'hashed_name': final_hash}, owner_constraint=_org())

@person_views.route('/api/v1/add_person', methods=['POST'])
def add_person():
    data = request.get_json(silent=True) or {}
    is_public = data.get('isPublic') is True
    identity_key = 'publicName' if is_public else 'hashedName'
    identity = data.get(identity_key)
    if not isinstance(identity, str) or not identity.strip():
        return jsonify({'success': False, 'message': 'A person identity is required.'}), 400
    # hashedName already received the server pepper in before_request.
    fields = {key: value for key, value in data.items() if key in person_write_model
              and key not in {'id', 'organizationId', 'hashedName', 'publicName', 'isPublic'}}
    fields.update({identity_key: identity, 'isPublic': is_public, 'organizationId': g.organization_id})
    columns = ', '.join(person_write_model[key] for key in fields)
    placeholders = ', '.join(['%s'] * len(fields))
    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                if _duplicate_person(cur, person_model[identity_key], identity):
                    return _duplicate_response()
                cur.execute(f"INSERT INTO persons ({columns}) VALUES ({placeholders}) "
                            "RETURNING id, monster_seed, monster_version", list(fields.values()))
                person_id, seed, version = cur.fetchone()
        return jsonify({'success': True, 'status': 'success', 'id': person_id,
                        'monsterSeed': seed, 'monsterVersion': version}), 200
    except Exception:
        logger.exception('add_person failed')
        return jsonify({'success': False, 'message': 'Unable to add person'}), 500


def _duplicate_person(cur, identity_column, identity, exclude_id=None):
    # Serialize competing creates/phrase changes for this org and identity.
    # Preserve existing same-name records without adding accidental duplicates.
    cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                (f"{g.organization_id}:{identity_column}:{identity}",))
    cur.execute(
        f"SELECT 1 FROM persons WHERE organization_id = %s AND {identity_column} = %s "
        "AND (%s::uuid IS NULL OR id <> %s::uuid) LIMIT 1",
        (g.organization_id, identity, exclude_id, exclude_id),
    )
    return cur.fetchone() is not None


def _duplicate_response():
    return jsonify({'success': False, 'message': 'A matching person already exists. Find and select their card.'}), 409

@person_views.route('/api/v1/update_person', methods=['PUT'])
def update_person():
    data = request.get_json(silent=True) or {}
    current_client_hash = data.get('currentHashedName')
    if not isinstance(current_client_hash, str) or not current_client_hash:
        # Public contacts have no phrase. This WHERE clause excludes private
        # people even when a client submits isPublic=true to bypass verification.
        return update_one(
            'persons', person_model, request,
            owner_constraint={**_org(), 'is_public': True},
            immutable_columns={'monster_seed', 'monster_version', 'hashed_name', 'is_public'},
        )
    person_id = data.get('id')
    if not person_id:
        return jsonify({'success': False, 'message': 'Missing person.'}), 400
    allowed = {'gender', 'generation', 'race', 'primaryRole', 'isInternational', 'category1', 'category2', 'category3'}
    fields = {person_model[key]: value for key, value in data.items() if key in allowed and value is not None}
    new_client_hash = data.get('newHashedName')
    if new_client_hash is not None:
        if not isinstance(new_client_hash, str) or not new_client_hash:
            return jsonify({'success': False, 'message': 'The new name and phrase are required.'}), 400
        fields['hashed_name'] = hash_name(new_client_hash)
    if not fields:
        return jsonify({'success': False, 'message': 'No changes supplied.'}), 400
    current_hash = hash_name(current_client_hash)
    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                # Keep verification and all changes in the same transaction.
                cur.execute("SELECT 1 FROM persons WHERE id = %s AND organization_id = %s "
                            "AND is_public = FALSE AND hashed_name = %s FOR UPDATE",
                            (person_id, g.organization_id, current_hash))
                if cur.fetchone() is None:
                    return jsonify({'success': False, 'message': 'The full name and phrase no longer match this person.'}), 403
                if 'hashed_name' in fields and _duplicate_person(cur, 'hashed_name', fields['hashed_name'], person_id):
                    return _duplicate_response()
                assignments = ', '.join(f'{column} = %s' for column in fields)
                cur.execute(f"UPDATE persons SET {assignments} WHERE id = %s AND organization_id = %s",
                            [*fields.values(), person_id, g.organization_id])
        return jsonify({'success': True, 'message': 'Person updated.'}), 200
    except Exception:
        logger.exception('update_person failed')
        return jsonify({'success': False, 'message': 'Unable to update person'}), 500


@person_views.route('/api/v1/change_person_name_phrase', methods=['PUT'])
def change_person_name_phrase():
    """Replace a private person's lookup hash after verifying the current one.

    Both values are already first-pass hashes from the browser. The server adds
    NAME_SALT to each, then performs one conditional UPDATE so verification and
    replacement cannot be separated by a race or bypassed through update_person.
    """
    data = request.get_json(silent=True) or {}
    person_id = data.get('id')
    current_client_hash = data.get('currentHashedName')
    new_client_hash = data.get('newHashedName')
    if not all(isinstance(value, str) and value for value in (person_id, current_client_hash, new_client_hash)):
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'Missing person or name hashes',
        }), 400

    current_hash = hash_name(current_client_hash)
    new_hash = hash_name(new_client_hash)
    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE persons
                    SET hashed_name = %s
                    WHERE id = %s
                      AND organization_id = %s
                      AND is_public = FALSE
                      AND hashed_name = %s
                    """,
                    (new_hash, person_id, g.organization_id, current_hash),
                )
                if cur.rowcount != 1:
                    return jsonify({
                        'success': False,
                        'status': 'verification failed',
                        'error': 'Verification failed',
                        'message': 'The current name and phrase do not match this private person.',
                    }), 400
        return jsonify({'success': True, 'status': 'success'}), 200
    except Exception:
        logger.exception('change_person_name_phrase failed')
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to change the person phrase',
        }), 500

@person_views.route('/api/v1/get_persons_by_organization_id/<organization_id>')
def get_persons_by_organization_id(organization_id):
    return get_many('persons', person_model, {}, owner_constraint=_org())

@person_views.route('/api/v1/get_public_persons_by_organization_id/<organization_id>')
def get_public_persons_by_organization_id(organization_id):
    return get_many('persons', person_model, {'is_public': True}, owner_constraint=_org())

@person_views.route('/api/v1/search_public_persons/<organization_id>/<query>')
def search_public_persons(organization_id, query):
    return _get_persons_by_sql(
        f"SELECT {PERSON_SELECT_COLUMNS} FROM persons p "
        "WHERE p.organization_id = %s AND p.is_public = TRUE "
        "AND p.public_name ILIKE %s ORDER BY p.public_name",
        (g.organization_id, f'%{query}%'),
    )

@person_views.route('/api/v1/delete_person', methods=['DELETE'])
def delete_person():
    data = request.get_json(silent=True) or {}
    dead_id = data.get('id')
    if not dead_id:
        return jsonify({'success': False, 'error': 'Missing id'}), 400
    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM persons WHERE id = %s AND organization_id = %s",
                    (dead_id, g.organization_id),
                )
        return jsonify({'success': True, 'status': 'success'}), 200
    except Exception:
        logger.exception("delete_person failed")
        return jsonify({
            'success': False,
            'error': 'Database error',
            'message': 'Unable to delete person',
        }), 500

def _get_persons_by_sql(sql: str, params: tuple, model=person_model):
    try:
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                return return_many(model, rows)
    except Exception:
        logger.exception("Person query failed")
        return (
            jsonify(
                {
                    "success": False,
                    "status": "db error",
                    "error": "Database error",
                    "message": "Unable to load people",
                }
            ),
            500,
        )

SQL_PERSONS_BY_CASE_ID = f"""
    SELECT {PERSON_SELECT_COLUMNS}
    FROM persons p
    WHERE p.organization_id = %s
      AND EXISTS (
        SELECT 1
        FROM entry_person ep
        JOIN entries e ON e.id = ep.entry_id
        WHERE e.case_id = %s
          AND e.organization_id = %s
          AND ep.person_id = p.id
    )
    ORDER BY p.id;
"""

SQL_PERSONS_BY_ENTRY_ID = f"""
    SELECT {PERSON_SELECT_COLUMNS}, ep.entry_role
    FROM persons p
    JOIN entry_person ep ON ep.person_id = p.id
    JOIN entries e ON e.id = ep.entry_id
    WHERE p.organization_id = %s
      AND ep.entry_id = %s
      AND e.organization_id = %s
    ORDER BY p.id;
"""

@person_views.route("/api/v1/get_persons_by_case_id/<case_id>")
def get_persons_by_case_id(case_id):
    org = g.organization_id
    return _get_persons_by_sql(SQL_PERSONS_BY_CASE_ID, (org, case_id, org))

@person_views.route("/api/v1/get_persons_by_entry_id/<entry_id>")
def get_persons_by_entry_id(entry_id):
    org = g.organization_id
    return _get_persons_by_sql(SQL_PERSONS_BY_ENTRY_ID, (org, entry_id, org),
                               {**person_model, 'entryRole': 'entry_role'})


# ---------------------------------------------------------------------------
# entry_person join: attach / detach a person to / from a specific entry.
# Inline SQL because the join table has a composite PK (no `id` column) so
# the generic add_one helper in utils.py doesn't fit.
# ---------------------------------------------------------------------------

SQL_ADD_ENTRY_PERSON = """
    INSERT INTO entry_person (entry_id, person_id, entry_role)
    VALUES (%s, %s, %s)
    ON CONFLICT (entry_id, person_id) DO UPDATE SET entry_role = EXCLUDED.entry_role;
"""

SQL_REMOVE_ENTRY_PERSON = """
    DELETE FROM entry_person
    WHERE entry_id = %s AND person_id = %s;
"""


def _exec_entry_person(sql: str, entry_id, person_id, entry_role='visitor'):
    if sql == SQL_ADD_ENTRY_PERSON and not valid_entry_role(entry_role):
        return jsonify({'success': False, 'error': 'Invalid entryRole'}), 400
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
        with managed_connection(get_db_connection) as conn:
            with conn.cursor() as cur:
                # Authorize both sides of the relationship from the principal's
                # organization.  The key-share locks remain held through the
                # mutation now that connections are transactional.
                cur.execute(
                    """
                    SELECT 1
                    FROM entries e
                    JOIN persons p ON p.id = %s
                    WHERE e.id = %s
                      AND e.organization_id = %s
                      AND e.ombuds_id = %s
                      AND p.organization_id = %s
                    FOR KEY SHARE OF e, p
                    """,
                    (person_id, entry_id, g.organization_id, g.ombuds_id, g.organization_id),
                )
                if cur.fetchone() is None:
                    return (
                        jsonify({
                            "success": False,
                            "status": "404 error",
                            "error": "Not found",
                        }),
                        404,
                    )
                params = (entry_id, person_id, entry_role) if sql == SQL_ADD_ENTRY_PERSON else (entry_id, person_id)
                cur.execute(sql, params)
        return jsonify({"success": True, "status": "success"}), 200
    except Exception:
        logger.exception("entry_person mutation failed")
        return (
            jsonify(
                {
                    "success": False,
                    "status": "db error",
                    "error": "Database error",
                    "message": "Unable to update the entry-person relationship",
                }
            ),
            500,
        )


@person_views.route("/api/v1/add_entry_person", methods=["POST"])
def add_entry_person():
    data = request.get_json(silent=True) or {}
    return _exec_entry_person(SQL_ADD_ENTRY_PERSON, data.get("entryId"), data.get("personId"),
                              data.get("entryRole", "visitor"))


@person_views.route("/api/v1/remove_entry_person", methods=["DELETE"])
def remove_entry_person():
    data = request.get_json(silent=True) or {}
    return _exec_entry_person(SQL_REMOVE_ENTRY_PERSON, data.get("entryId"), data.get("personId"))
