import { z } from "zod";

export const regionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1)
});

export const evaluationClassificationSchema = z.enum([
  "consistent",
  "objective_review_opportunity",
  "teacher_discretion"
]);

export const improvementCategorySchema = z.enum([
  "Concept understanding",
  "Formula recall",
  "Application of concept",
  "Calculation accuracy",
  "Question interpretation",
  "Completeness",
  "Diagram quality",
  "Units and notation",
  "Answer structure",
  "Time management"
]);

export const teacherAnnotationSchema = z.object({
  text: z.string().min(1),
  page: z.number().int().positive(),
  region: regionSchema.optional()
});

export const analysisQuestionSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  questionText: z.string().min(1),
  maximumMarks: z.number().positive(),
  awardedMarks: z.number().min(0),
  topic: z.string().min(1),
  expectedSkills: z.array(z.string().min(1)).min(1),
  studentAnswer: z.string().min(1),
  teacherAnnotations: z.array(teacherAnnotationSchema),
  whatWentWell: z.array(z.string().min(1)).min(1),
  improvementOpportunities: z.array(z.string().min(1)).min(1),
  deductionReason: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  attentionTopics: z.array(z.string().min(1)).min(1),
  attentionSkills: z.array(z.string().min(1)).min(1),
  improvementCategory: improvementCategorySchema,
  nextAction: z.string().min(1),
  recoverableMarks: z.number().min(0),
  evaluationClassification: evaluationClassificationSchema,
  mappingConfidence: z.number().min(0).max(1),
  analysisConfidence: z.number().min(0).max(1),
  requiresManualReview: z.boolean(),
  paperPageImage: z.string().min(1),
  answerRegion: regionSchema,
  fullMarkAnswer: z.string().min(1),
  similarQuestions: z.array(z.string().min(1)).min(1),
  conceptMinute: z.string().min(1)
});

export const analysisResultSchema = z
  .object({
    analysisId: z.string().min(1),
    exam: z.object({
      title: z.string().min(1),
      subject: z.string().min(1),
      maximumMarks: z.number().positive()
    }),
    studentGoal: z.object({
      currentScore: z.number().min(0),
      targetScore: z.number().min(0).nullable().optional(),
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
    questions: z.array(analysisQuestionSchema).min(1),
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
  })
  .superRefine((value, context) => {
    if (value.studentGoal.currentScore > value.exam.maximumMarks) {
      context.addIssue({
        code: "custom",
        path: ["studentGoal", "currentScore"],
        message: "Current score cannot exceed maximum marks."
      });
    }

    if (value.studentGoal.potentialScore > value.exam.maximumMarks) {
      context.addIssue({
        code: "custom",
        path: ["studentGoal", "potentialScore"],
        message: "Potential score cannot exceed maximum marks."
      });
    }

    const unavailableMarks = value.exam.maximumMarks - value.studentGoal.currentScore;
    if (value.studentGoal.recoverableMarks > unavailableMarks) {
      context.addIssue({
        code: "custom",
        path: ["studentGoal", "recoverableMarks"],
        message: "Recoverable marks cannot exceed marks not awarded."
      });
    }

    value.questions.forEach((question, index) => {
      if (question.awardedMarks > question.maximumMarks) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "awardedMarks"],
          message: "Awarded marks cannot exceed maximum marks."
        });
      }

      const questionUnavailable = question.maximumMarks - question.awardedMarks;
      if (question.recoverableMarks > questionUnavailable) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "recoverableMarks"],
          message: "Question recoverable marks cannot exceed unavailable marks."
        });
      }
    });
  });
