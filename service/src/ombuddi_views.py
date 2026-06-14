from flask import Blueprint, request, g
from utils import add_one, get_many, get_one, update_one

ombuddi_views = Blueprint('ombuddi_views', __name__)

def _org():
    return {'organization_id': g.organization_id}

case_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'name': 'name',
    'description': 'description',
    'codes': 'codes',
    'status': 'status',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
}

@ombuddi_views.route('/api/v1/create_case', methods=['POST'])
def create_case():
    return add_one('cases', case_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_case_by_id/<id>')
def get_case_by_id(id):
    return get_one('cases', case_model, {'id': id}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_all_cases')
def get_all_cases():
    return get_many('cases', case_model, {'status': 'active'}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_cases_by_status/<status>')
def get_cases_by_status(status):
    return get_many('cases', case_model, {'status': status}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/update_case', methods=['PUT'])
def update_case():
    return update_one('cases', case_model, request, owner_constraint=_org())


organization_model = {
    'id': 'id',
    'name': 'name'
}

@ombuddi_views.route('/api/v1/get_organization_by_id/<id>')
def get_organization_by_id(id):
    # Organizations don't carry organization_id themselves — id IS the org.
    return get_one('organizations', organization_model, {'id': id})

@ombuddi_views.route('/api/v1/update_organization', methods=['PUT'])
def update_organization():
    return update_one('organizations', organization_model, request)

ombuds_model = {
    'id': 'id',
    'name': 'name',
    'organizationId': 'organization_id'
}

@ombuddi_views.route('/api/v1/get_ombuds_by_id/<id>')
def get_ombuds_by_id(id):
    return get_one('ombuds', ombuds_model, {'id': id}, owner_constraint=_org())

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
    return add_one('codes', code_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/update_code', methods=['PUT'])
def update_code():
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
    return add_one('entries', entry_model, request, owner_constraint=_org())

@ombuddi_views.route('/api/v1/get_entries_by_case_id/<case_id>')
def get_entries_by_case_id(case_id):
    return get_many('entries', entry_model, {'case_id': case_id}, owner_constraint=_org())

@ombuddi_views.route('/api/v1/update_entry', methods=['PUT'])
def update_entry():
    return update_one('entries', entry_model, request, owner_constraint=_org())
