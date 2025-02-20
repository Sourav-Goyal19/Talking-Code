import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

generation_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an AI code assistant who answers questions about the codebase. Your
            target audience is a technical intern who is looking to understand the
            codebase. Provide detailed, step-by-step instructions, including code snippets
            when applicable.
            START CONTEXT BLOCK
            {context}
            END OF CONTEXT BLOCK
            START CONVERSATION HISTORY
            {conversation_history}
            END CONVERSATION HISTORY
            """,
        ),
        ("human", "START QUESTION\n{question}\nEND OF QUESTION"),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

reflection_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a senior software engineer reviewing an AI-generated response to a technical question about a codebase. 
            Evaluate the response based on:
            - **Accuracy:** Does it correctly answer the question?
            - **Completeness:** Does it provide all necessary details, including explanations and relevant code snippets?
            - **Clarity:** Is it easy to understand for a technical intern?
            - **Actionability:** Can the intern use this response to proceed with their task effectively?
            
            Provide a concise but detailed critique of the AI's response. Highlight errors, missing information, or unclear explanations.
            
            AI Response:
            {messages}
            
            Original Question:
            {question}
            
            Critique:
            """,
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

refine_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an AI editor tasked with improving a previous response based on a senior engineer's critique. Use the critique to enhance the response's accuracy, completeness, clarity, and actionability. Provide a revised response tailored for a technical intern.

            **Important Note** - Just Provide the complete revised response without any extra line.

            Original Response:
            {original_response}

            Critique:
            {critique}

            Revised Response:
            """,
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash", api_key=os.getenv("GOOGLE_API_KEY")
)

generation_chain = generation_prompt | llm
reflection_chain = reflection_prompt | llm
refine_chain = refine_prompt | llm
