# EvalLens AI

EvalLens AI is a calm, evidence-based post-evaluation learning intelligence platform for students and teachers. It turns an evaluated answer paper into question-wise insight, teacher-annotation context, full-mark guidance, recoverable-mark opportunities, and a concise revision plan.

## Problem

Students often receive marks and annotations without a clear path from evaluation to improvement. Teachers remain the final authority, but students need help understanding what to revise, what was missing, and how to act without anxiety or blame.

## Solution

EvalLens interprets evaluated papers with paper-grounded AI. The current milestone ships a polished Class 12 Physics sample workflow so a judge can open the product, click **Try the sample experience**, and explore the complete journey without needing an API call.

## Key Features

- Landing page with the Upload -> Understand -> Improve flow
- Upload screen with calm file validation and graceful sample fallback
- Validated Physics sample dataset with five question patterns
- Improvement overview with current score, target score, recoverable marks, and potential score
- Question explorer with responsive evidence highlighting
- Teacher-discretion and objective-review boundaries
- Full-mark answer guidance and similar-question prompts
- Ask My Paper mock route grounded in selected question context
- Seeded learning journey preview clearly labelled as sample history

## Human-Centred AI Principles

- Teachers evaluate. EvalLens interprets.
- EvalLens never changes teacher-awarded marks.
- Every meaningful conclusion should show supporting evidence.
- Objective review opportunities are framed gently and only when the paper evidence is strong.
- Subjective cases remain classified as teacher discretion.
- The product is designed to reduce pressure, not create exam anxiety.

## Manifesto

Every evaluation deserves a second life.

Every learner deserves clear guidance.

Every teacher deserves intelligent assistance.

Every improvement deserves to be measured.

Every goal deserves a roadmap.

## Why OpenAI Is Essential

The intended live pipeline uses OpenAI multimodal reasoning to extract question structure, interpret evaluated answer-paper evidence, align answers to marks and teacher annotations, classify review boundaries, and generate concise paper-grounded assistance. The current milestone keeps that path stubbed while proving the complete product experience with validated sample data.

## Architecture

- `app/` contains the Next.js App Router pages and API routes.
- `components/` contains the landing, upload, processing, and results experiences.
- `lib/analysis-schema.ts` defines the strict Zod schema for analysis output.
- `lib/sample-analysis.ts` contains the validated Physics demonstration dataset.
- `public/demo/evaluated-paper/` contains seeded evaluated-paper page assets.
- `types/analysis.ts` exports schema-derived TypeScript types.

## Technology Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide icons
- Zod
- OpenAI official SDK

## Local Setup

```bash
npm install
```

Create `.env.local` only when working on the live AI pipeline:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5
```

## Run Instructions

```bash
npm run dev
```

Open the local URL shown by Next.js and click **Try the sample experience**.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

The target deployment platform is Vercel.

```bash
npm run build
npx vercel
```

Set these environment variables in the Vercel project settings:

- `OPENAI_API_KEY`: server-only OpenAI API key
- `OPENAI_MODEL`: optional model override, defaults to `gpt-5`

Vercel steps:

1. Push the repository to GitHub or connect the local project with `npx vercel`.
2. In Vercel, create a new project from the repository.
3. Add `OPENAI_API_KEY` under Project Settings -> Environment Variables.
4. Optionally add `OPENAI_MODEL`.
5. Deploy with the default Next.js settings.
6. Confirm `/api/health` returns `status: ok`.

## Demo Flow

1. Open the landing page.
2. Click **Try the sample experience**.
3. Watch the calm processing sequence.
4. Review the improvement overview.
5. Explore each question with evidence highlights.
6. Use **Ask My Paper** on a selected question.
7. Review the next revision action and sample learning history.

## Known Limitations

- Live multimodal analysis requires `OPENAI_API_KEY`.
- Live results are stored only in browser session storage for the current demo session.
- Uploaded PDF pages are not rendered into persistent page images; PDF live results use textual evidence fallback.
- Ask My Paper uses live OpenAI responses when configured and deterministic grounded fallback otherwise.
- The learning journey is seeded and clearly labelled as sample history.

## Future Roadmap

- Implement staged OpenAI multimodal extraction and diagnosis
- Add PDF rendering and page image generation for real uploads
- Add structured retries and low-confidence manual review states
- Expand beyond the initial Physics demonstration dataset
- Support additional subjects after the core workflow is stable
