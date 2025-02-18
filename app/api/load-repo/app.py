import os
import re
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from gitingest import ingest
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_sambanova import ChatSambaNovaCloud
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

load_dotenv()

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an intelligent senior software engineer specializing in onboarding junior software engineers onto a project.
            Your task is to summarize the purpose of a given code file to help a junior developer understand it.
            - Keep the summary concise (max 100 words).
            - Focus on the main functionality and purpose of the code.
            - Do not explain specific syntax unless necessary.
            - Provide a structured response without unnecessary explanations.""",
        ),
        (
            "human",
            """You are onboarding a junior software engineer and explaining to them the purpose of the "{fileName}" file.
            Here is the code:
            -----------
            {code}
            -----------
            Generate a summary of no more than 100 words.""",
        ),
    ]
)

os.environ["SAMBANOVA_API_KEY"] = os.getenv("SAMBANOVA_API_KEY")

# llm = ChatSambaNovaCloud(
#     model="Meta-Llama-3.3-70B-Instruct",
#     max_tokens=1024,
#     temperature=0.7,
#     top_p=0.01,
# )

# llm = ChatGoogleGenerativeAI(
#     model="gemini-1.5-pro",
#     temperature=0,
#     max_tokens=None,
#     timeout=None,
#     max_retries=2,
#     api_key=os.getenv("GOOGLE_API_KEY"),
# )

llm = ChatOpenAI(
    model="gpt-4-turbo",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
    api_key=os.getenv("OPENAI_API_KEY"),
)

chain = prompt | llm | StrOutputParser()

# print(chain.invoke({"fileName": "test.py", "code": "print('hello world')"}))

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


@app.route("/summarize", methods=["POST"])
def get_summary():
    print("Request to /summarize")
    data = request.json
    fileName = data.get("fileName")
    code = data.get("code")
    print(fileName, code)

    if not fileName or not code:
        return jsonify({"error": "Missing fileName or code"}), 400

    slicedCode = code[:7000]
    res = chain.invoke({"fileName": fileName, "code": slicedCode})
    print(res)
    return jsonify({"summary": res if res else ""}), 200


if __name__ == "__main__":
    app.run(debug=True)
