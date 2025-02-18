import express, { Request, Response } from "express";
import { z } from "zod";
import { generateEmbeddings } from "../../lib/github-load";
import { db } from "../../db/drizzle";
import { sourceCodeEmbeddingTable } from "../../db/schema";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { chainWithHistory } from "../../lib/langchain";

const router = express.Router();

const queryAnswerSchema = z.object({
  query: z
    .string()
    .min(5, "Atleast 5 characters are required to start the query"),
  projectId: z.string().uuid("Invalid Project Id"),
  last3Messages: z.array(
    z.object({
      query: z.string(),
      ai_response: z.string(),
    })
  ),
});

router.post("/query-stream", async (req: Request, res: Response) => {
  console.log("Request to /query-stream");
  try {
    const parsed = queryAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { query, projectId, last3Messages } = parsed.data;

    const queryEmbeddings = await generateEmbeddings(query);

    const results = await db
      .select({
        sourceCode: sourceCodeEmbeddingTable.sourceCode,
        fileName: sourceCodeEmbeddingTable.fileName,
        summary: sourceCodeEmbeddingTable.summary,
        similarity: sql<number>`1 - (${cosineDistance(
          sourceCodeEmbeddingTable.summaryEmbedding,
          queryEmbeddings
        )})`,
      })
      .from(sourceCodeEmbeddingTable)
      .where(eq(sourceCodeEmbeddingTable.projectId, projectId))
      .orderBy((t) => desc(t.similarity))
      .limit(10);

    // console.log(results);

    const updatedData = results.map((item) => ({
      ...item,
      fileName: item.fileName.replaceAll("\\", "/"),
      sourceCode: item.sourceCode.replaceAll(
        "================================================",
        ""
      ),
    }));

    // console.log(updatedData);

    let context = "";

    for (const doc of updatedData) {
      context += `source: ${doc.fileName}\n, code content: ${doc.sourceCode}\n, summary of file: ${doc.summary}\n `;
    }

    // console.log(context);

    const output = await chainWithHistory.stream({
      context,
      question: query,
      conversation_history: last3Messages,
    });

    for await (const chunk of output) {
      res.write(chunk);
    }
    res.status(200).end();
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({ error: "Failed to process query" });
  }
});

export default router;
