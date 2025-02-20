import re
from flask import Flask, jsonify, request
from gitingest import ingest
from graphs.query_graph import app as query_graph
from langchain_core.messages import HumanMessage

app = Flask(__name__)


@app.route("/tree", methods=["GET"])
def get_tree():
    github_url = request.args.get("github_url")
    print(github_url)
    if not github_url:
        return jsonify({"error": "Missing 'github_url' parameter"}), 400

    try:
        summary, tree, content = ingest(github_url, exclude_patterns=".git")
        # print(len(tree))
        cleaned_structure = re.sub(
            r"(?m)^\s*├── .git/.*(?:\n^\s*[│└].*)*\n?", "", tree, flags=re.MULTILINE
        )

        return jsonify({"tree": cleaned_structure, "content": content})
    except Exception as e:
        return (
            jsonify({"error": str(e)}),
            500,
        )


@app.route("/query", methods=["POST"])
def process_query():
    # if not request.form:
    #     return jsonify({"error": "Request must contain JSON data"}), 400

    data = request.json

    if not data.get("query"):
        return jsonify({"error": "Missing 'query' in JSON data"}), 400

    print("Request to /query")
    query = data.get("query")
    context = data.get("context", [])
    conversation_history = data.get("conversationHistory")

    try:
        initial_message = HumanMessage(content=query)

        result = query_graph.invoke(
            initial_message,
            config={
                "configurable": {
                    "context": context,
                    "conversation_history": conversation_history,
                }
            },
        )

        final_response = result[-1].content if result else "No response generated"

        return jsonify({"response": final_response, "status": "success"})
    except Exception as e:
        return jsonify({"error": str(e), "status": "error"}), 500


if __name__ == "__main__":
    app.run(debug=True)
