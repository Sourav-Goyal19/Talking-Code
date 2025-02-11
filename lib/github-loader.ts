"use client";
import { llm } from "./github";
import { db } from "@/db/drizzle";
import { TaskType } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";
import { sourceCodeEmbeddingTable } from "@/db/schema";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";

const summaryPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an intelligent senior software engineer specializing in onboarding junior software engineers onto a project.
    Your task is to summarize the purpose of a given code file to help a junior developer understand it.
    - Keep the summary concise (max 100 words).
    - Focus on the main functionality and purpose of the code.
    - Do not explain specific syntax unless necessary.
    - Provide a structured response without unnecessary explanations.
    `,
  ],
  [
    "human",
    `You are onboarding a junior software engineer and explaining to them the purpose of the "{fileName}" file.
    Here is the code:
    -----------
    {code}
    -----------
    Generate a summary of no more than 100 words.`,
  ],
]);

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

export const indexGithubRepo = async (
  projectId: string,
  github_url: string,
  branch: string = "main",
  github_token?: string
) => {
  console.log("Calling");
  try {
    const docs = await loadGithubRepo(github_url, branch, github_token);
    console.log(docs);
    const allEmbeddings = await generateAllEmbeddings(docs);

    const filteredEmbeddings = allEmbeddings
      .filter(
        (result) => result.status === "fulfilled" && result.value !== null
      )
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    if (filteredEmbeddings.length === 0) {
      console.log("No embeddings generated. Skipping database insertion.");
      return;
    }

    await db.insert(sourceCodeEmbeddingTable).values(
      filteredEmbeddings.map((embed) => ({
        projectId,
        summary: embed.summary,
        embedding: embed.embedding,
        sourceCode: embed.sourceCode,
        fileName: embed.fileName,
      }))
    );

    console.log("Successfully indexed GitHub repository.");
  } catch (error) {
    console.error("Error indexing GitHub repository:", error);
    throw new Error("Failed to index GitHub repository.");
  }
};

export const loadGithubRepo = async (
  github_url: string,
  branch: string = "main",
  github_token?: string
) => {
  try {
    console.log("Calling");
    const loader = new GithubRepoLoader(github_url, {
      branch,
      recursive: true,
      unknown: "warn",
      accessToken: github_token || "",
      ignoreFiles: ["bun.lockb"],
    });
    console.log("Calling");
    return await loader.load();
  } catch (error) {
    console.error("Error loading GitHub repo:", error);
    throw new Error("Failed to load GitHub repository.");
  }
};

export const generateAllEmbeddings = async (docs: Document[]) => {
  return Promise.allSettled(
    docs.map(async (doc) => {
      try {
        const summary = await generateSummary(doc);
        if (!summary) {
          console.warn(
            "Skipping document due to empty summary:",
            doc.metadata?.source
          );
          return null;
        }

        const embed = await generateEmbeddings(summary);
        return {
          summary,
          embedding: embed,
          sourceCode: doc.pageContent,
          fileName: doc.metadata.source as string,
        };
      } catch (error) {
        console.error(
          "Error processing document:",
          doc.metadata?.source,
          error
        );
        return null;
      }
    })
  );
};

export const generateSummary = async (doc: Document): Promise<string> => {
  try {
    const code = doc.pageContent.slice(0, 10000);

    const chain = summaryPrompt.pipe(llm);
    const res = await chain.invoke({ fileName: doc.metadata?.source, code });

    if (!res || !res.content) {
      console.warn("Empty response from LLM. Skipping this document.");
      return "";
    }

    return res.content as string;
  } catch (error) {
    console.error("Error generating summary:", error);
    return "";
  }
};

export const generateEmbeddings = async (summarizedCode: string) => {
  if (!summarizedCode) {
    throw new Error("Cannot generate embeddings for an empty summary.");
  }

  try {
    return await embeddings.embedQuery(summarizedCode);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings.");
  }
};
