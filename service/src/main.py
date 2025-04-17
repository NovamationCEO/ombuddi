# Importing flask module in the project is mandatory
# An object of Flask class is our WSGI application.
from flask import Flask, request, Response
from flask_cors import CORS
from second import my_extension_name
from pet_views import pet_views
from user_management_views import user_management_views

app = Flask(__name__)
app.debug = True
app.register_blueprint(my_extension_name)
app.register_blueprint(pet_views)
app.register_blueprint(user_management_views)

CORS(app)

@app.before_request #This handles 'options' requests to make sure CORS is available.
def basic_authentication():
    if request.method.lower() == 'options':
        return Response()


@app.route('/')
def hello_world():
    return "Service layer is running properly"


# entrypoint
if __name__ == '__main__':

    # run() method of Flask class runs the application 
    # on the local development server.
    app.run()