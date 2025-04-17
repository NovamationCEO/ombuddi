import os
import logging
from flask import jsonify
from connection import get_db_connection
from utils import return_many, return_one

logger = logging.getLogger(__name__)

# MAKE NEW HELPER FUNCTIONS FOR PROJECT-SPECIFIC SPECIAL CASES

def get_one_by_max_year(table, model, constraints, year, db_name="default"):
    conn = None
    where_clause = ' AND '.join(f"{k} = %s" for k in constraints)
    values = [v for k, v in constraints.items()]

    where_clause += ' AND year <= %s'
    values.append(year)

    keys_string = ', '.join(model.values())
    sql_command = ('SELECT ' + keys_string  
                + '''   FROM ''' + table + ''' WHERE ''' + where_clause 
                + ''' ORDER BY year DESC LIMIT 1''')

    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            # First attempt to fetch the record for the target year or earlier
            cur.execute(sql_command, values)
            conn.commit()
            
            res = cur.fetchone()

            # If no record is found, determine the minimum year and fetch the fallback record
            if res is None:
                min_year_sql = f"SELECT MIN(year) FROM {table} WHERE {' AND '.join(f'{k} = %s' for k in constraints)}"
                cur.execute(min_year_sql, values[:-1])  # Exclude the year constraint
                min_year = cur.fetchone()[0]

                if min_year is not None:
                    # Update the where clause for the fallback query
                    where_clause = ' AND '.join(f"{k} = %s" for k in constraints)
                    where_clause += ' AND year = %s'
                    values = [v for k, v in constraints.items()]
                    values.append(min_year)

                    fallback_sql_command = ('SELECT ' + keys_string 
                                            + ' FROM ' + table 
                                            + ' WHERE ' + where_clause 
                                            + ' LIMIT 1')
                    cur.execute(fallback_sql_command, values)
                    res = cur.fetchone()

            if res:
                return return_one(model, res)
            else:
                return jsonify({'success': False, 'status': '404 error', 'error': 'No matching records found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


def get_many_by_max_year(table, model, constraints, year, db_name="default"):
    conn = None
    where_clause = ' AND '.join(f"{k} = %s" for k in constraints)
    values = [v for k,v in constraints.items()]

    where_clause += ' AND year <= %s'
    values.append(year)

    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            # Determine the maximum year within constraints
            max_year_sql = f"SELECT MAX(year) FROM {table} WHERE {where_clause}"
            cur.execute(max_year_sql, values)
            max_year = cur.fetchone()[0]
            
            if not max_year:
                min_year_sql = f"SELECT MIN(year) FROM {table}"
                cur.execute(min_year_sql)
                max_year = cur.fetchone()[0]

            if not max_year:
                return jsonify({'success': False, 'status': '404 error', 'error': 'No matching records found'}), 404

            # Update the where_clause to use the max year
            where_clause = ' AND '.join(f"{k} = %s" for k in constraints)
            where_clause += ' AND year = %s'
            values = [v for k,v in constraints.items()]
            values.append(max_year)

            keys_string = ', '.join(model.values())
            sql_command = ('SELECT ' + keys_string  
                        + '''   FROM ''' + table + ''' WHERE ''' + where_clause 
                        + ''' ORDER BY year DESC ''')

            cur.execute(sql_command, values)
            
            res = cur.fetchall()

            return return_many(model, res)
    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()


def remove_one_by_keys(table, request, keys=['id'], db_name="default"):
    conn = None
    user_data = request.json
    
    for key in keys:
        if key not in user_data:
            return jsonify({'success': False, 'status': 'input error', 'error': f'Missing {key}'}), 400
    where_clause = ' AND '.join(f"{k} = %s" for k in keys)
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cur:
            cur.execute(f'''
                DELETE FROM {table}
                WHERE {where_clause}''', [user_data[x] for x in keys])
            conn.commit()

        return jsonify({'success': True, 'status': 'success', 'message': 'Entry removed successfully'}), 200
    except Exception as e:
        conn.rollback()
        # For real applications, you may not want to show the raw error message
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error','message': str(e)}), 500
    finally:
        if conn:
            conn.close()

