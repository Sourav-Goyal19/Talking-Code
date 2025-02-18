"use server";

import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { generateEmbeddings } from "./github-load";
import { sourceCodeEmbeddingTable } from "@/db/schema";
import { db } from "@/db/drizzle";
import { createStreamableValue } from "ai/rsc";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { ChatAnthropic } from "@langchain/anthropic";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { StringOutputParser } from "@langchain/core/output_parsers";
import { chain } from "@/app/api/[[...route]]/project";

// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-1.5-flash",
//   apiKey: process.env.GOOGLE_API_KEY,
// });

// const llm = new ChatAnthropic({
//   model: "claude-3-5-sonnet-20240620",
//   temperature: 0,
//   apiKey: process.env.CLAUDE_API_KEY,
// });

type ChatMessageType = {
  query: string;
  ai_response: string;
};

export const getQueryAnswer = async (
  query: string,
  projectId: string,
  last3Messages: ChatMessageType[]
) => {
  const queryEmbeddings = await generateEmbeddings(query);
  const similarity = sql<number>`1-(${cosineDistance(
    sourceCodeEmbeddingTable.summaryEmbedding,
    queryEmbeddings
  )})`;

  const results = await db
    .select({
      fileName: sourceCodeEmbeddingTable.fileName,
      sourceCode: sourceCodeEmbeddingTable.sourceCode,
      summary: sourceCodeEmbeddingTable.summary,
      similarity: similarity,
    })
    .from(sourceCodeEmbeddingTable)
    .where(
      and(
        eq(sourceCodeEmbeddingTable.projectId, projectId),
        gt(similarity, 0.5)
      )
    )
    .orderBy((t) => desc(t.similarity))
    .limit(10);

  const updatedData = results.map((item) => ({
    ...item,
    fileName: item.fileName.replaceAll("\\", "/"),
    sourceCode: item.sourceCode.replaceAll(
      "================================================",
      ""
    ),
  }));

  let context = results
    .map(
      (doc) =>
        `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary: ${doc.summary}\n`
    )
    .join("\n");

  let conversationHistory = last3Messages
    .map(
      (msg, index) =>
        `Message ${index + 1}:\nUser: ${msg.query}\nAI: ${msg.ai_response}`
    )
    .join("\n\n");

  const stream = createStreamableValue();

  (async () => {
    const res = await chain.stream({
      context,
      conversation_history: conversationHistory,
      question: query,
    });
    for await (const chunk of res) {
      stream.update(chunk);
    }
    stream.done();
  })();

  return { data: updatedData, output: stream.value };
};
