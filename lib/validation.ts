import { analysisResultSchema } from "@/lib/analysis-schema";
import type { AnalysisResult } from "@/types/analysis";

export function validateAnalysisResult(input: unknown): AnalysisResult {
  return analysisResultSchema.parse(input);
}

export function safeValidateAnalysisResult(input: unknown) {
  return analysisResultSchema.safeParse(input);
}
