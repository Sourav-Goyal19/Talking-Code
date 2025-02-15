import "dotenv/config";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { ChatAnthropic } from "@langchain/anthropic";

// const llm = new ChatAnthropic({
//   model: "claude-3-5-sonnet-20240620",
//   temperature: 0,
//   apiKey: process.env.CLAUDE_API_KEY,
// });

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
    You are a ai code assistant who answers questions about the codebase. Your
    target audience is a technical intern who is looking to understand the
    codebase.
    AI assistant is a brand new, powerful, human-like artificial intelligence.
    The traits of AI include expert knowledge, helpfulness, cleverness, and
    articulateness.
    AI is a well-behaved and well-mannered individual.
    AI is always friendly, kind, and inspiring, and he is eager to provide vivid
    and thoughtful responses to the user.
    AI has the sum of all knowledge in their brain, and is able to accurately
    answer nearly any question about any topic in conversation.
    If the question is asking about code or a specific file, AI will provide the
    detailed answer, giving step by step instructions, including code snippets.
    START CONTEXT BLOCK
    {context}
    END OF CONTEXT BLOCK
    `,
  ],
  [
    "human",
    `
    START QUESTION
    {question}
    END OF QUESTION`,
  ],
]);

export const chain = prompt.pipe(llm).pipe(new StringOutputParser());
