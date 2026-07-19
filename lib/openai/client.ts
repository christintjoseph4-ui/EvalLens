import OpenAI from "openai";
import { getOpenAIRequestTimeoutMs } from "@/lib/openai/config";

let openAIClient: OpenAI | null = null;
let configuredApiKey: string | null = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!openAIClient || configuredApiKey !== apiKey) {
    configuredApiKey = apiKey;
    openAIClient = new OpenAI({
      apiKey,
      timeout: getOpenAIRequestTimeoutMs(),
      maxRetries: 1
    });
  }

  return openAIClient;
}
