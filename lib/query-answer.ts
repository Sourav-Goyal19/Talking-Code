"use server";

import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { generateEmbeddings } from "./github-load";
import { sourceCodeEmbeddingTable } from "@/db/schema";
import { db } from "@/db/drizzle";
import { createStreamableValue } from "ai/rsc";
import { chain } from "@/app/api/[[...route]]/project";

export const getQueryAnswer = async (query: string, projectId: string) => {
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

  let context = "";

  for (const doc of results) {
    context += `source: ${doc.fileName}\n, code content: ${doc.sourceCode}\n, summary of file: ${doc.summary}\n `;
  }

  const stream = createStreamableValue();

  (async () => {
    const res = await chain.stream({
      context,
      question: query,
    });
    for await (const chunk of res) {
      stream.update(chunk);
    }
    stream.done();
  })();

  return { data: updatedData, output: stream.value };
};
