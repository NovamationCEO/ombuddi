from flask import Blueprint, request
from utils import update_one, get_one, get_many, remove_one, add_one

pet_views = Blueprint('pet_views', __name__)

table_name = 'pets'
pet_model = {
    'id': 'id',
    'name': 'name',
    'speciesName': 'species_name',
    'color': 'color',
    'age': 'age',
    'eyeColor': 'eye_color',
}


@pet_views.route('/api/v1/add_pet', methods=['POST'])
def add_pet():
    return add_one(table_name, pet_model, request)
    

@pet_views.route('/api/v1/get_pet_by_id/<id>')
def get_pet_by_id(id):
    constraints = {'id': id}
    return get_one(table_name, pet_model, constraints)


@pet_views.route('/api/v1/get_pets_by_species/<species>')
def get_pets_by_species(species):
    constraints = {'species_name': species}
    return get_many(table_name, pet_model, constraints)


@pet_views.route('/api/v1/update_pet', methods=['PUT'])
def update_pet():
    return update_one(table_name, pet_model, request)


@pet_views.route('/api/v1/remove_pet_by_id', methods=['DELETE'])
def remove_pet_by_id():
    return remove_one(table_name, request)