from flask import Blueprint, request
from utils import add_one, get_many, update_one

# See service/schema.sql for the rationale on a single generic table vs.
# per-list tables (mediums / priorities / etc.). Frontend filters by `kind`.

picklist_views = Blueprint('picklist_views', __name__)

picklist_model = {
    'id': 'id',
    'organizationId': 'organization_id',
    'kind': 'kind',
    'name': 'name',
    'description': 'description',
    'index': 'index',
    'softDelete': 'soft_delete',
}


@picklist_views.route('/api/v1/get_picklists_by_organization_id/<organization_id>')
def get_picklists_by_organization_id(organization_id):
    constraints = {'organization_id': organization_id, 'soft_delete': False}
    return get_many('picklists', picklist_model, constraints)


@picklist_views.route('/api/v1/add_picklist', methods=['POST'])
def add_picklist():
    return add_one('picklists', picklist_model, request)


@picklist_views.route('/api/v1/update_picklist', methods=['PUT'])
def update_picklist():
    return update_one('picklists', picklist_model, request)
