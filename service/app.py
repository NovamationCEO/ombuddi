# Importing flask module in the project is mandatory
# An object of Flask class is our WSGI application.
from flask import Flask, request, Response
from flask_cors import CORS
from src.ombuddi_views import ombuddi_views
from src.person_views import person_views

app = Flask(__name__)
app.debug = True
app.register_blueprint(ombuddi_views)
app.register_blueprint(person_views)

CORS(app)

@app.before_request #This handles 'options' requests to make sure CORS is available.
def basic_authentication():
    if request.method.lower() == 'options':
        return Response()

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

@app.route('/')
def hello_world():
    return "Service layer is running properly"


# entrypoint
if __name__ == '__main__':
    print(app.url_map)


    # run() method of Flask class runs the application 
    # on the local development server.
    app.run(host='0.0.0.0', port=5000)