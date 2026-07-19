import { z } from "zod";
import { analysisQuestionSchema, evaluationClassificationSchema, improvementCategorySchema, regionSchema } from "@/lib/analysis-schema";

export const extractedQuestionSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  subQuestionNumber: z.string().nullable(),
  questionText: z.string().min(1),
  maximumMarks: z.number().positive(),
  topic: z.string().min(1),
  expectedConcepts: z.array(z.string()).min(1),
  expectedSkills: z.array(z.string()).min(1),
  objectiveNature: z.enum(["objective", "subjective", "mixed"]),
  extractionConfidence: z.number().min(0).max(1)
});

export const questionPaperExtractionSchema = z.object({
  examTitle: z.string().min(1),
  subject: z.string().min(1),
  maximumMarks: z.number().positive(),
  questions: z.array(extractedQuestionSchema).min(1),
  extractionNotes: z.array(z.string())
});

export const extractedAnswerSchema = z.object({
  questionNumber: z.string().min(1),
  studentAnswer: z.string().min(1),
  pageNumber: z.number().int().positive(),
  awardedMarks: z.number().min(0).nullable(),
  teacherComment: z.string().nullable(),
  teacherAnnotation: z.string().nullable(),
  visibleMarks: z.array(z.enum(["tick", "cross", "underline", "circle"])),
  continuationPages: z.array(z.number().int().positive()),
  unattempted: z.boolean(),
  evidenceDescription: z.string().min(1),
  evidenceRegion: regionSchema.nullable(),
  extractionConfidence: z.number().min(0).max(1),
  uncertainty: z.string().nullable()
});

export const evaluatedPaperExtractionSchema = z.object({
  answers: z.array(extractedAnswerSchema).min(1),
  totalAwardedMarks: z.number().min(0).nullable(),
  extractionNotes: z.array(z.string())
});

export const modelAnalysisQuestionSchema = analysisQuestionSchema.extend({
  paperPageImage: z.string().min(1),
  evaluationClassification: evaluationClassificationSchema,
  improvementCategory: improvementCategorySchema
});

export const modelAnalysisResultSchema = z.object({
  analysisId: z.string().min(1),
  exam: z.object({
    title: z.string().min(1),
    subject: z.string().min(1),
    maximumMarks: z.number().positive()
  }),
  studentGoal: z.object({
    currentScore: z.number().min(0),
    targetScore: z.number().min(0).nullable(),
    recoverableMarks: z.number().min(0),
    potentialScore: z.number().min(0)
  }),
  summary: z.object({
    headline: z.string().min(1),
    supportingMessage: z.string().min(1),
    nextBestAction: z.string().min(1)
  }),
  learningTwin: z.object({
    conceptMastery: z.number().min(0).max(100),
    numericalAccuracy: z.number().min(0).max(100),
    answerCompleteness: z.number().min(0).max(100),
    presentation: z.number().min(0).max(100)
  }),
  questions: z.array(modelAnalysisQuestionSchema).min(1),
  topicProgress: z.array(
    z.object({
      topic: z.string().min(1),
      scorePercentage: z.number().min(0).max(100),
      status: z.string().min(1),
      nextAction: z.string().min(1)
    })
  ),
  reviewOpportunities: z.array(
    z.object({
      questionId: z.string().min(1),
      reason: z.string().min(1),
      evidence: z.array(z.string().min(1)).min(1),
      confidence: z.number().min(0).max(1)
    })
  ),
  revisionPlan: z.array(
    z.object({
      priority: z.number().int().positive(),
      topic: z.string().min(1),
      reason: z.string().min(1),
      action: z.string().min(1),
      durationMinutes: z.number().int().positive(),
      practiceQuestions: z.number().int().nonnegative(),
      expectedBenefit: z.string().min(1)
    })
  ),
  historicalPreview: z.array(
    z.object({
      testName: z.string().min(1),
      score: z.number().min(0),
      conceptMastery: z.number().min(0).max(100),
      numericalAccuracy: z.number().min(0).max(100),
      answerCompleteness: z.number().min(0).max(100)
    })
  )
});

export const askPaperLiveResponseSchema = z.object({
  answer: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  classification: z.enum(["evidence", "inference", "teacher_discretion"]),
  nextAction: z.string().min(1)
});

export type QuestionPaperExtraction = z.infer<typeof questionPaperExtractionSchema>;
export type EvaluatedPaperExtraction = z.infer<typeof evaluatedPaperExtractionSchema>;
export type AskPaperLiveResponse = z.infer<typeof askPaperLiveResponseSchema>;
