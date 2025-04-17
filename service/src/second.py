from flask import Blueprint

my_extension_name = Blueprint('my_extension_name', __name__)
       
@my_extension_name.route('/test', methods=['GET'])
def test():
    return 'The blueprint linked file is also working.  Follow this pattern to compartmentalize your services.'
