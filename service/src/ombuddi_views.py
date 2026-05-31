from flask import Blueprint, request
from utils import add_one, get_many, get_one, update_one
from hash_name import hash_name

ombuddi_views = Blueprint('ombuddi_views', __name__)

case_model = {
    'id': 'id',
    'name': 'name',
    'description': 'description',
    'codes': 'codes',
    'status': 'status',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
}

@ombuddi_views.route('/api/v1/create_case', methods=['POST'])
def create_case():
    return add_one('cases', case_model, request)

@ombuddi_views.route('/api/v1/get_case_by_id/<id>')
def get_case_by_id(id):
    constraints = {'id': id}
    return get_one('cases', case_model, constraints)

@ombuddi_views.route('/api/v1/get_all_cases')
def get_all_cases():
    constraints = {'status': 'active'}
    return get_many('cases', case_model, constraints)

@ombuddi_views.route('/api/v1/update_case', methods=['PUT'])
def update_case():
    return update_one('cases', case_model, request)


organization_model = {
    'id': 'id',
    'name': 'name'
}

@ombuddi_views.route('/api/v1/get_organization_by_id/<id>')
def get_organization_by_id(id):
    constraints = {'id': id}
    return get_one('organizations', organization_model, constraints)

ombuds_model = {
    'id': 'id',
    'name': 'name',
    'organizationId': 'organization_id'
}

@ombuddi_views.route('/api/v1/get_ombuds_by_id/<id>')
def get_ombuds_by_id(id):
    constraints = {'id': id}
    return get_one('ombuds', ombuds_model, constraints)

code_category_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'name': 'name',
    'softDelete': 'soft_delete',
    'index': 'index',
}

@ombuddi_views.route('/api/v1/get_code_categories_by_organization_id/<id>')
def get_code_categories_by_organization_id(id):
    constraints = {'organization_id': id, 'soft_delete': False}
    return get_many('code_categories', code_category_model, constraints)

@ombuddi_views.route('/api/v1/add_code_category', methods=['POST'])
def add_code_category():
    return add_one('code_categories', code_category_model, request)

@ombuddi_views.route('/api/v1/update_code_category', methods=['PUT'])
def update_code_category():
    return update_one('code_categories', code_category_model, request)

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
    constraints = {'category_id': id, 'soft_delete': False}
    return get_many('codes', code_model, constraints)

@ombuddi_views.route('/api/v1/get_codes_by_organization_id/<id>')
def get_codes_by_organization_id(id):
    constraints = {'organization_id': id, 'soft_delete': False}
    return get_many('codes', code_model, constraints)

@ombuddi_views.route('/api/v1/add_code', methods=['POST'])
def add_code():
    return add_one('codes', code_model, request)

@ombuddi_views.route('/api/v1/update_code', methods=['PUT'])
def update_code():
    return update_one('codes', code_model, request)

@ombuddi_views.route('/api/v1/get_code_by_id/<id>')
def get_code_by_id(id):
    constraints = {'id': id}
    return get_one('codes', code_model, constraints)

@ombuddi_views.route('/api/v1/get_all_codes_by_organization_id/<code>')
def get_all_codes_by_organization_id(code):
    constraints = {'organization_id': code}
    return get_many('codes', code_model, constraints)

primary_role_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'name': 'name',
    'index': 'index',
    'softDelete': 'soft_delete'
}

@ombuddi_views.route('/api/v1/get_primary_roles_by_organization_id/<id>')
def get_primary_roles_by_organization_id(id):
    constraints = {'organization_id': id, 'soft_delete': False}
    return get_many('primary_roles', primary_role_model, constraints)

@ombuddi_views.route('/api/v1/get_primary_role_by_id/<id>')
def get_primary_role_by_id(id):
    constraints = {'id': id}
    return get_one('primary_roles', primary_role_model, constraints)

@ombuddi_views.route('/api/v1/add_primary_role', methods=['POST'])
def add_primary_role():
    return add_one('primary_roles', primary_role_model, request)

@ombuddi_views.route('/api/v1/update_primary_role', methods=['PUT'])
def update_primary_role():
    return update_one('primary_roles', primary_role_model, request)

@ombuddi_views.route('/api/v1/get_all_primary_roles_by_organization_id/<id>')
def get_all_primary_roles_by_organization_id(id):
    constraints = {'organization_id': id}
    return get_many('primary_roles', primary_role_model, constraints)


entry_model = {
    'id': 'id',
    'caseId': 'case_id',
    'ombudsId': 'ombuds_id',
    'date': 'date',
    'medium': 'medium',
    'duration': 'duration',
    'notes': 'notes'
}

@ombuddi_views.route('/api/v1/get_entry_by_id/<id>')
def get_entry_by_id(id):
    constraints = {'id': id}
    return get_one('entries', entry_model, constraints)

@ombuddi_views.route('/api/v1/add_entry', methods=['POST'])
def add_entry():
    return add_one('entries', entry_model, request)

@ombuddi_views.route('/api/v1/get_entries_by_case_id/<case_id>')
def get_entries_by_case_id(case_id):
    constraints = {'case_id': case_id}
    return get_many('entries', entry_model, constraints)

@ombuddi_views.route('/api/v1/update_entry', methods=['PUT'])
def update_entry():
    return update_one('entries', entry_model, request)
