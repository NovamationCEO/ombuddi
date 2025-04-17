from flask import Blueprint, request, jsonify
from connection import get_db_connection
from utils_user_management import add_one_by_key, get_many_in, remove_one_with_keys, update_one_with_keys
from utils import return_many, update_one, get_one, get_many, remove_one, add_one
import os
user_management_views = Blueprint('user_management_views', __name__)
application_id = os.getenv("APPLICATION_ID")

application_model = {
    'id': 'id',
    'name': 'name',
    'displayName': 'display_name',
}

user_model = {
    'id': 'id',
    'email': 'email',
    'firstName': 'first_name',
    'lastName': 'last_name',
}

available_projects_model = {
    'id': 'project.id',
    'name': 'project.name',
    'description': 'project.description',
    'applicationId': 'project.fk_application_id',
    'createdDate': 'project.created_date',
    'modifiedDate': 'project.modified_date',
    'ownerId': 'project.fk_owner_id',
    'dataPath': 'project.data_path',
    'roleId': 'user_project.fk_role_id',
    'ownerFirstName': 'user_table.first_name',
    'ownerLastName': 'user_table.last_name'
}

project_users_model = {
    'id': 'user_table.id',
    'email': 'user_table.email',
    'firstName': 'user_table.first_name',
    'lastName': 'user_table.last_name',
    'roleId': 'user_project.fk_role_id',
    'roleName': 'role.name'
}

project_model = {
    'id': 'id',
    'name': 'name',
    'description': 'description',
    'applicationId': 'fk_application_id',
    'createdDate': 'created_date',
    'modifiedDate': 'modified_date',
    'ownerId': 'fk_owner_id', 
    'dataPath': 'data_path',
}

user_project_model = {
    'userId': 'fk_user_id',
    'projectId': 'fk_project_id',
    'roleId': 'fk_role_id',
    'assignedDate': 'assigned_date',
}
project_owner_model = {
    'userId': 'fk_owner_id',
    'projectId': 'id',
}

@user_management_views.route('/api/v1/um_get_application/<id>')
def um_get_application(id):
    constraints = {'id': id}
    return get_one('application', application_model, constraints, 'user_management')

@user_management_views.route('/api/v1/um_get_user_by_id/<id>')
def um_get_user_by_id(id):
    constraints = {'id': id}
    return get_one('user_table', user_model, constraints, 'user_management')


available_projects_model = {
    'id': 'project.id',
    'name': 'project.name',
    'description': 'project.description',
    'applicationId': 'project.fk_application_id',
    'createdDate': 'project.created_date',
    'modifiedDate': 'project.modified_date',
    'ownerId': 'project.fk_owner_id',
    'dataPath': 'project.data_path',
    'roleId': 'user_project.fk_role_id',
    'ownerFirstName': 'user_table.first_name',
    'ownerLastName': 'user_table.last_name'
}

@user_management_views.route('/api/v1/um_get_available_projects/<id>')
def um_get_available_projects(id):
    values = [id, application_id]

    keys_string = ', '.join(available_projects_model.values())
    sql_command = f"""
        SELECT {keys_string} 
        FROM project
        JOIN user_project ON user_project.fk_project_id = project.id
        JOIN application ON project.fk_application_id = application.id
        JOIN user_table ON project.fk_owner_id = user_table.id
        WHERE user_project.fk_user_id = %s AND project.fk_application_id = %s
    """

    try:
        with get_db_connection('user_management') as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, values)
                res = cur.fetchall()
                return return_many(available_projects_model, res)

    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500


# Add user to user_table, not project specific
@user_management_views.route('/api/v1/um_add_user_to_db', methods=['POST'])
def um_add_user_to_db():
    return add_one('user_table', user_model, request, 'user_management')

@user_management_views.route('/api/v1/um_add_project', methods=['POST'])
def um_add_project():
    return add_one('project', project_model, request, 'user_management')

@user_management_views.route('/api/v1/um_add_user_project', methods=['POST'])
def um_add_user_project():
    return add_one('user_project', user_project_model, request, 'user_management','projectId')

@user_management_views.route('/api/v1/um_update_project', methods=['PUT'])
def um_update_project():
    return update_one('project', project_model, request, 'user_management')

@user_management_views.route('/api/v1/um_update_project_owner', methods=['PUT'])
def um_update_project_owner():
    return update_one_with_keys('project', project_owner_model, request, ['projectId'], 'user_management')

@user_management_views.route('/api/v1/um_get_users_by_project_id/<id>')
def um_get_users_by_project_id(id):
    values = [id]

    keys_string = ', '.join(project_users_model.values())
    sql_command = f"""
        SELECT {keys_string} 
        FROM user_project
        JOIN user_table ON user_project.fk_user_id=user_table.id
        JOIN role ON user_project.fk_role_id=role.id
        WHERE user_project.fk_project_id = %s;
    """

    try:
        with get_db_connection('user_management') as conn:
            with conn.cursor() as cur:
                cur.execute(sql_command, values)
                res = cur.fetchall()
                return return_many(available_projects_model, res)

    except Exception as e:
        return jsonify({'success': False, 'status': 'db error', 'error': 'Database error', 'message': str(e)}), 500
    

@user_management_views.route('/api/v1/um_remove_project_by_id', methods=['DELETE'])
def um_remove_project_by_id():
    return remove_one('project', request, 'user_management')

@user_management_views.route('/api/v1/um_update_user_permission', methods=['PUT'])
def um_update_user_permission():
    return update_one_with_keys('user_project', user_project_model, request, ['userId', 'projectId'] ,'user_management')

@user_management_views.route('/api/v1/um_add_user_permission', methods=['POST'])
def um_add_user_permission():
    return add_one_by_key('user_project', user_project_model, request, 'userId' ,'user_management')

@user_management_views.route('/api/v1/um_remove_user_permission', methods=['DELETE'])
def um_remove_user_permission():
    return remove_one_with_keys('user_project', request, ['fk_user_id', 'fk_project_id'] ,'user_management')

@user_management_views.route('/api/v1/um_get_all_users')
def um_get_all_users():
    constraints = {'id': 'IS NOT NULL'}
    return get_many('user_table', user_model, constraints, 'user_management')

@user_management_views.route('/api/v1/um_get_users_many_project_id_users/<ids>')
def um_get_users_many_project_id_users(ids):
    constraints = {'fk_project_id': ids.split(',')}
    return get_many_in('user_project user_project', user_project_model, constraints, 'user_management')
