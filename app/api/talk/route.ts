import { db } from "@/db/drizzle";
import { sourceCodeEmbeddingTable } from "@/db/schema";
import { generateEmbeddings } from "@/lib/github-loader";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const projectId = request.nextUrl.searchParams.get("projectId") || "";

    const translateToEnglishResponse = await genAI
      .getGenerativeModel({ model: "gemini-pro" })
      .generateContent(`Translate this to English: ${data.question}`);

    const englishText = translateToEnglishResponse.response.text();
    const questionEmbedding = await generateEmbeddings(englishText || "");

    const similarity = sql<number>`1-(${cosineDistance(
      sourceCodeEmbeddingTable.summaryEmbedding,
      questionEmbedding
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

    const context = updatedData
      .map(
        (doc) =>
          `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\nsummary of file: ${doc.summary}\n`
      )
      .join("\n");

    const chatResponse = await genAI
      .getGenerativeModel({ model: "gemini-pro" })
      .generateContent(
        `Based on this GitHub repo context:\n${context}\nAnswer: ${englishText} and only return back in ${data.language} language not any other language`
      );

    const aiResponse = chatResponse.response.text();

    return NextResponse.json({ content: aiResponse });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
