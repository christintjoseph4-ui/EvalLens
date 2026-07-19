export const defaultOpenAIModel = "gpt-5";

const defaultMaxUploadMb = 20;
const defaultTimeoutMs = 70_000;
const defaultAnalysisMaxOutputTokens = 4500;
const defaultChatMaxOutputTokens = 900;
const defaultRepairMaxOutputTokens = 1200;

function readPositiveNumber(value: string | undefined, fallback: number) {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || defaultOpenAIModel;
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIRequestTimeoutMs() {
  return readPositiveNumber(process.env.OPENAI_TIMEOUT_MS, defaultTimeoutMs);
}

export function getMaxUploadMb() {
  return readPositiveNumber(process.env.MAX_UPLOAD_MB, defaultMaxUploadMb);
}

export function getMaxUploadBytes() {
  return getMaxUploadMb() * 1024 * 1024;
}

export function getAnalysisMaxOutputTokens() {
  return readPositiveNumber(process.env.OPENAI_ANALYSIS_MAX_OUTPUT_TOKENS, defaultAnalysisMaxOutputTokens);
}

export function getChatMaxOutputTokens() {
  return readPositiveNumber(process.env.OPENAI_CHAT_MAX_OUTPUT_TOKENS, defaultChatMaxOutputTokens);
}

export function getRepairMaxOutputTokens() {
  return readPositiveNumber(process.env.OPENAI_REPAIR_MAX_OUTPUT_TOKENS, defaultRepairMaxOutputTokens);
}
