from flask import Flask

app = Flask(__name__)

# app.run(host='0.0.0.0', port=5000)
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)


@app.route('/')
def hello():
    return "Hello from Flask in Docker!"
