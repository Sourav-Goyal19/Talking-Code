import { z } from "zod";
import { Hono } from "hono";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { pullCommits } from "@/lib/github";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { generateEmbeddings, indexGithubRepo } from "@/lib/github-load";
import {
  projectsTable,
  sourceCodeEmbeddingTable,
  usersTable,
} from "@/db/schema";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { streamSSE } from "hono/streaming";

import { Ollama } from "@langchain/ollama";
import { ChatDeepSeek } from "@langchain/deepseek";
// const llm = new ChatDeepSeek({
//   model: "deepseek-reasoner",
//   temperature: 0,
//   apiKey: process.env.DEEPSEEK_API_KEY,
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

// const llm = new ChatAnthropic({
//   model: "claude-3-5-sonnet-20240620",
//   temperature: 0,
//   apiKey: process.env.CLAUDE_API_KEY,
// });

const app = new Hono()
  .post(
    "/new",
    zValidator(
      "param",
      z.object({
        email: z.string().email(),
      })
    ),
    zValidator(
      "json",
      z.object({
        projectName: z.string(),
        githubUrl: z.string().url(),
        accessToken: z.string().optional(),
      })
    ),
    async (ctx) => {
      const { email } = ctx.req.valid("param");
      const { projectName, githubUrl, accessToken } = ctx.req.valid("json");

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (!user) {
        throw new HTTPException(404, { message: "User Not Found" });
      }

      try {
        const [project] = await db
          .insert(projectsTable)
          .values({
            name: projectName,
            githubUrl,
            userId: user.id,
          })
          .returning();

        if (!project || !project.id) {
          throw new HTTPException(500, { message: "Failed to create project" });
        }

        try {
          await pullCommits(project.id);
        } catch (error) {
          console.error("Error pulling commits:", error);
          throw new HTTPException(500, { message: "Failed to pull commits" });
        }

        try {
          await indexGithubRepo(project.id, githubUrl, accessToken);
        } catch (error) {
          console.error("Error indexing GitHub repo:", error);
          throw new HTTPException(500, {
            message: "Failed to index GitHub repository",
          });
        }

        return ctx.json({ data: project }, 200);
      } catch (error: any) {
        console.error("Unexpected Error:", error?.stack || error);
        throw new HTTPException(500, { message: "Something Went Wrong" });
      }
    }
  )
  .get(
    "/all",
    zValidator(
      "param",
      z.object({
        email: z.string().email(),
      })
    ),
    async (ctx) => {
      const { email } = ctx.req.valid("param");
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (!user) {
        throw new HTTPException(404, { message: "User Not Found" });
      }

      const projects = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.userId, user.id));

      return ctx.json({ data: projects }, 200);
    }
  )
  .get(
    "/:id",
    zValidator(
      "param",
      z.object({
        email: z.string().email(),
        id: z.string().uuid("Invalid Project Id"),
      })
    ),
    async (ctx) => {
      const { email, id } = ctx.req.valid("param");
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (!user) {
        throw new HTTPException(404, { message: "User Not Found" });
      }

      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, id));

      if (!project) {
        throw new HTTPException(404, { message: "Project Not Found" });
      }

      return ctx.json({ data: project }, 200);
    }
  )
  .post(
    "/query",
    zValidator(
      "param",
      z.object({
        email: z.string().email("Unauthenticated"),
      })
    ),
    zValidator(
      "json",
      z.object({
        json: z.string().min(1, "Query is required"),
        projectId: z.string().uuid("Invalid project id"),
      })
    ),
    async (ctx) => {
      const { email } = ctx.req.valid("param");

      const { projectId, json } = ctx.req.valid("json");

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (!user) {
        throw new HTTPException(404, { message: "User Not Found" });
      }

      const queryVector = await generateEmbeddings(json);
      let context = "";

      const similarity = sql<number>`1-(${cosineDistance(
        sourceCodeEmbeddingTable.summaryEmbedding,
        queryVector
      )})`;

      const results = await db
        .select({
          fileName: sourceCodeEmbeddingTable.fileName,
          summary: sourceCodeEmbeddingTable.summary,
          sourceCode: sourceCodeEmbeddingTable.sourceCode,
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
        sourceCode: item.sourceCode.replace(
          "================================================",
          ""
        ),
      }));

      for (const doc of updatedData) {
        context += `source: ${doc.fileName}\n, code content: ${doc.sourceCode}\n, summary of file: ${doc.summary}\n `;
      }
      const res = await chain.invoke({
        context,
        question: json,
      });
      return ctx.json({ data: updatedData, output: res });
    }
  );

export default app;
