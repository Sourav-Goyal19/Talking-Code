import express, { Request, Response } from "express";
import { z } from "zod";
import { generateEmbeddings } from "../../lib/github-load";
import { db } from "../../db/drizzle";
import { extensionSourceCodeEmbeddingTable } from "../../db/schema";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { chainWithHistory } from "../../lib/langchain";

const router = express.Router();

const queryAnswerSchema = z.object({
  query: z.string().min(5),
  projectId: z.string().url(),
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
    const { query, projectId } = parsed.data;

    const queryEmbeddings = await generateEmbeddings(query);

    const results = await db
      .select({
        sourceCode: extensionSourceCodeEmbeddingTable.sourceCode,
        fileName: extensionSourceCodeEmbeddingTable.fileName,
        summary: extensionSourceCodeEmbeddingTable.summary,
        similarity: sql<number>`1 - (${cosineDistance(
          extensionSourceCodeEmbeddingTable.summaryEmbeddings,
          queryEmbeddings
        )})`,
      })
      .from(extensionSourceCodeEmbeddingTable)
      .where(
        eq(extensionSourceCodeEmbeddingTable.extensionProjectId, projectId)
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

    const context = updatedData
      .map(
        (doc) =>
          `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary: ${doc.summary}`
      )
      .join("\n\n");

    const output = await chainWithHistory.stream({ context, question: query });

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
