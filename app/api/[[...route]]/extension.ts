import { db } from "@/db/drizzle";
import {
  extensionProjectsTable,
  extensionSourceCodeEmbeddingTable,
} from "@/db/schema";
import {
  extensionIndexGithubRepo,
  generateEmbeddings,
} from "@/lib/github-load";
import { zValidator } from "@hono/zod-validator";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { chain } from "./project";

const app = new Hono()
  .post(
    "/new",
    zValidator(
      "json",
      z.object({
        github_url: z.string().url("Invalid Url"),
      })
    ),
    async (ctx) => {
      const { github_url } = ctx.req.valid("json");

      const [extensionProject] = await db
        .select()
        .from(extensionProjectsTable)
        .where(eq(extensionProjectsTable.githubUrl, github_url));

      if (extensionProject) {
        return ctx.json({ error: "Extension Project already exists" }, 400);
      }

      const [newExtensionProject] = await db
        .insert(extensionProjectsTable)
        .values({
          githubUrl: github_url,
        })
        .returning();

      if (!newExtensionProject) {
        return ctx.json({ error: "Failed to create extension project" }, 500);
      }

      try {
        await extensionIndexGithubRepo(newExtensionProject.id, github_url);
      } catch (error) {
        console.log(error);
        await db
          .delete(extensionProjectsTable)
          .where(eq(extensionProjectsTable.id, newExtensionProject.id));
        return ctx.json({ error: "Failed to index extension project" }, 500);
      }

      return ctx.json(
        { message: "Extension project created successfully" },
        200
      );
    }
  )
  .post(
    "/query",
    zValidator(
      "json",
      z.object({
        query: z.string(),
        github_url: z.string().url("Invalid github url"),
      })
    ),
    async (ctx) => {
      const { query, github_url } = ctx.req.valid("json");

      const [extensionProject] = await db
        .select()
        .from(extensionProjectsTable)
        .where(eq(extensionProjectsTable.githubUrl, github_url));

      if (!extensionProject) {
        return ctx.json({ error: "Extension Project does not exist" }, 400);
      }

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
          eq(
            extensionSourceCodeEmbeddingTable.extensionProjectId,
            extensionProject.id
          )
        )
        .orderBy((t) => desc(t.similarity))
        .limit(5);

      let context = "";

      const updatedData = results.map((item) => ({
        ...item,
        fileName: item.fileName.replaceAll("\\", "/"),
        sourceCode: item.sourceCode.replaceAll(
          "================================================",
          ""
        ),
      }));

      for (const doc of updatedData) {
        context += `source: ${doc.fileName}\n, code content: ${doc.sourceCode}\n, summary of file: ${doc.summary}\n `;
      }

      const output = await chain.invoke({
        context,
        question: query,
      });

      return ctx.json({ data: updatedData, output }, 200);
    }
  );

export default app;
