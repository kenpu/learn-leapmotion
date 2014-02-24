from flask import Flask, redirect, request
import json

app = Flask(__name__)

@app.route("/")
def Index():
    return redirect("/static/index.html")

@app.route("/save/<experiment>", methods=['POST', "GET"])
def Save(experiment):
    data = request.form.get('data')
    print 'Saving "%s", with data = %s' % (experiment, request.form.keys())
    if data:
        with open(experiment, "w") as f:
            f.write(data)

    return "okay"

app.run(debug=True)
