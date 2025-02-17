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
    const params = await request.nextUrl.searchParams;
    const projectId = params.get("projectId") || "";

    const translateToEnglish = await genAI
      .getGenerativeModel({ model: "gemini-pro" })
      .generateContent(`Translate this to English: ${data.question}`);

    const englishText = translateToEnglish.response.text();
    // console.log(JSON.parse(englishText));
    // const { language, questionInEnglish } = JSON.parse(englishText);
    const questionEmbedding = await generateEmbeddings(englishText || "");

    let context = "";

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

    for (const doc of updatedData) {
      context += `source: ${doc.fileName}\n, code content: ${doc.sourceCode}\n, summary of file: ${doc.summary}\n `;
    }

    const chatResponse = await genAI
      .getGenerativeModel({ model: "gemini-pro" })
      .generateContent(
        `Based on this GitHub repo context:\n${context}\nAnswer: ${englishText}`
      );

    const aiEnglishResponse = chatResponse.response.text();
    // console.log(aiEnglishResponse);

    const translateToUserLang = await genAI
      .getGenerativeModel({ model: "gemini-pro" })
      .generateContent(
        `Translate this back to the ${data.language} language: ${aiEnglishResponse}`
      );

    // console.log(translateToUserLang.response.text());

    return NextResponse.json({ content: translateToUserLang.response.text() });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
