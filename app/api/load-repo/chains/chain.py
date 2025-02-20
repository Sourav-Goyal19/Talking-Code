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
            when applicable. Ensure your responses are detailed, structured, 
            and easy to follow.
            
            START CONTEXT BLOCK
            {context}
            END OF CONTEXT BLOCK

            START CONVERSATION HISTORY
            {conversation_history}
            END CONVERSATION HISTORY

            Use the provided context and conversation history to generate precise, informative, and relevant answers.
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
            Your goal is to provide a detailed critique while considering the conversation history to ensure consistency and relevance.

            **Evaluation Criteria:**
            - **Accuracy:** Does it correctly answer the question?
            - **Completeness:** Does it provide all necessary details, including explanations and relevant code snippets?
            - **Clarity:** Is it easy to understand for a technical intern?
            - **Actionability:** Can the intern use this response to proceed with their task effectively?
            - **Consistency:** Does the response align with prior discussion in the conversation history?

            **Instructions:**
            - Review the AI-generated response.
            - Compare it with previous messages in the conversation history.
            - Highlight any errors, missing details, or inconsistencies.
            - Suggest improvements where necessary.

            START Conversation History:
            --------------------
            {conversation_history}
            --------------------
            END Conversation History:

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
            """You are an AI editor tasked with improving a previous response based on a senior engineer's critique. 
            Use the critique and conversation history to enhance the response's **accuracy, completeness, clarity, 
            and actionability** while maintaining consistency with previous exchanges.

            **Important Note** - Just provide the complete revised response without any extra lines.

            START CONVERSATION HISTORY:
            --------------------
            {conversation_history}
            --------------------
            END CONVERSATION HISTORY

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
