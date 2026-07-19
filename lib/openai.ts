import OpenAI from "openai";

export const defaultOpenAIModel = "gpt-5";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || defaultOpenAIModel;
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey, timeout: 65_000, maxRetries: 1 });
}
