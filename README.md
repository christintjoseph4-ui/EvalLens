# EvalLens AI

EvalLens AI is a calm, evidence-grounded post-evaluation learning intelligence platform. It helps a student understand a teacher-evaluated paper, connect feedback to learning opportunities, and choose the next useful practice step.

Teachers remain the final authority. EvalLens interprets the evaluated paper; it does not re-grade or change marks.

## Features

- Real OpenAI Responses API analysis for uploaded question papers and evaluated answer papers
- Existing labelled sample journey for demo preview mode
- Strict Zod validation before results are rendered
- Question-wise evidence, supportive feedback, review-together boundaries, and revision planning
- Ask My Paper endpoint grounded in the validated analysis context
- Safe AI status endpoint and local verification script

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Zod
- OpenAI official JavaScript SDK
- Vitest

## Installation

```bash
npm install
```

## Environment

Create `.env.local` for local development:

```bash
OPENAI_API_KEY=replace_with_real_key
OPENAI_MODEL=gpt-5
MAX_UPLOAD_MB=20
OPENAI_ANALYSIS_MAX_OUTPUT_TOKENS=4500
OPENAI_CHAT_MAX_OUTPUT_TOKENS=900
OPENAI_REPAIR_MAX_OUTPUT_TOKENS=1200
```

Never use `NEXT_PUBLIC_OPENAI_API_KEY`. The API key is read only by server-side routes and scripts.

## Development

```bash
npm run dev
```

Open the local URL shown by Next.js.

## OpenAI Verification

Run a small real Responses API request from your local machine:

```bash
npm run verify:openai
```

The script checks that `OPENAI_API_KEY` exists, calls the configured model, confirms output is returned, and never prints the key.

## Supported Uploads

Required:

- Question paper: PDF, PNG, JPG, JPEG, WEBP
- Evaluated answer paper: PDF, PNG, JPG, JPEG, WEBP

Optional:

- Answer key
- Marking scheme

`MAX_UPLOAD_MB` controls the per-file upload size limit. Uploaded papers are processed in memory for analysis and are not persisted by default.

## API Routes

- `POST /api/analyze`: multipart paper analysis
- `POST /api/ask-paper`: grounded follow-up answers from the validated analysis
- `GET /api/ai-status`: safe integration status only
- `GET /api/health`: application health

`POST /api/analyse` remains as a compatibility alias for the new `/api/analyze` route.

## Privacy Behavior

Your documents are used to generate the requested analysis. Avoid uploading papers containing unnecessary personal information. EvalLens does not store uploaded student papers permanently in this implementation, and it does not place full papers in browser local storage.

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The test suite covers upload validation, missing configuration, OpenAI timeout/rate-limit mapping, invalid model output, a mocked successful analysis response, Ask My Paper grounding, and public API-key exposure checks.

## Vercel Deployment

Set these environment variables in Vercel Project Settings:

- `OPENAI_API_KEY`: server-only OpenAI API key
- `OPENAI_MODEL`: optional model override, defaults to `gpt-5`
- `MAX_UPLOAD_MB`: optional per-file upload size, defaults to `20`
- `OPENAI_ANALYSIS_MAX_OUTPUT_TOKENS`: optional analysis output cap, defaults to `4500`
- `OPENAI_CHAT_MAX_OUTPUT_TOKENS`: optional Ask My Paper output cap, defaults to `900`
- `OPENAI_REPAIR_MAX_OUTPUT_TOKENS`: optional repair output cap, defaults to `1200`

Deploy with the default Next.js settings:

```bash
npm run build
npx vercel
```

After deployment, confirm `/api/health` and `/api/ai-status` respond successfully. `/api/ai-status` never returns secrets.

## Troubleshooting

- Missing configuration: add `OPENAI_API_KEY` to `.env.local` or Vercel environment variables.
- Rate limit: wait briefly and retry.
- File rejected: use PDF, PNG, JPG, JPEG, or WEBP under the configured size limit.
- Timeout: retry with clearer or smaller documents.
- Invalid model output: retry; malformed AI responses are blocked by Zod and never silently rendered.

## Demo Flow

The `/sample` route remains a clearly labelled demo-preview mode. The real upload flow uses `/api/analyze` and does not use sample or deterministic analysis responses.
