import { NextResponse } from "next/server";
import { getOpenAIModel, isOpenAIConfigured } from "@/lib/openai";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    configured: isOpenAIConfigured(),
    provider: "OpenAI",
    modelConfigured: Boolean(getOpenAIModel())
  });
}
