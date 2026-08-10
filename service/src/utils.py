import logging
from flask import jsonify
from connection import get_db_connection, managed_connection

logger = logging.getLogger(__name__)

###
# CRUD
###

###
# CREATE
###

def add_one(table, model, request, db_name="default", key='id', owner_constraint=None):
    """Insert a row.

    `owner_constraint` is a dict of DB column name -> value (e.g. {'organization_id': '...'})
    that gets merged into the row being inserted, overriding any value the
    client sent for those columns. Used to force-stamp principal-derived
    fields once auth lands. Default `None` means "no override" — behavior
    matches the pre-multi-tenancy version of this helper.
    """
    owner_constraint = owner_constraint or {}
    user_data = request.get_json(silent=True) or {}
    if key not in model:
        return jsonify({'success': False, 'status': 'input error', 'error': f'Missing {key}'}), 400
    valid_data = {k: v for k, v in user_data.items() if k in model}
    # column-name -> value so owner_constraint can override what the client sent
    column_values = {model[k]: v for k, v in valid_data.items()}
    column_values.update(owner_constraint)
    set_clause = ', '.join(column_values.keys())
    values_clause = ', '.join(['%s::uuid[]' if isinstance(v, list) else '%s' for v in column_values.values()])
    sql_command = "INSERT INTO " + table + f" ({set_clause}) VALUES ({values_clause}) RETURNING {model[key]};"

    values = list(column_values.values())
    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, values)
                new_id = cur.fetchone()[0]
        return jsonify({'success': True, 'status': 'success', key: new_id}), 200
    except Exception:
        logger.exception('Failed to insert row into %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to save the record',
        }), 500

# add_many was removed: it referenced psycopg2.sql.Identifier without importing it
# and would NameError on first call. Reintroduce a properly-imported version when
# a real batch-insert use case appears.

###
# READ
###

def get_one(table, model, constraints, db_name="default", owner_constraint=None):
    """Read a single row.

    `owner_constraint` (dict of DB column name -> value) is ANDed into the
    WHERE clause so the caller cannot see rows they don't own. Default `None`
    means "no extra filter" — pre-multi-tenancy behavior.
    """
    full_constraints = {**constraints, **(owner_constraint or {})}
    where_clause = ' AND '.join(f"{k} = %s" for k in full_constraints)
    values = list(full_constraints.values())

    keys_string = ', '.join(model.values())
    sql_command = ('SELECT ' + keys_string
                + '''   FROM ''' + table + ''' WHERE ''' + where_clause)

    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, values)
                res = cur.fetchone()
        return return_one(model, res)
    except Exception:
        logger.exception('Failed to read row from %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to load the record',
        }), 500

def get_many(table, model, constraints, db_name="default", owner_constraint=None):
    """Read many rows.

    `owner_constraint` (dict of DB column name -> value) is ANDed into the
    WHERE clause. Default `None` means "no extra filter" — pre-multi-tenancy
    behavior. Owner constraints only support simple equality; sentinel values
    like None / 'IS NOT NULL' are not honored on this side.
    """
    where_parts = []
    values = []

    for k, v in constraints.items():
        if v is None:
            where_parts.append(f"{k} IS NULL")
        elif v == 'IS NOT NULL':
            where_parts.append(f"{k} IS NOT NULL")
        else:
            where_parts.append(f"{k} = %s")
            values.append(v)

    for k, v in (owner_constraint or {}).items():
        where_parts.append(f"{k} = %s")
        values.append(v)

    where_clause = ' AND '.join(where_parts)
    keys_string = ', '.join(model.values())
    sql_command = f'SELECT {keys_string} FROM {table}'

    if where_clause:
        sql_command += f' WHERE {where_clause}'
    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, values)
                res = cur.fetchall()
        return return_many(model, res)
    except Exception:
        logger.exception('Failed to list rows from %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to load records',
        }), 500


