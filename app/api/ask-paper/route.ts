import { NextResponse } from "next/server";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { analysisQuestionSchema } from "@/lib/analysis-schema";
import { askPaperLiveResponseSchema } from "@/lib/ai-schemas";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/openai";
import { askPaperPrompt } from "@/lib/prompts/ask-paper";
import { getSampleQuestion } from "@/lib/sample-analysis";
import type { AnalysisQuestion } from "@/types/analysis";

const requestSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1).max(500),
  question: analysisQuestionSchema.optional()
});

function buildGroundedAnswer(prompt: string, question: AnalysisQuestion) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("review")) {
    return question.evaluationClassification === "objective_review_opportunity"
      ? "This answer may be worth reviewing together because the formula, substitution, unit, and final value are visible. This is not a mark change."
      : "This answer does not need a review conversation from the visible evidence. It can stay in the practice plan.";
  }

  if (normalizedPrompt.includes("full-mark")) {
    return question.fullMarkAnswer;
  }

  if (normalizedPrompt.includes("similar")) {
    return question.similarQuestions.join(" ");
  }

  if (/\bteach\b|\bconcept\b/.test(normalizedPrompt)) {
    return question.conceptMinute;
  }

  return question.deductionReason;
}

function buildDeterministicResponse(prompt: string, question: AnalysisQuestion) {
  const classification =
    question.evaluationClassification === "teacher_discretion"
      ? "teacher_discretion"
      : prompt.toLowerCase().includes("review")
        ? "inference"
        : "evidence";

  return {
    answer: buildGroundedAnswer(prompt, question),
    evidence: [
      `Question: ${question.questionText}`,
      `What you wrote: ${question.studentAnswer}`,
      `Marks shown on the paper: ${question.awardedMarks}/${question.maximumMarks}`,
      ...question.evidence
    ],
    classification,
    nextAction: question.nextAction
  } satisfies z.infer<typeof askPaperLiveResponseSchema>;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "I couldn't read that question yet." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "I couldn't read that question yet." }, { status: 400 });
  }

  const question = parsed.data.question ?? getSampleQuestion(parsed.data.questionId);

  if (!question) {
    return NextResponse.json({ error: "I couldn't find that answer in this paper." }, { status: 404 });
  }

  if (isOpenAIConfigured()) {
    try {
      const client = getOpenAIClient();
      const modelResponse = await client.responses.parse({
        model: getOpenAIModel(),
        instructions: askPaperPrompt,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  userQuestion: parsed.data.prompt,
                  selectedQuestion: question
                })
              }
            ]
          }
        ],
        text: { format: zodTextFormat(askPaperLiveResponseSchema, "ask_paper_response") },
        store: false
      });

      const liveResponse = askPaperLiveResponseSchema.safeParse(modelResponse.output_parsed);
      if (liveResponse.success) {
        return NextResponse.json({ response: liveResponse.data });
      }
    } catch {
      console.error("EvalLens ask-paper live response failed", { code: "ASK_PAPER_MODEL_FAILED" });
    }
  }

  const response = buildDeterministicResponse(parsed.data.prompt, question);

  return NextResponse.json({ response });
}
