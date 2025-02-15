import "dotenv/config";
import express from "express";
import ExtensionRouter from "./routes/extension";

const PORT = process.env.PORT || 4000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/extension", ExtensionRouter);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Internal Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

app.listen(PORT, () => {
  console.log(`Server started at Port ${PORT}`);
});
