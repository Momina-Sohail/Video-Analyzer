# Product Requirements Document
## AI Video Analyzer — Transcription, Summarization & Step Extraction Platform

**Version:** 1.0 (Draft for engineering loop)
**Owner:** Product/Engineering
**Target Deploy:** Vercel (Monorepo)

---

## 1. Product Summary

A web platform where a user either **uploads an MP4** or **pastes a video URL** (YouTube shorts, long-form YouTube, or other supported hosts). The system:

1. Ingests the video.
2. Compresses/extracts audio to **MP3** (not full video compression — this is an audio-extraction step for transcription efficiency).
3. Transcribes the audio using **Groq (Whisper-large-v3 on Groq)** as the primary transcriber.
4. Falls back automatically to **Gemini** (Gemini's native audio/video understanding) if Groq fails, times out, or hits rate limits.
5. Runs the transcript (or, for Gemini fallback, the video directly) through an LLM summarization step to produce:
   - A short summary
   - A structured **step-by-step breakdown** ("what happens / what to do") of the video content
6. Displays results in a polished dashboard using a **Bento grid layout**, with **Remotion**-rendered highlight/summary video clips and **Lottie** micro-animations for loading/success states.

This document defines scope, architecture, data model, and a phased delivery plan sized for an iterative "engineering loop" — build, verify, refine — until the desired output is reached.

---

## 2. Goals & Non-Goals

**Goals**
- Accept both file upload (MP4) and URL input (YouTube first; extensible to other platforms).
- Deterministic pipeline: Ingest → Extract Audio (MP3) → Transcribe → Summarize → Store → Render.
- Dual-provider transcription with automatic failover (Groq primary, Gemini fallback), both API keys configurable simultaneously.
- Deployable as a single Vercel project from a monorepo.
- Visually distinctive UI (Bento grid + Remotion + Lottie), not a generic dashboard template.

**Non-Goals (v1)**
- No user-generated video editing/export tools.
- No multi-language dubbing.
- No live/streaming video analysis (batch/on-demand only).
- No mobile native app — responsive web only.

---

## 3. Critical Architecture Constraint (read first)

Vercel serverless functions have hard execution limits (10s on Hobby, up to 300–800s on Pro/Enterprise with Fluid Compute, depending on plan). **FFmpeg audio extraction + long-video transcription + LLM summarization will routinely exceed these limits for anything beyond a short clip.**

Recommendation baked into this PRD: the *web app* (Next.js) runs on Vercel and only handles UI, auth, job creation, and polling/status. All **heavy processing (download, ffmpeg, transcription, summarization)** runs in a **separate worker service** (queue-consumer) deployed outside Vercel's function timeout constraints — e.g. a lightweight Node/Python worker on Railway, Render, or Fly.io, or a Vercel **Background Function / Queue** if using Vercel's newer async primitives. This keeps the monorepo intact (worker lives as its own app inside the repo) while respecting platform limits. This is treated as a hard requirement, not an optimization, to avoid rebuilding the architecture mid-project.

---

## 4. Monorepo Structure

Using **Turborepo** (npm/pnpm workspaces) so Vercel can build only the `web` app while the `worker` deploys separately.

```
video-analyzer/
├── apps/
│   ├── web/                 # Next.js 14+ (App Router) — deployed on Vercel
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   ├── dashboard/
│   │   │   ├── video/[id]/
│   │   │   └── api/         # thin API routes: create job, poll status, webhooks
│   │   ├── components/
│   │   │   ├── bento/
│   │   │   ├── remotion-player/
│   │   │   └── lottie/
│   │   └── remotion/        # Remotion compositions (rendered client-side or via Lambda/worker)
│   └── worker/               # Background processor — deployed on Railway/Fly/Render
│       ├── src/
│       │   ├── queue/
│       │   ├── ffmpeg/
│       │   ├── transcribe/  # groq.ts, gemini.ts, fallback-orchestrator.ts
│       │   └── summarize/
│       └── Dockerfile
├── packages/
│   ├── ui/                   # shared shadcn/ui + Tailwind components
│   ├── db/                   # Prisma/Drizzle schema + client (shared by web & worker)
│   ├── types/                # shared TS types/DTOs
│   └── config/                # eslint, tsconfig, tailwind config
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## 5. User Flows

**Flow A — Upload MP4**
1. User drags/drops or selects an MP4 (client-side size/type validation).
2. File uploads directly to object storage (Vercel Blob or S3-compatible) via signed URL — never through the Vercel function body limit.
3. A `VideoJob` row is created (`status: queued`).
4. Worker picks up job → extracts MP3 via ffmpeg → transcribes → summarizes → writes results → marks `status: complete`.
5. Frontend polls (or uses SSE/WebSocket) and updates the Bento dashboard live.

**Flow B — Paste URL (YouTube etc.)**
1. User pastes a URL.
2. Backend validates + fetches metadata (title, duration, thumbnail) via `yt-dlp` or platform API.
3. Same job pipeline as Flow A, using `yt-dlp` to fetch source audio/video instead of a direct upload.

**Flow C — View Results**
1. Summary card, step-by-step breakdown, key moments/timestamps.
2. Optional: Remotion-rendered "highlight reel" composition combining key-frame thumbnails + captions from the transcript's most important segments.
3. Export summary as Markdown/PDF/share link.

---

## 6. Frontend / UI-UX

**Design language:** Bento grid as the core dashboard layout — asymmetric card sizes for: video preview, transcript, summary, step list, metadata, and the Remotion highlight player.

- **Framework:** Next.js (App Router) + Tailwind + shadcn/ui.
- **Bento Grid:** CSS grid with `grid-template-areas`, responsive collapse to single column on mobile.
- **Remotion:** used for (a) an in-app "recap" composition rendered from summary + key thumbnails, (b) optionally rendered server-side via Remotion Lambda/worker for downloadable MP4 recaps.
- **Lottie:** loading states for each pipeline stage (uploading → extracting audio → transcribing → summarizing), plus success/error micro-animations. Use `lottie-react` with small `.json` assets (<50KB each) to keep bundle light.
- **Real-time status:** Poll `/api/jobs/:id` every 2–3s, or upgrade to SSE for push updates once a stage completes.
- **States to design explicitly:** empty state, uploading, processing (multi-stage progress), partial failure (Groq failed → Gemini fallback engaged, shown transparently to the user), complete, error/retry.

---

## 7. Backend / Processing Pipeline

**apps/web/api (thin layer, Vercel):**
- `POST /api/jobs` — create job from upload reference or URL.
- `GET /api/jobs/:id` — status + results.
- `POST /api/webhooks/worker` — worker reports stage completion (signed webhook).
- Auth (NextAuth or Clerk) + rate limiting per user.

**apps/worker (heavy lifting, non-Vercel):**
1. **Ingest:** if URL → `yt-dlp` download; if upload → pull from Blob/S3.
2. **Audio extraction:** `ffmpeg -i input.mp4 -vn -acodec libmp3lame -q:a 4 output.mp3` (down-sampled MP3, mono, ~64–96kbps — enough for transcription accuracy without excess payload size).
3. **Transcription orchestrator** (`fallback-orchestrator.ts`):
   - Try Groq (`whisper-large-v3` via Groq's OpenAI-compatible endpoint) first — fast + cheap.
   - On timeout, 429, 5xx, or empty result → automatically retry with Gemini (audio/video input, native multimodal transcription + optional direct summarization).
   - Both API keys stored simultaneously in env/config so failover is instant, no user action needed.
   - Log which provider served each job (for cost/reliability monitoring).
4. **Summarization:** transcript → LLM prompt producing structured JSON: `{ summary, key_points[], steps[]: {title, description, timestamp}, topics[] }`. Same fallback pattern (Groq's Llama model primary, Gemini fallback) or a dedicated summarization model — configurable.
5. **Persist results**, mark job complete, notify web app.

---

## 8. Database Schema

Postgres (Neon or Supabase — both integrate cleanly with Vercel), accessed via Prisma or Drizzle from a shared `packages/db`.

```
User            id, email, created_at, plan

ApiKeys         id, user_id, provider (groq|gemini), encrypted_key, created_at
                -- allows per-user BYO keys as well as platform default keys

VideoJob        id, user_id, source_type (upload|url), source_url, blob_url,
                status (queued|extracting|transcribing|summarizing|complete|failed),
                provider_used (groq|gemini), error_message,
                duration_seconds, created_at, completed_at

Transcript      id, job_id, raw_text, segments (jsonb: [{start,end,text}]), provider

Summary         id, job_id, summary_text, key_points (jsonb),
                steps (jsonb: [{order,title,description,timestamp}]),
                topics (jsonb)

RenderedAsset   id, job_id, type (remotion_recap|thumbnail), url, created_at
```

Indexes on `VideoJob.user_id`, `VideoJob.status` for dashboard queries and worker polling.

---

## 9. Third-Party Integrations

| Purpose | Primary | Fallback |
|---|---|---|
| Transcription | Groq (Whisper-large-v3) | Gemini (multimodal) |
| Summarization | Groq (Llama 3.x) or OpenAI | Gemini |
| Video download (URL flow) | yt-dlp | — |
| Object storage | Vercel Blob | S3-compatible |
| Queue | Upstash Redis / QStash or BullMQ on worker | — |
| Database | Neon Postgres | Supabase Postgres |
| Auth | Clerk or NextAuth | — |

Both `GROQ_API_KEY` and `GEMINI_API_KEY` are configured at all times (not conditionally) so the fallback orchestrator can switch mid-job with zero added latency from key provisioning.

---

## 10. Non-Functional Requirements

- **Reliability:** every pipeline stage retried up to 2x before falling back to the secondary provider; job marked `failed` with a clear reason only after both providers exhausted.
- **Security:** API keys encrypted at rest; signed URLs for uploads; webhook signature verification between worker and web app.
- **Cost control:** track token/second usage per provider per job for cost dashboards.
- **Observability:** structured logs per job stage; Sentry (or similar) on both `web` and `worker`.
- **Scalability:** worker horizontally scalable (stateless consumers reading from queue).

---

## 11. Phased Delivery Plan (Engineering Loop)

**Phase 0 — Foundation**
Monorepo scaffold (Turborepo), shared packages, DB schema + migrations, Vercel project wired to `apps/web`, worker skeleton deployed to Railway/Fly with a "hello job" round trip.

**Phase 1 — Core Pipeline (MVP)**
Upload flow → ffmpeg MP3 extraction → Groq transcription → basic summary → results page (no Bento/Remotion polish yet, functional only). Validate the fallback-to-Gemini path with simulated Groq failure.

**Phase 2 — URL Ingestion**
Add `yt-dlp` based URL flow (YouTube shorts + long-form), metadata fetch, thumbnail extraction.

**Phase 3 — UI/UX Polish**
Bento grid dashboard, Lottie stage animations, step-by-step breakdown UI, transcript viewer with timestamp sync.

**Phase 4 — Remotion Layer**
Recap composition (thumbnails + captions from summary), in-browser preview, server-rendered downloadable recap MP4 via worker or Remotion Lambda.

**Phase 5 — Hardening & Launch**
Auth, rate limiting, BYO API keys per user, cost dashboards, error-state UX, load testing on the worker queue, final Vercel production deploy.

Each phase is intended to close with a working, demoable increment — the loop is: build phase → verify against this PRD's acceptance criteria for that phase → refine → move on.

---

## 12. Open Questions

- Which platforms beyond YouTube need URL support in v1 (TikTok, Instagram Reels, Vimeo)?
- Should Remotion recap rendering happen synchronously (worker) or via Remotion Lambda for parallelism at scale?
- Per-user BYO API keys vs. platform-provided keys with usage-based billing — pick one for v1 pricing model?
- Max video length/file size ceiling for v1 (affects ffmpeg + transcription cost and worker timeout budgeting)?