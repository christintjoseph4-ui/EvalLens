import { NextResponse } from "next/server";
import { analyseUploadedPaper, CalmAnalysisError, parseAnalyseFormData } from "@/lib/live-analysis";
import { isOpenAIConfigured } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 70;

function failure(code: string, message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message
      },
      sampleAvailable: true
    },
    { status }
  );
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return failure(
      "INVALID_UPLOAD",
      "We could not read those uploads reliably. Please try again or explore the prepared sample."
    );
  }

  try {
    const input = await parseAnalyseFormData(formData);
    if (!isOpenAIConfigured()) {
      throw new CalmAnalysisError(
        "OPENAI_NOT_CONFIGURED",
        "Live analysis is not configured yet. Explore the prepared sample to experience the complete EvalLens workflow."
      );
    }

    const analysis = await analyseUploadedPaper(input);

    return NextResponse.json({
      success: true,
      mode: "live",
      analysis
    });
  } catch (error) {
    if (error instanceof CalmAnalysisError) {
      console.error("EvalLens analysis failed", { code: error.code });
      const status = error.code === "OPENAI_NOT_CONFIGURED" || error.code.startsWith("MODEL_") ? 502 : 400;
      return failure(error.code, error.message, status);
    }

    console.error("EvalLens analysis failed", { code: "UNEXPECTED_ANALYSIS_ERROR" });
    return failure(
      "ANALYSIS_FAILED",
      "We could not complete this upload reliably. Explore the prepared sample to experience the complete EvalLens workflow.",
      502
    );
  }
}
