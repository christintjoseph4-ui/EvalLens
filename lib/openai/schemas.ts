import { z } from "zod";

export const evalLensEvidenceSchema = z.object({
  source: z.enum(["question_paper", "student_answer", "teacher_annotation"]),
  excerpt: z.string().min(1).max(260),
  page: z.number().int().positive().nullable(),
  confidence: z.number().min(0).max(1)
});

export const evalLensQuestionAnalysisSchema = z.object({
  questionId: z.string().min(1).max(80),
  questionText: z.string().min(1).max(700),
  maximumMarks: z.number().positive().nullable(),
  awardedMarks: z.number().min(0).nullable(),
  studentAnswerSummary: z.string().min(1).max(700),
  teacherFeedbackSummary: z.string().min(1).max(500).nullable(),
  outcome: z.enum(["strong", "mostly_correct", "partially_correct", "needs_practice", "unclear"]),
  conceptsTested: z.array(z.string().min(1).max(120)).min(1).max(4),
  whatWentWell: z.array(z.string().min(1).max(260)).min(1).max(3),
  learningOpportunities: z.array(z.string().min(1).max(260)).min(1).max(3),
  evidence: z.array(evalLensEvidenceSchema).min(1).max(2),
  recoverableMarks: z.number().min(0).nullable(),
  improvedAnswer: z.string().min(1).max(900).nullable(),
  nextStep: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1)
});

export const modelEvalLensAnalysisSchema = z.object({
  documentSummary: z.object({
    subject: z.string().min(1).max(120).nullable(),
    classLevel: z.string().min(1).max(80).nullable(),
    examTitle: z.string().min(1).max(180).nullable(),
    totalMarksAvailable: z.number().positive().nullable(),
    teacherAwardedMarks: z.number().min(0).nullable(),
    overallConfidence: z.number().min(0).max(1)
  }),
  overview: z.object({
    headline: z.string().min(1).max(160),
    encouragement: z.string().min(1).max(300),
    overallSummary: z.string().min(1).max(700),
    marksYouCanStillGain: z.number().min(0).nullable()
  }),
  questionAnalysis: z.array(evalLensQuestionAnalysisSchema).min(1).max(25),
  reviewTogether: z.array(
    z.object({
      questionId: z.string().min(1).max(80),
      title: z.string().min(1).max(160),
      reason: z.string().min(1).max(400),
      evidence: z.array(z.string().min(1).max(260)).min(1).max(2),
      reviewType: z.enum([
        "objective_calculation",
        "objective_fact",
        "mark_total",
        "unclear_annotation",
        "other"
      ]),
      confidence: z.number().min(0).max(1)
    })
  ).max(4),
  revisionPlan: z.object({
    immediateActions: z.array(
      z.object({
        action: z.string().min(1).max(300),
        reason: z.string().min(1).max(400),
        estimatedMinutes: z.number().int().positive()
      })
    ).min(1).max(4),
    topics: z.array(
      z.object({
        topic: z.string().min(1).max(120),
        priority: z.enum(["high", "medium", "low"]),
        reason: z.string().min(1).max(400),
        practiceSuggestion: z.string().min(1).max(400)
      })
    ).min(1).max(5)
  }),
  learningProfile: z.object({
    conceptualUnderstanding: z.number().min(0).max(100),
    calculationAccuracy: z.number().min(0).max(100),
    answerCompleteness: z.number().min(0).max(100),
    useOfUnitsAndNotation: z.number().min(0).max(100),
    presentationClarity: z.number().min(0).max(100)
  })
});

export const evalLensAnalysisSchema = modelEvalLensAnalysisSchema.extend({
  analysisId: z.string().min(1).max(120),
  generatedAt: z.string().min(1).max(80)
});

export const compactAskContextSchema = z.object({}).passthrough();

export const askPaperRequestSchema = z.object({
  analysisId: z.string().min(1),
  question: z.string().min(1).max(800),
  questionId: z.string().min(1).optional(),
  analysisContext: compactAskContextSchema,
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1200)
      })
    )
    .max(4)
    .optional()
});

export const askPaperResponseSchema = z.object({
  answer: z.string().min(1).max(1200),
  evidence: z.array(z.string().min(1).max(260)).min(1).max(3),
  classification: z.enum(["evidence", "inference", "teacher_discretion"]),
  nextAction: z.string().min(1).max(300)
});

export type ModelEvalLensAnalysis = z.infer<typeof modelEvalLensAnalysisSchema>;
export type EvalLensAnalysis = z.infer<typeof evalLensAnalysisSchema>;
export type AskPaperResponse = z.infer<typeof askPaperResponseSchema>;
