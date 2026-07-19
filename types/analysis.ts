import type { z } from "zod";
import type {
  analysisResultSchema,
  evaluationClassificationSchema,
  improvementCategorySchema
} from "@/lib/analysis-schema";

export type EvaluationClassification = z.infer<typeof evaluationClassificationSchema>;

export type ImprovementCategory = z.infer<typeof improvementCategorySchema>;

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export type AnalysisQuestion = AnalysisResult["questions"][number];

export type TeacherAnnotation = AnalysisQuestion["teacherAnnotations"][number];

export type HistoricalPreviewPoint = AnalysisResult["historicalPreview"][number];
