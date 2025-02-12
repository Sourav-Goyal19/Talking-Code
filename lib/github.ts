import axios from "axios";
import { eq } from "drizzle-orm";
import { Octokit } from "octokit";
import { db } from "@/db/drizzle";
import { commitsTable, projectsTable } from "@/db/schema";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that summarizes code differences.
     Your task is to generate a concise summary of each commit's changes, highlighting key modifications in functionality, structure, or logic.
     The summary must contain at least 2-3 points.
     Strictly follow this format:
     - Each point must start with '#'.
     - Do not include any extra words, explanations, or formatting.
     - Only return the list of points, nothing else.
     - Each point must start with '#'.
    `,
  ],
  [
    "human",
    "Here is the code difference:\n\n{diff}\n\nGenerate a concise summary with key points.",
  ],
]);

export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,
});

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (
  github_url: string
): Promise<Response[]> => {
  const [owner, repo] = github_url.split("/").slice(-2);
  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }

  try {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 15,
    });

    return data.map((commit: any) => ({
      commitHash: commit.sha as string,
      commitMessage: commit.commit.message ?? "",
      commitAuthorName: commit.commit.author?.name ?? "",
      commitAuthorAvatar: commit.author?.avatar_url ?? "",
      commitDate: commit.commit.author.date ?? "",
    }));
  } catch (error: any) {
    console.error("Error fetching commits:", error.message);
    throw new Error("Failed to fetch commits from GitHub");
  }
};

export const pullCommits = async (projectId: string) => {
  const { project, github_url } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(github_url);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes
  );

  if (unprocessedCommits.length === 0) return [];

  const commitsWithSummary = await generateSummary(
    github_url,
    unprocessedCommits
  );

  const filteredCommitsWithSummary = commitsWithSummary
    .filter((commit) => commit.status == "fulfilled")
    .map(
      (result) =>
        (result as PromiseFulfilledResult<Response & { summary: string }>).value
    );
  // console.log(filteredCommitsWithSummary);
  await db.insert(commitsTable).values(
    filteredCommitsWithSummary.map((commit) => ({
      projectId: project.id,
      commitHash: commit.commitHash,
      commitMessage: commit.commitMessage,
      commitAuthorName: commit.commitAuthorName,
      commitAuthorAvatar: commit.commitAuthorAvatar,
      commitDate: commit.commitDate,
      summary: commit.summary as string,
    }))
  );
};

const generateSummary = async (
  github_url: string,
  unprocessedCommits: Response[]
) => {
  const chain = prompt.pipe(llm);

  return await Promise.allSettled(
    unprocessedCommits.map(async (commit) => {
      try {
        const { data: diff } = await axios.get(
          `${github_url}/commit/${commit.commitHash}.diff`,
          {
            headers: {
              Accept: "application/vnd.github.v3.diff",
            },
          }
        );

        const truncatedDiff = diff.substring(0, 5000);

        const res = await chain.invoke({ diff: truncatedDiff });

        // console.log("Summary:", res.content);
        return {
          ...commit,
          summary: res.content,
        };
      } catch (error: any) {
        console.error(
          `Failed to fetch summary for commit ${commit.commitHash}:`,
          error.message
        );
        return { ...commit, summary: "Summary unavailable due to an error." };
      }
    })
  );
};

const fetchProjectGithubUrl = async (projectId: string) => {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project || !project.githubUrl) {
    throw new Error("Project has no GitHub URL");
  }

  return { project, github_url: project.githubUrl };
};

const filterUnprocessedCommits = async (
  projectId: string,
  commitHashes: Response[]
) => {
  const processedCommits = await db
    .select()
    .from(commitsTable)
    .where(eq(commitsTable.projectId, projectId));

  return commitHashes.filter(
    (commit) =>
      !processedCommits.some((c) => c.commitHash === commit.commitHash)
  );
};
