import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

type AnalysisResult = {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  resumeImprovements: string[];
  coverLetter: string;
};

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resume } = (await req.json()) as {
      jobDescription?: string;
      resume?: string;
    };

    if (!jobDescription || !resume) {
      return NextResponse.json(
        {
          error: "Both jobDescription and resume are required.",
        },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured on the server. Please set it in your environment.",
        },
        { status: 500 },
      );
    }

    const systemPrompt =
      "You are an expert job application coach. " +
      "Given a job description and a candidate resume, you will evaluate how well the resume fits the role. " +
      "You must respond with a single JSON object and nothing else. " +
      "The JSON object must have the following shape: " +
      "{ \"matchScore\": number (0-100), " +
      "\"summary\": string, " +
      "\"strengths\": string[], " +
      "\"gaps\": string[], " +
      "\"resumeImprovements\": string[], " +
      "\"coverLetter\": string }. " +
      "Be concrete and specific in your suggestions.";

    const userContent = [
      "JOB DESCRIPTION:",
      jobDescription,
      "",
      "RESUME:",
      resume,
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "No response content from the language model.",
        },
        { status: 500 },
      );
    }

    let parsed: AnalysisResult;

    try {
      parsed = JSON.parse(content) as AnalysisResult;
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to parse model response as JSON.",
          raw: content,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Unexpected server error. Please try again.",
      },
      { status: 500 },
    );
  }
}

