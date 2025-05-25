from flask import Blueprint, request
from utils import add_one, get_many, get_one, update_one
from hash_name import hash_name
import logging

logger = logging.getLogger(__name__)

person_views = Blueprint('person_views', __name__)

person_model = {
    'id': 'id',
    'hashedName': 'hashed_name',
    'gender': 'gender',
    'generation': 'generation',
    'race': 'race',
    'primaryRole': 'primary_role',
    'isInternational': 'is_international',
    'category1': 'category_1',
    'category2': 'category_2',
    'category3': 'category_3',
}

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

@person_views.route('/api/v1/get_person_by_id/<id>')
def get_person_by_id(id):
    constraints = {'id': id}
    return get_one('person', person_model, constraints)

@person_views.route('/api/v1/get_persons_by_hashed_name/<raw_hash>')
def get_persons_by_hashed_name(raw_hash):
    final_hash = hash_name(raw_hash)
    return get_many('person', person_model, {'hashed_name': final_hash})

@person_views.route('/api/v1/add_person', methods=['POST'])
def add_person():
    return add_one('person', person_model, request)

@person_views.route('/api/v1/update_person', methods=['PUT'])
def update_person():
    return update_one('person', person_model, request)