import { randomUUID } from "crypto";
import { validateAnalysisResult } from "@/lib/validation";
import type { EvalLensAnalysis } from "@/lib/openai/schemas";
import type { AnalysisResult, ImprovementCategory } from "@/types/analysis";

function bounded(value: number | null | undefined, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Number(value), min), max);
}

function firstOrFallback(items: string[], fallback: string) {
  return items.find((item) => item.trim()) ?? fallback;
}

function categoryFor(text: string): ImprovementCategory {
  const normalized = text.toLowerCase();

  if (/unit|notation/.test(normalized)) {
    return "Units and notation";
  }
  if (/calculate|calculation|arithmetic|numerical/.test(normalized)) {
    return "Calculation accuracy";
  }
  if (/formula|equation/.test(normalized)) {
    return "Formula recall";
  }
  if (/diagram|graph/.test(normalized)) {
    return "Diagram quality";
  }
  if (/complete|missing|step/.test(normalized)) {
    return "Completeness";
  }
  if (/interpret|read the question/.test(normalized)) {
    return "Question interpretation";
  }
  if (/present|explain|structure/.test(normalized)) {
    return "Answer structure";
  }

  return "Concept understanding";
}

function totalQuestionMarks(analysis: EvalLensAnalysis) {
  return analysis.questionAnalysis.reduce((sum, question) => sum + (question.maximumMarks ?? 0), 0);
}

function currentQuestionMarks(analysis: EvalLensAnalysis) {
  return analysis.questionAnalysis.reduce((sum, question) => sum + (question.awardedMarks ?? 0), 0);
}

function recoverableQuestionMarks(analysis: EvalLensAnalysis) {
  return analysis.questionAnalysis.reduce((sum, question) => sum + (question.recoverableMarks ?? 0), 0);
}

