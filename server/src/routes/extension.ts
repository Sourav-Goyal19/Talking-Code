import express from "express";
import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db/drizzle";
import {
  extensionProjectsTable,
  extensionSourceCodeEmbeddingTable,
} from "../../db/schema";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import {
  extensionIndexGithubRepo,
  generateEmbeddings,
} from "../../lib/github-load";
import { chain } from "../../lib/langchain";

const router = express.Router();

const newProjectSchema = z.object({
  github_url: z.string().url(),
});

const querySchema = z.object({
  query: z.string().min(5),
  github_url: z.string().url(),
});

router
  .post("/new", async (req: Request, res: Response) => {
    console.log("Request to /new");
    try {
      const parsed = newProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid GitHub URL" });
        return;
      }
      const { github_url } = parsed.data;

      const [existingProject] = await db
        .select()
        .from(extensionProjectsTable)
        .where(eq(extensionProjectsTable.githubUrl, github_url));

      if (existingProject) {
        res.status(400).json({ error: "Extension Project already exists" });
        return;
      }

      const [newExtensionProject] = await db
        .insert(extensionProjectsTable)
        .values({
          githubUrl: github_url,
        })
        .returning();

      if (!newExtensionProject) {
        res.status(500).json({ error: "Failed to create extension project" });
        return;
      }

      try {
        extensionIndexGithubRepo(newExtensionProject.id, github_url)
          .then((res) => console.log(res))
          .catch((err) => console.log(err));
      } catch (error) {
        console.log(error);
        await db
          .delete(extensionProjectsTable)
          .where(eq(extensionProjectsTable.id, newExtensionProject.id));
        res.status(500).json({ error: "Failed to create extension project" });
        return;
      }

      res.status(201).json({
        message: "Extension project created successfully",
        project: newExtensionProject,
      });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create extension project" });
    }
  })
  .post("/query", async (req: Request, res: Response) => {
    try {
      const parsed = querySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }
      const { query, github_url } = parsed.data;

      const [extensionProject] = await db
        .select()
        .from(extensionProjectsTable)
        .where(eq(extensionProjectsTable.githubUrl, github_url));

      if (!extensionProject) {
        res.status(400).json({ error: "Extension Project does not exist" });
        return;
      }

      const queryEmbeddings = await generateEmbeddings(query);

      const results = await db
        .select({
          sourceCode: extensionSourceCodeEmbeddingTable.sourceCode,
          fileName: extensionSourceCodeEmbeddingTable.fileName,
          summary: extensionSourceCodeEmbeddingTable.summary,
          similarity: sql<number>`1 - (${cosineDistance(
            extensionSourceCodeEmbeddingTable.summaryEmbedding,
            queryEmbeddings
          )})`,
        })
        .from(extensionSourceCodeEmbeddingTable)
        .where(
          eq(
            extensionSourceCodeEmbeddingTable.extensionProjectId,
            extensionProject.id
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

      const context = updatedData
        .map(
          (doc) =>
            `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary: ${doc.summary}`
        )
        .join("\n\n");

      const output = await chain.invoke({ context, question: query });

      res.status(200).json({ data: updatedData, output });
    } catch (error) {
      console.error("Error processing query:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  })
  .post("/query-stream", async (req: Request, res: Response) => {
    try {
      const parsed = querySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }
      const { query, github_url } = parsed.data;

      const [extensionProject] = await db
        .select()
        .from(extensionProjectsTable)
        .where(eq(extensionProjectsTable.githubUrl, github_url));

      if (!extensionProject) {
        res.status(400).json({ error: "Extension Project does not exist" });
        return;
      }

      const queryEmbeddings = await generateEmbeddings(query);

      const results = await db
        .select({
          sourceCode: extensionSourceCodeEmbeddingTable.sourceCode,
          fileName: extensionSourceCodeEmbeddingTable.fileName,
          summary: extensionSourceCodeEmbeddingTable.summary,
          similarity: sql<number>`1 - (${cosineDistance(
            extensionSourceCodeEmbeddingTable.summaryEmbedding,
            queryEmbeddings
          )})`,
        })
        .from(extensionSourceCodeEmbeddingTable)
        .where(
          eq(
            extensionSourceCodeEmbeddingTable.extensionProjectId,
            extensionProject.id
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

      const context = updatedData
        .map(
          (doc) =>
            `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary: ${doc.summary}`
        )
        .join("\n\n");

      const output = await chain.stream({ context, question: query });

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
