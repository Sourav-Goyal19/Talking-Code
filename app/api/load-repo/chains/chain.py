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
            target audience is a technical intern seeking to understand the codebase.
            Provide **detailed, step-by-step** explanations, including code snippets where applicable. 
            Ensure responses are **structured, clear, and easy to follow**.

            # First, refer to conversation history to maintain continuity.
            # Then, use the provided context for additional relevant details.

            START CONVERSATION HISTORY
            {conversation_history}
            END OF CONVERSATION HISTORY

            START CONTEXT BLOCK
            {context}
            END OF CONTEXT BLOCK

            Use conversation history to build upon prior responses and maintain coherence.
            Use context to enhance your answer with relevant technical details.
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
            Your goal is to provide a **detailed critique**, ensuring the response is **accurate, complete, clear, actionable,** and 
            consistent with prior discussions.

            **Evaluation Criteria:**
            - **Accuracy:** Does it correctly answer the question?
            - **Completeness:** Does it provide all necessary details, including explanations and relevant code snippets?
            - **Clarity:** Is it easy to understand for a technical intern?
            - **Actionability:** Can the intern use this response effectively?
            - **Consistency:** Does it align with prior discussion in the conversation history?

            **Instructions:**
            - First, refer to **conversation history** to ensure continuity.
            - Then, compare the AI-generated response with the original question.
            - Identify errors, missing details, or inconsistencies.
            - Suggest **clear, actionable improvements**.

            START CONVERSATION HISTORY:
            --------------------
            {conversation_history}
            --------------------
            END CONVERSATION HISTORY

            **AI Response:**
            {messages}

            **Original Question:**
            {question}

            **Critique:**
            """,
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)

refine_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an AI editor refining a response based on a **senior engineer's critique**.
            Your task is to improve the response's **accuracy, completeness, clarity, and actionability** while ensuring 
            consistency with past interactions.

            # First, review conversation history to maintain continuity.
            # Then, use the critique to refine the response effectively.

            **Important Note**: Only provide the **fully revised response** without additional commentary.

            START CONVERSATION HISTORY:
            --------------------
            {conversation_history}
            --------------------
            END CONVERSATION HISTORY

            **Original Response:**
            {original_response}

            **Critique:**
            {critique}

            **Revised Response:**
            """,
        ),
        MessagesPlaceholder(variable_name="messages"),
    ]
)


llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro", api_key=os.getenv("GOOGLE_API_KEY")
)

generation_chain = generation_prompt | llm
reflection_chain = reflection_prompt | llm
refine_chain = refine_prompt | llm
