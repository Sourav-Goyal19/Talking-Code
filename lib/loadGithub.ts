"use client"

import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";

export const loadGithubRepo = async (
  github_url: string,
  branch: string = "main",
  github_token?: string
) => {
  try {``
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