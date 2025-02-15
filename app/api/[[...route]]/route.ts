import { Hono } from "hono";
import { handle } from "hono/vercel";
import { HTTPException } from "hono/http-exception";
import ProjectRouter from "./project";
import ExtensionRouter from "./extension";

export const runtime = "edge";

const app = new Hono().basePath("/api");

app.onError((err, ctx) => {
  console.log(err);
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return ctx.json({ error: err.message }, 500);
});

export const routes = app
  .get("/", (c) => {
    return c.json({ message: "Hello Hono!" });
  })
  .route("/:email/projects", ProjectRouter)
  .route("/extension", ExtensionRouter);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
