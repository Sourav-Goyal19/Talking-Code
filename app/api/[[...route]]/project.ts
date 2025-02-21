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
import axios from "axios";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
// import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
    You are an AI code assistant helping a technical intern understand the codebase.
    Your responses should be knowledgeable, clear, step-by-step, and technically accurate.
    You must maintain coherence by considering past interactions and avoiding repetition.

    AI assistant is a highly intelligent and articulate entity with expert-level programming knowledge.
    AI is always helpful, friendly, and provides insightful responses with relevant code snippets.

    # First, focus on conversation history to maintain continuity.
    # Then, refer to the provided context for additional relevant details.

    START CONVERSATION HISTORY
    {conversation_history}
    END OF CONVERSATION HISTORY

    START CONTEXT BLOCK
    {context}
    END OF CONTEXT BLOCK

    If the question builds on a previous one, provide a response that extends past discussions rather than repeating information.
    If clarification is needed, politely ask the user for more details.
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

// const llm = new ChatAnthropic({
//   model: "claude-3-5-sonnet-20240620",
//   temperature: 0,
//   apiKey: process.env.CLAUDE_API_KEY,
// });

export const chain = prompt.pipe(llm).pipe(new StringOutputParser());

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
        const res = await axios.get(
          `${process.env.PYTHON_BACKEND_URL}/tree?github_url=${githubUrl}`
        );
        if (res.status !== 200) {
          throw new HTTPException(500, { message: "Failed to get tree" });
        }
        if (!res.data.tree) {
          throw new HTTPException(500, { message: "Failed to get tree" });
        }
        const [project] = await db
          .insert(projectsTable)
          .values({
            name: projectName,
            githubUrl,
            userId: user.id,
            treeStructure: res.data.tree,
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
        conversation_history: "",
      });
      return ctx.json({ data: updatedData, output: res });
    }
  );

export default app;
