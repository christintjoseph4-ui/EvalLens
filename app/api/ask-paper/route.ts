import { NextResponse } from "next/server";
import { answerFromPaper, checkAskPaperRateLimit } from "@/lib/openai/ask-paper";
import { EvalLensApiError, createRequestId, serializeError } from "@/lib/openai/errors";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const requestId = createRequestId();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const error = new EvalLensApiError("INVALID_REQUEST", "I couldn't read that question yet.", 400, false, requestId);
    return NextResponse.json(serializeError(error), { status: error.status });
  }

  const limiterKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkAskPaperRateLimit(limiterKey)) {
    const error = new EvalLensApiError(
      "OPENAI_RATE_LIMITED",
      "EvalLens is receiving many requests. Please try again shortly.",
      429,
      true,
      requestId
    );
    return NextResponse.json(serializeError(error), { status: error.status });
  }

  try {
    const response = await answerFromPaper(payload, requestId);
    return NextResponse.json({ response });
  } catch (error) {
    const safeError =
      error instanceof EvalLensApiError
        ? error
        : new EvalLensApiError(
            "ANALYSIS_FAILED",
            "I couldn't answer that clearly from this question yet.",
            500,
            true,
            requestId
          );
    return NextResponse.json(serializeError(safeError), { status: safeError.status });
  }
}
