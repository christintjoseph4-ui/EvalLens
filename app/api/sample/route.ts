import { NextResponse } from "next/server";
import { sampleAnalysis } from "@/lib/sample-analysis";

export function GET() {
  return NextResponse.json(sampleAnalysis);
}
