"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ResultsExperience } from "@/components/results/results-experience";
import { safeValidateAnalysisResult } from "@/lib/validation";
import type { AnalysisResult } from "@/types/analysis";

export function LiveResultsLoader() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<"loading" | "missing" | "invalid">("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const analysisId = params.get("analysisId");
      if (!analysisId) {
        setStatus("missing");
        return;
      }

      const stored = window.sessionStorage.getItem(`evallens:analysis:${analysisId}`);
      if (!stored) {
        setStatus("missing");
        return;
      }

      try {
        const parsed = safeValidateAnalysisResult(JSON.parse(stored));
        if (!parsed.success) {
          setStatus("invalid");
          return;
        }
        setAnalysis(parsed.data);
      } catch {
        setStatus("invalid");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (analysis) {
    return <ResultsExperience analysis={analysis} modeLabel="Live analysis" isLive />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass paper-shadow w-full max-w-xl rounded-[36px] p-8 text-center">
        <p className="text-sm font-medium text-[#6d73d9]">
          {status === "loading" ? "Opening your analysis" : "Analysis not available"}
        </p>
        <h1 className="mt-3 text-balance text-5xl font-semibold leading-tight">
          {status === "loading" ? "Preparing your result" : "Open the prepared paper"}
        </h1>
        <p className="mt-4 leading-7 text-[#5f6671]">
          Live results are kept only in this browser session. If the session is missing,
          the prepared sample remains available.
        </p>
        <Link
          className="focus-ring mt-6 inline-flex rounded-full bg-[#102a56] px-5 py-3 font-medium text-white"
          href="/sample"
        >
          Explore the prepared paper
        </Link>
      </section>
    </main>
  );
}
