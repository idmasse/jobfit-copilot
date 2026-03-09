## JobFit Copilot

JobFit Copilot is an AI-powered tool that compares a **job posting** with your **resume** and surfaces what matters for an interview: how strong the fit is, what’s missing, and how to rewrite your resume for that specific role.

#### App can be previewed at: https://jobfit-copilot.vercel.app/

---

## What it does

On the main screen you can:

- **Paste a job description** – the full posting, including responsibilities and requirements.
- **Paste your resume** – or the most relevant sections for that role.
- Click **Analyze fit** to get:
  - **Match score** (0–100) with a visual bar.
  - **Summary** of how well you align with the role.
  - **Strengths**: where your experience maps cleanly to the posting.
  - **Gaps / risks**: missing skills, seniority mismatches, or weak signals.
  - **Resume bullet upgrades**: concrete bullet suggestions tuned to that job.
  - **Cover letter draft** you can tweak and send.

While the structured score and sections are computed, a **live “analysis in progress” feed** streams in token‑by‑token so the UI feels responsive and transparent.

---

## How it works

- **Streaming analysis channel**
  - `POST /api/analyze-stream` uses the OpenAI Chat Completions API in **streaming mode**.
  - The server exposes this as **Server‑Sent Events (SSE)** and emits JSON events:
    - `ready` >> stream initialized
    - `delta` >> new text chunk from the model
    - `done` / `error` >> completion state
  - The client reads these events with a `ReadableStream` reader and renders the text live in a scrollable panel.

- **Structured scoring channel**
  - `POST /api/analyze` sends the same inputs with a strict JSON‑only prompt and `response_format: { type: "json_object" }`.
  - The backend parses this into a strongly typed `AnalysisResult` (`matchScore`, `summary`, `strengths`, `gaps`, `resumeImprovements`, `coverLetter`).
  - The React UI renders this in the right‑hand “Fit analysis” panel once the JSON response is available.

Both calls are fired in parallel from the client so you get **instant streaming feedback** and **eventual structured output** without extra round‑trips.

--- 

## Running it locally

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create a `.env.local` file in the project root:

   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

Open `http://localhost:3000` and paste a job description + your resume to see the streaming analysis and structured fit breakdown. 

---

##Future Improvements
- Make the analyze stream accessible with a toggler
- Persist user data with either local storage or integrated with postgres
- UI Improvements