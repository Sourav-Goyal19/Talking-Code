from flask import Flask, jsonify, request
from gitingest import ingest

app = Flask(__name__)


@app.route("/tree", methods=["GET"])
def get_tree():
    github_url = request.args.get("github_url")
    print(github_url)
    if not github_url:
        return jsonify({"error": "Missing 'github_url' parameter"}), 400

    try:
        summary, tree, content = ingest(github_url)
        return jsonify({"tree": tree})
    except Exception as e:
        return (
            jsonify({"error": str(e)}),
            500,
        )  # Internal server error if something goes wrong


if __name__ == "__main__":
    app.run(debug=True)
