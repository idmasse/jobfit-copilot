import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sseEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      sseEvent({
        type: "error",
        message:
          "OPENAI_API_KEY is not configured on the server. Please set it in your environment variables.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      },
    );
  }

  let jobDescription = "";
  let resume = "";

  try {
    const body = (await req.json()) as {
      jobDescription?: string;
      resume?: string;
    };
    jobDescription = body.jobDescription ?? "";
    resume = body.resume ?? "";
  } catch {
    // ignore
  }

  if (!jobDescription || !resume) {
    return new Response(
      sseEvent({
        type: "error",
        message: "Both jobDescription and resume are required.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(sseEvent({ type: "ready" })));

      try {
        const systemPrompt =
          "You are an expert job application coach. " +
          "Given a job description and a candidate resume, provide a concise, high-signal analysis in plain text. " +
          "Use short sections with headings. Focus on what matters most for an interview loop. " +
          "End with a line exactly equal to: <END_OF_ANALYSIS>";

        const userContent = [
          "JOB DESCRIPTION:",
          jobDescription,
          "",
          "RESUME:",
          resume,
        ].join("\n");

        const response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          stream: true,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        });

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(encoder.encode(sseEvent({ type: "delta", delta })));
          }
        }

        controller.enqueue(encoder.encode(sseEvent({ type: "done" })));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected server error.";
        controller.enqueue(encoder.encode(sseEvent({ type: "error", message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

