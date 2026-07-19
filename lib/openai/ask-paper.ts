import { zodTextFormat } from "openai/helpers/zod";
import { sanitizeForAskPaper } from "@/lib/openai/ask-context";
import { getOpenAIClient } from "@/lib/openai/client";
import { getChatMaxOutputTokens, getOpenAIModel, getOpenAIRequestTimeoutMs, isOpenAIConfigured } from "@/lib/openai/config";
import { EvalLensApiError, createRequestId, mapOpenAIError } from "@/lib/openai/errors";
import { askPaperPrompt } from "@/lib/openai/prompts";
import { askPaperRequestSchema, askPaperResponseSchema, type AskPaperResponse } from "@/lib/openai/schemas";

const askRequestWindowMs = 60_000;
const maxAskRequestsPerWindow = 12;
const askRequestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkAskPaperRateLimit(key: string, now = Date.now()) {
  const current = askRequestCounts.get(key);

  if (!current || current.resetAt <= now) {
    askRequestCounts.set(key, { count: 1, resetAt: now + askRequestWindowMs });
    return true;
  }

  if (current.count >= maxAskRequestsPerWindow) {
    return false;
  }

  current.count += 1;
  return true;
}

export async function answerFromPaper(payload: unknown, requestId = createRequestId()): Promise<AskPaperResponse> {
  const sanitizedPayload = sanitizeForAskPaper(payload);
  const parsed = askPaperRequestSchema.safeParse(sanitizedPayload);

  if (!parsed.success) {
    throw new EvalLensApiError(
      "INVALID_REQUEST",
      "I couldn't read that question yet.",
      400,
      false,
      requestId
    );
  }

  if (!isOpenAIConfigured()) {
    throw new EvalLensApiError(
      "OPENAI_NOT_CONFIGURED",
      "AI analysis is not configured on this deployment.",
      500,
      false,
      requestId
    );
  }

  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAIRequestTimeoutMs());

  try {
    const response = await client.responses.parse(
      {
        model,
        instructions: askPaperPrompt,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  analysisId: parsed.data.analysisId,
                  selectedQuestionId: parsed.data.questionId ?? null,
                  studentQuestion: parsed.data.question,
                  conversationHistory: sanitizeForAskPaper(parsed.data.conversationHistory ?? []).slice(-4),
                  analysisContext: sanitizeForAskPaper(parsed.data.analysisContext)
                })
              }
            ]
          }
        ],
        text: { format: zodTextFormat(askPaperResponseSchema, "ask_paper_response") },
        max_output_tokens: getChatMaxOutputTokens(),
        store: false
      },
      { signal: controller.signal }
    );

    const liveResponse = askPaperResponseSchema.safeParse(response.output_parsed);
    if (!liveResponse.success) {
      throw new EvalLensApiError(
        "MODEL_OUTPUT_INVALID",
        "I couldn't answer that clearly from this question yet.",
        502,
        true,
        requestId
      );
    }

    console.info("EvalLens Ask My Paper completed", {
      requestId,
      model,
      durationMs: Date.now() - startedAt,
      responseId: response.id ?? null,
      success: true
    });

    return liveResponse.data;
  } catch (error) {
    if (error instanceof EvalLensApiError) {
      console.error("EvalLens Ask My Paper failed", {
        requestId,
        model,
        durationMs: Date.now() - startedAt,
        code: error.code
      });
      throw error;
    }

    const mapped = mapOpenAIError(error, requestId);
    console.error("EvalLens Ask My Paper failed", {
      requestId,
      model,
      durationMs: Date.now() - startedAt,
      code: mapped.code
    });
    throw mapped;
  } finally {
    clearTimeout(timeout);
  }
}
