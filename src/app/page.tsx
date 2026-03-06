"use client";

import { FormEvent, useState } from "react";

type AnalysisResult = {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  resumeImprovements: string[];
  coverLetter: string;
};

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [streamText, setStreamText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setStreamText("");

    if (!jobDescription.trim() || !resume.trim()) {
      setError("Please paste both a job description and your resume.");
      return;
    }

    setLoading(true);

    try {
      const payload = JSON.stringify({ jobDescription, resume });

      const streamPromise = (async () => {
        const streamResponse = await fetch("/api/analyze-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
        });

        if (!streamResponse.ok || !streamResponse.body) {
          return;
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!line) continue;

            try {
              const evt = JSON.parse(line.slice("data: ".length)) as
                | { type: "ready" }
                | { type: "delta"; delta: string }
                | { type: "done" }
                | { type: "error"; message: string };

              if (evt.type === "delta") {
                setStreamText((prev) => prev + evt.delta);
              } else if (evt.type === "error") {
                setError(evt.message);
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      })();

      const analyzePromise = (async () => {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

          throw new Error(
            data?.error || "The server returned an unexpected error.",
          );
        }

        const data = (await response.json()) as AnalysisResult;
        setResult(data);
      })();

      await Promise.allSettled([streamPromise, analyzePromise]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0f14] via-[#0b0f14] to-[#0f172a] text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-16">
        <header className="space-y-4">
          <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur">
            AI-powered resume & role fit in seconds
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                JobFit Copilot
              </h1>
              <p className="max-w-2xl text-sm text-zinc-300 sm:text-base">
                Paste a job description and your resume. Get an instant match
                score, strengths, gaps, and concrete bullet suggestions plus a
                tailored cover letter draft you can tweak.
              </p>
            </div>
            <div className="text-sm text-zinc-400">
              Built with Next.js, TypeScript, and OpenAI.
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-2">
          <form
            onSubmit={handleAnalyze}
            className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur sm:p-6"
          >
            <div className="space-y-2">
              <label
                htmlFor="job"
                className="text-sm font-medium text-zinc-200"
              >
                Job description
              </label>
              <textarea
                id="job"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={8}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-50 shadow-sm outline-none ring-0 transition placeholder:text-zinc-500 focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-400/30"
                placeholder="Paste the full job posting here, including responsibilities and requirements..."
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="resume"
                className="text-sm font-medium text-zinc-200"
              >
                Your resume
              </label>
              <textarea
                id="resume"
                value={resume}
                onChange={(event) => setResume(event.target.value)}
                rows={8}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-50 shadow-sm outline-none ring-0 transition placeholder:text-zinc-500 focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-400/30"
                placeholder="Paste your resume, or a relevant section of it, as plain text..."
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-glow inline-flex min-w-[9rem] items-center justify-center whitespace-nowrap rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-400/25 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Analyzing fit..." : "Analyze fit"}
              </button>
              <p className="hidden text-xs text-zinc-500 sm:block">
                We don&apos;t store your data. Everything runs live in your
                browser session.
              </p>
            </div>

            {error && (
              <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
          </form>

          <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur sm:p-6">
            {!result && !loading && (
              <div className="space-y-3 text-sm text-zinc-300">
                <h2 className="text-base font-semibold text-zinc-100">
                  Fit analysis
                </h2>
                <p>
                  Run an analysis to see how your resume lines up with this
                  role. You&apos;ll get:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                  <li>Overall match score</li>
                  <li>Key strengths and obvious gaps</li>
                  <li>Targeted bullet upgrades for your resume</li>
                  <li>A tailored cover letter draft</li>
                </ul>
              </div>
            )}

            {loading && (
              <div className="space-y-3 text-sm text-zinc-300">
                <h2 className="text-base font-semibold text-zinc-100">
                  Analyzing…
                </h2>
                <p className="text-zinc-400">
                  Live analysis is streaming in while we compute the structured
                  score and suggestions.
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
                </div>
                <div className="scrollbar-brand min-h-56 max-h-[60vh] overflow-y-auto rounded-md bg-black/20 p-3 text-xs text-zinc-200">
                  {streamText ? (
                    <pre className="whitespace-pre-wrap font-mono leading-relaxed text-zinc-200">
                      {streamText}
                    </pre>
                  ) : (
                    <p className="text-zinc-500">Waiting for first tokens…</p>
                  )}
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-5 text-sm text-zinc-100">
                <div className="space-y-3">
                  <h2 className="text-base font-semibold">Match score</h2>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Overall fit</span>
                    <span className="font-semibold text-emerald-400">
                      {Math.round(result.matchScore)} / 100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, result.matchScore),
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-zinc-300">{result.summary}</p>
                </div>

                {result.strengths?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      Strengths
                    </h3>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-200">
                      {result.strengths.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.gaps?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                      Gaps / risks
                    </h3>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-200">
                      {result.gaps.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.resumeImprovements?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-400">
                      Resume bullet upgrades
                    </h3>
                    <ul className="space-y-1 text-xs text-zinc-200">
                      {result.resumeImprovements.map((item, index) => (
                        <li
                          key={index}
                          className="rounded-md bg-zinc-900/80 px-3 py-2"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.coverLetter && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-fuchsia-400">
                      Cover letter draft
                    </h3>
                    <div className="scrollbar-brand max-h-64 space-y-2 overflow-y-auto rounded-md bg-zinc-900/80 p-3 text-xs text-zinc-200">
                      {result.coverLetter.split("\n").map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

