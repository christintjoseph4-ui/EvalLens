import type { AnalysisQuestion, AnalysisResult } from "@/types/analysis";

const bannedKeys = new Set(["paperPageImage", "previewImage", "imageData", "dataUrl"]);
const maxContextLength = 12_000;

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return value ?? "";
  }

  return value.length > maxLength ? `${value.slice(0, Math.max(maxLength - 3, 0)).trimEnd()}...` : value;
}

function isBannedDataString(value: string) {
  return value.startsWith("data:image/") || value.startsWith("data:application/pdf");
}

export function sanitizeForAskPaper<T>(value: T): T {
  function visit(input: unknown): unknown {
    if (typeof input === "string") {
      return isBannedDataString(input) ? undefined : input;
    }

    if (Array.isArray(input)) {
      return input.map(visit).filter((item) => item !== undefined);
    }

    if (input && typeof input === "object") {
      const output: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(input)) {
        if (bannedKeys.has(key)) {
          continue;
        }
        const sanitized = visit(nested);
        if (sanitized !== undefined) {
          output[key] = sanitized;
        }
      }
      return output;
    }

    return input;
  }

  return visit(value) as T;
}

function words(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function explicitQuestionNumber(value: string) {
  return value.match(/\b(?:q|question(?:\s+number)?)\s*#?\s*([0-9]+[a-z]?)/i)?.[1]?.toLowerCase() ?? null;
}

function scoreQuestion(question: AnalysisQuestion, userQuestion: string) {
  const queryWords = words(userQuestion);
  const haystack = [
    question.number,
    question.questionText,
    question.topic,
    question.studentAnswer,
    question.nextAction,
    question.deductionReason,
    ...question.expectedSkills,
    ...question.attentionTopics,
    ...question.attentionSkills,
    ...question.improvementOpportunities
  ].join(" ");

  let score = 0;
  for (const token of words(haystack)) {
    if (queryWords.has(token)) {
      score += token.length > 3 ? 2 : 1;
    }
  }

  return score;
}

function pickRelevantQuestion(analysis: AnalysisResult, userQuestion: string, selectedQuestionId?: string) {
  if (selectedQuestionId) {
    const selected = analysis.questions.find((question) => question.id === selectedQuestionId);
    if (selected) {
      return selected;
    }
  }

  const explicit = explicitQuestionNumber(userQuestion);
  if (explicit) {
    return analysis.questions.find((question) => question.number.toLowerCase() === explicit || question.id.toLowerCase() === explicit);
  }

  const ranked = analysis.questions
    .map((question) => ({ question, score: scoreQuestion(question, userQuestion) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0] && ranked[0].score >= 3 ? ranked[0].question : null;
}

function compactQuestion(question: AnalysisQuestion) {
  return {
    id: question.id,
    number: question.number,
    questionText: truncate(question.questionText, 500),
    marks: {
      awarded: question.awardedMarks,
      maximum: question.maximumMarks,
      recoverable: question.recoverableMarks
    },
    topic: question.topic,
    concepts: question.expectedSkills.slice(0, 4),
    studentAnswerSummary: truncate(question.studentAnswer, 500),
    teacherFeedback: question.teacherAnnotations.map((annotation) => truncate(annotation.text, 220)).slice(0, 2),
    whatWentWell: question.whatWentWell.slice(0, 3).map((item) => truncate(item, 220)),
    learningOpportunities: question.improvementOpportunities.slice(0, 3).map((item) => truncate(item, 220)),
    evidence: question.evidence.slice(0, 2).map((item) => truncate(item, 220)),
    improvedAnswer: truncate(question.fullMarkAnswer, 700),
    nextStep: truncate(question.nextAction, 300),
    classification: question.evaluationClassification,
    confidence: question.analysisConfidence
  };
}

function trimContext(context: Record<string, unknown>) {
  let candidate = sanitizeForAskPaper(context);
  if (JSON.stringify(candidate).length <= maxContextLength) {
    return candidate;
  }

  candidate = { ...candidate, neighbouringQuestion: undefined, reviewTogether: [] };
  if (JSON.stringify(candidate).length <= maxContextLength) {
    return sanitizeForAskPaper(candidate);
  }

  candidate = { ...candidate, revisionTopics: [], focusAreas: [] };
  if (JSON.stringify(candidate).length <= maxContextLength) {
    return sanitizeForAskPaper(candidate);
  }

  const compact = candidate as { relevantQuestion?: ReturnType<typeof compactQuestion> };
  if (compact.relevantQuestion) {
    compact.relevantQuestion = {
      ...compact.relevantQuestion,
      questionText: truncate(compact.relevantQuestion.questionText, 260),
      studentAnswerSummary: truncate(compact.relevantQuestion.studentAnswerSummary, 260),
      improvedAnswer: truncate(compact.relevantQuestion.improvedAnswer, 360),
      evidence: compact.relevantQuestion.evidence?.slice(0, 1).map((item) => truncate(item, 160)) ?? []
    };
  }

  return sanitizeForAskPaper(compact);
}

export function buildCompactAskContext(
  analysis: AnalysisResult,
  userQuestion: string,
  selectedQuestionId?: string,
  conversationHistory: ConversationMessage[] = []
) {
  const relevantQuestion = pickRelevantQuestion(analysis, userQuestion, selectedQuestionId);
  const relevantIndex = relevantQuestion
    ? analysis.questions.findIndex((question) => question.id === relevantQuestion.id)
    : -1;
  const neighbouringQuestion =
    relevantIndex >= 0
      ? analysis.questions[relevantIndex + 1] ?? analysis.questions[relevantIndex - 1] ?? null
      : null;

  const focusAreas = analysis.questions
    .flatMap((question) => question.improvementOpportunities)
    .slice(0, 3)
    .map((item) => truncate(item, 220));

  const context = {
    subject: analysis.exam.subject,
    examTitle: analysis.exam.title,
    summary: truncate(analysis.summary.supportingMessage, 700),
    marks: {
      awarded: analysis.studentGoal.currentScore,
      maximum: analysis.exam.maximumMarks,
      recoverable: analysis.studentGoal.recoverableMarks
    },
    relevantQuestion: relevantQuestion ? compactQuestion(relevantQuestion) : null,
    neighbouringQuestion: neighbouringQuestion ? compactQuestion(neighbouringQuestion) : null,
    focusAreas,
    revisionTopics: analysis.revisionPlan.slice(0, 3).map((item) => ({
      topic: item.topic,
      reason: truncate(item.reason, 300),
      action: truncate(item.action, 300)
    })),
    reviewTogether: analysis.reviewOpportunities.slice(0, 2).map((item) => ({
      questionId: item.questionId,
      reason: truncate(item.reason, 300),
      evidence: item.evidence.slice(0, 2).map((evidence) => truncate(evidence, 220)),
      confidence: item.confidence
    })),
    recentConversation: conversationHistory.slice(-4).map((message) => ({
      role: message.role,
      content: truncate(message.content, 1200)
    })),
    contextLimit: maxContextLength
  };

  return trimContext(context);
}