export function mapEvalLensAnalysisToResult(analysis: EvalLensAnalysis): AnalysisResult {
  const inferredMaximum = totalQuestionMarks(analysis) || analysis.documentSummary.totalMarksAvailable || 1;
  const maximumMarks = Math.max(analysis.documentSummary.totalMarksAvailable ?? inferredMaximum, 1);
  const currentScore = bounded(analysis.documentSummary.teacherAwardedMarks ?? currentQuestionMarks(analysis), 0, maximumMarks);
  const recoverableMarks = bounded(analysis.overview.marksYouCanStillGain ?? recoverableQuestionMarks(analysis), 0, maximumMarks - currentScore);
  const potentialScore = bounded(currentScore + recoverableMarks, 0, maximumMarks);
  const reviewQuestionIds = new Set(analysis.reviewTogether.map((item) => item.questionId));

  const questions = analysis.questionAnalysis.map((question, index) => {
    const questionMaximum = Math.max(question.maximumMarks ?? question.awardedMarks ?? 1, 1);
    const awardedMarks = bounded(question.awardedMarks ?? 0, 0, questionMaximum);
    const opportunities = question.learningOpportunities.length
      ? question.learningOpportunities
      : ["There is one small part worth practising next."];
    const teacherEvidence = question.evidence.filter((item) => item.source === "teacher_annotation");

    return {
      id: question.questionId || `q-${index + 1}`,
      number: question.questionId.replace(/^q[-_\s]?/i, "") || String(index + 1),
      questionText: question.questionText,
      maximumMarks: questionMaximum,
      awardedMarks,
      topic: firstOrFallback(question.conceptsTested, analysis.documentSummary.subject ?? "This topic"),
      expectedSkills: question.conceptsTested,
      studentAnswer: question.studentAnswerSummary,
      teacherAnnotations: teacherEvidence.map((item) => ({
        text: item.excerpt,
        page: item.page ?? 1
      })),
      whatWentWell: question.whatWentWell,
      improvementOpportunities: opportunities,
      deductionReason: firstOrFallback(opportunities, "This answer gives us a useful place to practise next."),
      evidence: question.evidence.map((item) => item.excerpt),
      attentionTopics: question.conceptsTested,
      attentionSkills: opportunities,
      improvementCategory: categoryFor(opportunities.join(" ")),
      nextAction: question.nextStep,
      recoverableMarks: bounded(question.recoverableMarks ?? 0, 0, questionMaximum - awardedMarks),
      evaluationClassification: reviewQuestionIds.has(question.questionId)
        ? "objective_review_opportunity"
        : question.outcome === "unclear"
          ? "teacher_discretion"
          : "consistent",
      mappingConfidence: question.confidence,
      analysisConfidence: Math.min(question.confidence, analysis.documentSummary.overallConfidence),
      requiresManualReview: question.outcome === "unclear" || question.confidence < 0.65,
      paperPageImage: "live-upload-preview",
      answerRegion: { x: 0.08, y: 0.12, width: 0.84, height: 0.18 },
      fullMarkAnswer: question.improvedAnswer ?? question.nextStep,
      similarQuestions: question.conceptsTested.slice(0, 2).map((concept) => `Try one more question on ${concept}.`),
      conceptMinute: `A simple way to practise this is to focus on ${firstOrFallback(
        question.conceptsTested,
        "the main idea"
      )}, then check each step against the question.`
    };
  });

  const topicProgress = analysis.revisionPlan.topics.map((topic) => ({
    topic: topic.topic,
    scorePercentage:
      topic.priority === "high"
        ? Math.max(35, analysis.learningProfile.conceptualUnderstanding - 12)
        : topic.priority === "medium"
          ? analysis.learningProfile.conceptualUnderstanding
          : Math.min(100, analysis.learningProfile.conceptualUnderstanding + 10),
    status: topic.priority === "high" ? "Worth practising first" : "Keep building",
    nextAction: topic.practiceSuggestion
  }));

  const revisionPlan = analysis.revisionPlan.immediateActions.map((action, index) => ({
    priority: index + 1,
    topic: analysis.revisionPlan.topics[index]?.topic ?? `Step ${index + 1}`,
    reason: action.reason,
    action: action.action,
    durationMinutes: action.estimatedMinutes,
    practiceQuestions: Math.max(1, Math.min(4, analysis.questionAnalysis.length)),
    expectedBenefit: "This keeps the next step focused and manageable."
  }));

  const result = {
    analysisId: analysis.analysisId || `live-${randomUUID()}`,
    exam: {
      title: analysis.documentSummary.examTitle ?? "Uploaded paper",
      subject: analysis.documentSummary.subject ?? "Your paper",
      maximumMarks
    },
    studentGoal: {
      currentScore,
      targetScore: null,
      recoverableMarks,
      potentialScore
    },
    summary: {
      headline: analysis.overview.headline,
      supportingMessage: analysis.overview.encouragement || analysis.overview.overallSummary,
      nextBestAction: firstOrFallback(
        analysis.revisionPlan.immediateActions.map((item) => item.action),
        "Choose one answer and practise the next step."
      )
    },
    learningTwin: {
      conceptMastery: analysis.learningProfile.conceptualUnderstanding,
      numericalAccuracy: analysis.learningProfile.calculationAccuracy,
      answerCompleteness: analysis.learningProfile.answerCompleteness,
      presentation: Math.round(
        (analysis.learningProfile.presentationClarity + analysis.learningProfile.useOfUnitsAndNotation) / 2
      )
    },
    questions,
    topicProgress,
    reviewOpportunities: analysis.reviewTogether.map((item) => ({
      questionId: item.questionId,
      reason: item.reason,
      evidence: item.evidence,
      confidence: item.confidence
    })),
    revisionPlan,
    historicalPreview: [
      {
        testName: "This paper",
        score: currentScore,
        conceptMastery: analysis.learningProfile.conceptualUnderstanding,
        numericalAccuracy: analysis.learningProfile.calculationAccuracy,
        answerCompleteness: analysis.learningProfile.answerCompleteness
      },
      {
        testName: "With today's practice",
        score: potentialScore,
        conceptMastery: Math.min(100, analysis.learningProfile.conceptualUnderstanding + 6),
        numericalAccuracy: Math.min(100, analysis.learningProfile.calculationAccuracy + 6),
        answerCompleteness: Math.min(100, analysis.learningProfile.answerCompleteness + 6)
      }
    ]
  };

  return validateAnalysisResult(result);
}