def get_many_or(table, model, constraints, db_name="default"):
    where_clause = ' OR '.join(f"{k} = %s" for k in constraints)
    values = [v for k,v in constraints.items()]

    keys_string = ', '.join(model.values())
    sql_command = ('SELECT ' + keys_string  
                + ''' FROM ''' + table + ''' WHERE ''' + where_clause)

    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, values)
                res = cur.fetchall()
        return return_many(model, res)
    except Exception:
        logger.exception('Failed OR query against %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to load records',
        }), 500


def get_many_by_ids(table, model, constraint, db_name="default"):
    keys_string = ', '.join(model.values())
    constraint_key, constraint_values = next(iter(constraint.items()))

    sql_command = f'SELECT {keys_string} FROM {table} WHERE {constraint_key} = ANY(%s::uuid[])'
    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, (constraint_values,))
                res = cur.fetchall()
        return return_many(model, res)
    except Exception:
        logger.exception('Failed ID-list query against %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to load records',
        }), 500

def get_many_in_by(table, model, list_constraint, by_constraints, db_name="default"):
    keys_string = ', '.join(model.values())
    constraint_key, constraint_values = next(iter(list_constraint.items()))

    where_parts = []
    values = []

    for k, v in by_constraints.items():
        if v is None:
            where_parts.append(f"{k} IS NULL")
        elif v == 'IS NOT NULL':
            where_parts.append(f"{k} IS NOT NULL")
        else:
            where_parts.append(f"{k} = %s")
            values.append(v)

    where_clause = ' AND '.join(where_parts)

    sql_command = f'SELECT {keys_string} FROM {table} WHERE {constraint_key} = ANY(%s::uuid[]) AND {where_clause}'

    full_values = [constraint_values] + values

    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, tuple(full_values))
                res = cur.fetchall()
        return return_many(model, res)
    except Exception:
        logger.exception('Failed filtered ID-list query against %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to load records',
        }), 500


###
# UPDATE
###

def update_one(
    table,
    model,
    request,
    db_name="default",
    owner_constraint=None,
    immutable_columns=None,
):
    """Update a single row by id.

    `owner_constraint` (dict of DB column name -> value) is ANDed into the
    WHERE clause so the caller cannot update rows they don't own. If a
    non-empty constraint is provided and zero rows match, returns 404
    (instead of silent success). Default `None` preserves the pre-multi-tenancy
    behavior of always returning success.
    """
    owner_constraint = owner_constraint or {}
    user_data = request.get_json(silent=True) or {}
    if 'id' not in user_data:
        return jsonify({'success': False, 'status': 'input error', 'error': 'Missing id'}), 400

    # Ownership columns are authority supplied by the authenticated principal,
    # not mutable client data.  They remain in the WHERE clause below but are
    # deliberately excluded from SET so a row cannot be moved to another
    # tenant by submitting a different organizationId.
    protected_columns = set(owner_constraint.keys()) | set(immutable_columns or ())
    valid_data = {
        k: v
        for k, v in user_data.items()
        if k in model and (k == 'id' or model[k] not in protected_columns)
    }
    writable_data = {k: v for k, v in valid_data.items() if k != 'id'}
    if not writable_data:
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'No writable fields supplied',
        }), 400

    set_clause = ', '.join([
        f"{model[k]} = %s::uuid[]" if isinstance(writable_data[k], list)
        else f"{model[k]} = COALESCE(%s, {model[k]})"
        for k in writable_data
    ])
    where_parts = ['id = %s'] + [f'{k} = %s' for k in owner_constraint.keys()]
    sql_command = f"UPDATE {table} SET {set_clause} WHERE {' AND '.join(where_parts)}"

    values = (
        list(writable_data.values())
        + [user_data['id']]
        + list(owner_constraint.values())
    )

    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, values)
                # When the caller scopes by ownership, a zero-row update means
                # either the row doesn't exist OR it belongs to someone else.
                # Surface that as 404; ambiguity is on purpose (don't leak that
                # a UUID exists in another tenant).
                if owner_constraint and cur.rowcount == 0:
                    return jsonify({
                        'success': False,
                        'status': '404 error',
                        'error': 'Not found',
                    }), 404
        return jsonify({'success': True, 'status': 'success'}), 200
    except Exception:
        logger.exception('Failed to update row in %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to update the record',
        }), 500

