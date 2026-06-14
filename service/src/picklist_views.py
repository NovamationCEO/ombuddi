from flask import Blueprint, request, g
from utils import add_one, get_many, update_one

def _org():
    return {'organization_id': g.organization_id}

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
    return get_many('picklists', picklist_model, {'soft_delete': False}, owner_constraint=_org())


@picklist_views.route('/api/v1/add_picklist', methods=['POST'])
def add_picklist():
    return add_one('picklists', picklist_model, request, owner_constraint=_org())


@picklist_views.route('/api/v1/update_picklist', methods=['PUT'])
def update_picklist():
    return update_one('picklists', picklist_model, request, owner_constraint=_org())
