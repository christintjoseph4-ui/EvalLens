import { NextResponse } from "next/server";
import { buildCompactAskContext } from "@/lib/openai/ask-context";
import { analyzeUploadedPaper, parseAnalyzeFormData } from "@/lib/openai/analyze-paper";
import { EvalLensApiError, createRequestId, serializeError } from "@/lib/openai/errors";

export const runtime = "nodejs";
export const maxDuration = 75;

export async function POST(request: Request) {
  const requestId = createRequestId();
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    const error = new EvalLensApiError(
      "INVALID_UPLOAD",
      "We could not read one of the uploaded documents. Try a clearer PDF or image.",
      400,
      true,
      requestId
    );
    return NextResponse.json({ success: false, ...serializeError(error), sampleAvailable: true }, { status: error.status });
  }

  try {
    const input = await parseAnalyzeFormData(formData, requestId);
    const result = await analyzeUploadedPaper(input, requestId);

    return NextResponse.json({
      success: true,
      mode: "live",
      analysis: result.analysis,
      askContextSeed: buildCompactAskContext(result.analysis, ""),
      diagnostics:
        process.env.NODE_ENV === "development"
          ? {
              openAIConfigured: true,
              model: result.model,
              lastAnalysisStatus: "success",
              lastAnalysisDurationMs: result.durationMs,
              lastResponseId: result.responseId,
              requestId: result.requestId
            }
          : undefined
    });
  } catch (error) {
    const safeError =
      error instanceof EvalLensApiError
        ? error
        : new EvalLensApiError(
            "ANALYSIS_FAILED",
            "We could not analyse this paper right now.",
            500,
            true,
            requestId
          );

    return NextResponse.json(
      { success: false, ...serializeError(safeError), sampleAvailable: true },
      { status: safeError.status }
    );
  }
}
