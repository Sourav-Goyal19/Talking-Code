import express from "express";
import { Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db/drizzle";
import {
  extensionProjectsTable,
  extensionSourceCodeEmbeddingTable,
} from "../../db/schema";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import {
  extensionIndexGithubRepo,
  generateEmbeddings,
} from "../../lib/github-load";
import { chain } from "../../lib/langchain";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

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
        res.status(200).json({
          message: "Extension project already exists",
          project: existingProject,
        });
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
        await extensionIndexGithubRepo(newExtensionProject.id, github_url);
      } catch (error) {
        console.log(error);
        await db
          .delete(extensionProjectsTable)
          .where(eq(extensionProjectsTable.id, newExtensionProject.id));
        res.status(500).json({ error: "Failed to create extension project" });
        return;
      }

      res.status(200).json({
        message: "Extension project created successfully",
        project: newExtensionProject,
      });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create extension project" });
    }
  })
  .post("/query", async (req: Request, res: Response) => {
    console.log("Request to /query");
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

      res.status(200).json({ output });
    } catch (error) {
      console.error("Error processing query:", error);
      res.status(500).json({ error: "Failed to process query" });
    }
  })
  .post("/query-stream", async (req: Request, res: Response) => {
    console.log("Request to /query-stream");
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
  })
  .post("/query-with-translation", async (req: Request, res: Response) => {
    console.log("Request to /query-with-translation");
    try {
      const data = req.body;
      const projectId = req.query.projectId as string;

      const translateToEnglish = await genAI
        .getGenerativeModel({ model: "gemini-pro" })
        .generateContent(`Translate this to English: ${data.question}`);

      const englishText = translateToEnglish.response.text();
      const questionEmbedding = await generateEmbeddings(englishText || "");

      let context = "";

      const similarity = sql<number>`1-(${cosineDistance(
        extensionSourceCodeEmbeddingTable.summaryEmbedding,
        questionEmbedding
      )})`;

      const results = await db
        .select({
          fileName: extensionSourceCodeEmbeddingTable.fileName,
          summary: extensionSourceCodeEmbeddingTable.summary,
          sourceCode: extensionSourceCodeEmbeddingTable.sourceCode,
          similarity: similarity,
        })
        .from(extensionSourceCodeEmbeddingTable)
        .where(
          and(
            eq(extensionSourceCodeEmbeddingTable.extensionProjectId, projectId),
            gt(similarity, 0.5)
          )
        )
        .orderBy((t) => desc(t.similarity))
        .limit(10);

      for (const doc of results) {
        context += `source: ${doc.fileName}\n, code content: ${doc.sourceCode}\n, summary of file: ${doc.summary}\n `;
      }

      const chatResponse = await genAI
        .getGenerativeModel({ model: "gemini-pro" })
        .generateContent(
          `Based on this GitHub repo context:\n${context}\nAnswer: ${englishText}`
        );

      const aiEnglishResponse = chatResponse.response.text();

      const translateToUserLang = await genAI
        .getGenerativeModel({ model: "gemini-pro" })
        .generateContent(
          `Translate this back to the ${data.language} language: ${aiEnglishResponse}`
        );

      res.status(200).json({ content: translateToUserLang.response.text() });
    } catch (error) {
      console.error("Error processing request:", error);
      res
        .status(500)
        .json({ error: "An error occurred while processing your request." });
    }
  });

export default router;
