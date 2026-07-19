import { randomUUID } from "crypto";

export type EvalLensErrorCode =
  | "MISSING_REQUIRED_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "INVALID_UPLOAD"
  | "INVALID_REQUEST"
  | "OPENAI_NOT_CONFIGURED"
  | "OPENAI_RATE_LIMITED"
  | "OPENAI_AUTH_FAILED"
  | "OPENAI_CREDITS_UNAVAILABLE"
  | "OPENAI_TIMEOUT"
  | "OPENAI_UPSTREAM_FAILED"
  | "MODEL_OUTPUT_INVALID"
  | "ANALYSIS_FAILED";

export class EvalLensApiError extends Error {
  readonly requestId: string;

  constructor(
    public readonly code: EvalLensErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryable = false,
    requestId?: string
  ) {
    super(message);
    this.name = "EvalLensApiError";
    this.requestId = requestId ?? randomUUID();
  }
}

export function createRequestId() {
  return `eval-${randomUUID()}`;
}

export function mapOpenAIError(error: unknown, requestId: string) {
  const candidate = error as { status?: number; code?: string; name?: string; message?: string };
  const status = candidate.status;
  const code = candidate.code ?? "";
  const message = candidate.message ?? "";

  if (candidate.name === "AbortError" || /timeout|aborted/i.test(message)) {
    return new EvalLensApiError(
      "OPENAI_TIMEOUT",
      "The documents took longer than expected to analyse. Please retry.",
      504,
      true,
      requestId
    );
  }

  if (status === 401 || status === 403) {
    return new EvalLensApiError(
      "OPENAI_AUTH_FAILED",
      "AI analysis is not configured correctly on this deployment.",
      500,
      false,
      requestId
    );
  }

  if (status === 429) {
    return new EvalLensApiError(
      "OPENAI_RATE_LIMITED",
      "EvalLens is receiving many requests. Please try again shortly.",
      429,
      true,
      requestId
    );
  }

  if (/insufficient_quota|billing|credits/i.test(code) || /insufficient_quota|billing|credits/i.test(message)) {
    return new EvalLensApiError(
      "OPENAI_CREDITS_UNAVAILABLE",
      "AI analysis is temporarily unavailable on this deployment.",
      502,
      false,
      requestId
    );
  }

  return new EvalLensApiError(
    "OPENAI_UPSTREAM_FAILED",
    "We could not analyse this paper right now.",
    502,
    true,
    requestId
  );
}

export function serializeError(error: EvalLensApiError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      requestId: error.requestId
    }
  };
}