def update_many(table, model, request, db_name="default"):
    user_data_list = request.get_json(silent=True)
    if not isinstance(user_data_list, list) or len(user_data_list) == 0:
        return jsonify({'success': False, 'status': 'input error', 'error': 'Input must be a non-empty list'}), 400

    sql_commands = []
    values = []
    
    for user_data in user_data_list:
        if 'id' not in user_data:
            return jsonify({'success': False, 'status': 'input error', 'error': 'Missing id for one of the entries'}), 400
        
        valid_data = {k: v for k, v in user_data.items() if k in model}
        
        set_clause = ', '.join([
            f"{model[k]} = COALESCE(%s::uuid[], {model[k]})" if isinstance(valid_data[k], list)
            else f"{model[k]} = COALESCE(%s, {model[k]})"
            for k in valid_data if k != 'id'
        ])
        
        sql_command = f"UPDATE {table} SET {set_clause} WHERE id = %s"
        sql_commands.append(sql_command)
        
        entry_values = [v for k, v in valid_data.items() if k != 'id'] + [user_data['id']]
        values.append(entry_values)
    
    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                for sql_command, entry_values in zip(sql_commands, values):
                    cur.execute(sql_command, entry_values)
        return jsonify({
            'success': True,
            'status': 'success',
            'updated_count': len(user_data_list),
        }), 200
    except Exception:
        logger.exception('Failed batch update against %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to update records',
        }), 500

###
# DEVASTATE
###

def remove_one(table, request, db_name="default"):
    user_data = request.get_json(silent=True) or {}
    dead_id = user_data.get('id')
    if not dead_id:
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'Missing id',
        }), 400

    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                cur.execute(f'''
                    DELETE FROM {table}
                    WHERE id = %s''', [dead_id])
        return jsonify({'success': True, 'status': 'success', 'message': 'Entry removed successfully'}), 200
    except Exception:
        logger.exception('Failed to delete row from %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to delete the record',
        }), 500


def remove_many(table, request, db_name="default"):
    resource_data = request.get_json(silent=True) or {}
    ids = resource_data.get('ids')
    if not isinstance(ids, list) or not ids:
        return jsonify({
            'success': False,
            'status': 'input error',
            'error': 'Missing IDs',
        }), 400

    try:
        with managed_connection(get_db_connection, db_name) as conn:
            with conn.cursor() as cur:
                format_strings = ','.join(['%s'] * len(ids))
                cur.execute(f'''
                        DELETE FROM {table}
                        WHERE id IN ({format_strings})''', tuple(ids))
                deleted_count = cur.rowcount
        if deleted_count > 0:
            return jsonify({
                'success': True,
                'status': 'success',
                'message': 'Entries deleted successfully',
            }), 200
        return jsonify({
            'success': False,
            'status': '404 error',
            'error': 'Entries not found or not deleted.',
        }), 404
    except Exception:
        logger.exception('Failed batch delete against %s', table)
        return jsonify({
            'success': False,
            'status': 'db error',
            'error': 'Database error',
            'message': 'Unable to delete records',
        }), 500


###
# RETURN
###

def _coerce(value):
    """
    psycopg2 returns Postgres array columns (e.g. UUID[]) as raw literal
    strings like '{}' or '{uuid1,uuid2}' rather than Python lists.
    Convert those strings to proper lists so jsonify produces JSON arrays.
    All other values pass through unchanged.
    """
    if isinstance(value, str) and value.startswith('{') and value.endswith('}'):
        inner = value[1:-1]
        return [] if not inner else [item.strip() for item in inner.split(',')]
    return value


def return_many(model, res):
    if res:
        response = [{model_key: _coerce(value) for model_key, value in zip(model.keys(), row)} for row in res]
        return jsonify(response)
    else:
        return jsonify([]), 200


def return_one(model, res):
    if res:
        response = {model_key: _coerce(value) for model_key, value in zip(model.keys(), res)}
        return jsonify(response)
    else:
        return jsonify({'error': "Not Found"}), 404
