import os
import psycopg2
import logging
from flask import jsonify
from connection import get_db_connection

logger = logging.getLogger(__name__)

###
# CRUD
###

###
# CREATE
###

def add_one(table, model, request, db_name="default", key='id'):
    conn = None
    user_data = request.get_json()
    if key not in model:
        return jsonify({'success': False, 'status': 'input error', 'error': f'Missing {key}'}), 400
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
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

def add_many(table, model, request, db_name='default', key='id'):
    conn = None
    user_data_list = request.get_json()

    if not isinstance(user_data_list, list):
        return jsonify({'success': False, 'status': 'input error', 'error': 'Invalid input', 'message': 'Expected an array of objects'}), 400
    if key not in model:
        return jsonify({'success': False, 'status': 'input error', 'error': f'Missing {key}'}), 400

    try:
        conn = get_db_connection(db_name)
        conn.autocommit = False  # Disable autocommit to start a transaction

        with conn.cursor() as cur:
            ids = []
            for user_data in user_data_list:
                valid_data = {k: v for k, v in user_data.items() if k in model}
                if not valid_data:
                    continue

                set_clause = ', '.join([sql.Identifier(model[k]).as_string(conn) for k in valid_data])
                values_clause = ', '.join(['%s' for _ in valid_data])
                sql_command = f"INSERT INTO {sql.Identifier(table).as_string(conn)} ({set_clause}) VALUES ({values_clause}) RETURNING {model[key]};"

                values = [v for k, v in valid_data.items()]

                cur.execute(sql_command, values)
                new_id = cur.fetchone()[0]
                ids.append(new_id)

            conn.commit()  # Commit the transaction
            return jsonify({'success': True, 'status': 'success', 'ids': ids}), 200
    
    except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
        if conn:
            conn.rollback()  # Rollback the transaction on error
        logging.error(f"Database error: {str(e)}")
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    
    except Exception as e:
        if conn:
            conn.rollback()  # Rollback the transaction on error
        logging.error(f"Unexpected error: {str(e)}")
        return jsonify({'success': False, 'status': 'unknown error', 'error': 'Unexpected error', 'message': str(e)}), 500
    
    finally:
        if conn:
            conn.close()

###
# READ
###

def get_one(table, model, constraints, db_name="default"):
    conn = None
    where_clause = ' AND '.join(f"{k} = %s" for k in constraints)
    values = [v for k,v in constraints.items()]

    keys_string = ', '.join(model.values())
    sql_command = ('SELECT ' + keys_string  
                + '''   FROM ''' + table + ''' WHERE ''' + where_clause)

    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(sql_command, values)
            conn.commit()
            
            res = cur.fetchone()

            return return_one(model, res)
    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_many(table, model, constraints, db_name="default"):
    conn = None
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

    where_clause = ' AND '.join(where_parts)
    keys_string = ', '.join(model.values())
    sql_command = f'SELECT {keys_string} FROM {table}'

    if where_clause:
        sql_command += f' WHERE {where_clause}'
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(sql_command, values)
            
            res = cur.fetchall()
            return return_many(model, res)
    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


def get_many_or(table, model, constraints, db_name="default"):
    conn = None
    where_clause = ' OR '.join(f"{k} = %s" for k in constraints)
    values = [v for k,v in constraints.items()]

    keys_string = ', '.join(model.values())
    sql_command = ('SELECT ' + keys_string  
                + ''' FROM ''' + table + ''' WHERE ''' + where_clause)

    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(sql_command, values)
            conn.commit()
            
            res = cur.fetchall()

            return return_many(model, res)
    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


def get_many_by_ids(table, model, constraint, db_name="default"):
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
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_many_in_by(table, model, list_constraint, by_constraints, db_name="default"):
    conn = None
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
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:

            cur.execute(sql_command, tuple(full_values))
            res = cur.fetchall()
            return return_many(model, res)
    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


###
# UPDATE
###

def update_one(table, model, request, db_name="default"):
    conn = None
    user_data = request.json
    if 'id' not in user_data:
        return jsonify({'success': False, 'status': 'input error', 'error': 'Missing id'}), 400
    
    valid_data = {k: v for k, v in user_data.items() if k in model}
    set_clause = ', '.join([f"{model[k]} = COALESCE(%s, {model[k]})" for k in valid_data if k != 'id'])
    sql_command = "UPDATE " + table + f" SET {set_clause} WHERE id = %s"

    values = [v for k, v in valid_data.items() if k != 'id'] + [user_data['id']]

    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(sql_command, values)
            conn.commit()
                    
            return jsonify({'success': True, 'status': 'success'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

def update_many(table, model, request, db_name="default"):
    conn = None
    user_data_list = request.json
    if not isinstance(user_data_list, list) or len(user_data_list) == 0:
        return jsonify({'success': False, 'status': 'input error', 'error': 'Input must be a non-empty list'}), 400

    sql_commands = []
    values = []
    
    for user_data in user_data_list:
        if 'id' not in user_data:
            return jsonify({'success': False, 'status': 'input error', 'error': 'Missing id for one of the entries'}), 400
        
        valid_data = {k: v for k, v in user_data.items() if k in model}
        
        set_clause = ', '.join([f"{model[k]} = COALESCE(%s, {model[k]})" for k in valid_data if k != 'id'])
        
        sql_command = f"UPDATE {table} SET {set_clause} WHERE id = %s"
        sql_commands.append(sql_command)
        
        entry_values = [v for k, v in valid_data.items() if k != 'id'] + [user_data['id']]
        values.append(entry_values)
    
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            for sql_command, entry_values in zip(sql_commands, values):
                cur.execute(sql_command, entry_values)
            conn.commit()

            return jsonify({'success': True, 'status': 'success', 'updated_count': len(user_data_list)}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

###
# DEVASTATE
###

def remove_one(table, request, db_name="default"):
    conn = None
    user_data = request.json
    dead_id = user_data.get('id')

    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(f'''
                DELETE FROM {table}
                WHERE id = %s''', [dead_id])
            conn.commit()

        return jsonify({'success': True, 'status': 'success', 'message': 'Entry removed successfully'}), 200
    except Exception as e:
        conn.rollback()
        # For real applications, you may not want to show the raw error message
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error','message': str(e)}), 500
    finally:
        if conn:
            conn.close()


def remove_many(table, request, db_name="default"):
    conn = None
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            resource_data = request.json
            ids = resource_data.get('ids')

            if not ids:
                return jsonify({'success': False, 'status': 'input error', 'error': 'Missing IDs'}), 400

            format_strings = ','.join(['%s'] * len(ids))
            cur.execute(f'''
                    DELETE FROM {table}
                    WHERE id IN ({format_strings})''', tuple(ids))

            if cur.rowcount > 0:
                conn.commit()
                return jsonify({'success': True, 'status': 'success', 'message': 'Entries deleted successfully'}), 200
            else:
                return jsonify({'success': False, 'status': '404 error', 'error': 'Entries not found or not deleted.'}), 404

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


###
# RETURN
###


def return_many(model, res):
    if res:
        response = [{model_key: value for model_key, value in zip(model.keys(), row)} for row in res]
        return jsonify(response)
    else:
        return jsonify([]), 200


def return_one(model, res):
    if res:
        response = {model_key: value for model_key, value in zip(model.keys(), res)}
        return jsonify(response)
    else:
        return jsonify({'error': "Not Found"}), 404


