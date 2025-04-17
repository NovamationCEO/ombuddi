import os
import logging
from flask import jsonify
from connection import get_db_connection
from utils import return_many, return_one

logger = logging.getLogger(__name__)

# I'm not convinced the key parameter is the best way to go about this.
def add_one_by_key(table, model, request, key='id', db_name='default'):
    conn = None
    user_data = request.get_json()
    if key not in model:
        return jsonify({'error': f'Missing {key}'}), 400
    valid_data = {k: v for k, v in user_data.items() if k in model}
    set_clause = ', '.join([f"{model[k]}" for k in valid_data])
    values_clause = ', '.join(['%s' for k in valid_data])
    sql_command = "INSERT INTO " + table + f" ({set_clause}) VALUES ({values_clause}) RETURNING {model[key]};"

    values = [v for k, v in valid_data.items()]
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(sql_command, values)
            new_id = cur.fetchone()[0]
            conn.commit()
                    
            return jsonify({'success': True, 'status': 'success', key: new_id}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


def remove_one_with_keys(table, request, keys, db_name='default'):
    conn = None
    user_data = request.json
    
    for key in keys:
        if key not in user_data:
            return jsonify({'error': f'Missing {key}'}), 400
    where_clause = ' AND '.join(f"{k} = %s" for k in keys)
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(f'''
                DELETE FROM {table}
                WHERE {where_clause}''', [user_data[x] for x in keys])
            conn.commit()

        return jsonify({'message': 'Entry removed successfully'}), 200
    except Exception as e:
        conn.rollback()
        # For real applications, you may not want to show the raw error message
        return jsonify({'error': 'Database error','message': str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_many_in(table, model, constraint, db_name='default'):
    conn = None
    keys_string = ', '.join(model.values())
    constraint_key, constraint_values = next(iter(constraint.items()))

    sql_command = f'SELECT {keys_string} FROM {table} WHERE {constraint_key} = ANY(%s::uuid[])'
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:

            cur.execute(sql_command, (constraint_values,))
            res = cur.fetchall()
            return return_many(model, res)
    except Exception as e:
        return jsonify({'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

def update_one_with_keys(table, model, request, keys, db_name='default'):
    conn = None
    user_data = request.json
    for key in keys:
        if key not in model:
            return jsonify({'error': f'Missing {key}'}), 400

    where_clause = ' AND '.join(f"{model[k]} = %s" for k in keys)

    valid_data = {k: v for k, v in user_data.items() if k in model}

    set_clause = ', '.join([f"{model[k]} = COALESCE(%s, {model[k]})" for k in valid_data if k not in keys])
    sql_command = "UPDATE " + table + f" SET {set_clause} WHERE {where_clause}"
    values = [v for k, v in valid_data.items() if k not in keys] + [valid_data[x] for x in keys]
    print(sql_command, values)
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(sql_command, values)
            conn.commit()
                    
            return jsonify({'success': True, 'status': 'success'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()