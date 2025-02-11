import { z } from "zod";
import { Hono } from "hono";
import { db } from "@/db/drizzle";
import { eq } from "drizzle-orm";
import { pullCommits } from "@/lib/github";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { indexGithubRepo } from "@/lib/github-loader";
import { projectsTable, usersTable } from "@/db/schema";

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

        return ctx.json({ ...project }, 200);
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
  );

export default app;
