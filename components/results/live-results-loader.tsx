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
    return <ResultsExperience analysis={analysis} modeLabel="Your paper" isLive />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass paper-shadow w-full max-w-xl rounded-[34px] p-8 text-center sm:p-10">
        <p className="text-sm font-medium text-[#6d73d9]">
          {status === "loading" ? "Opening your paper" : "We can't find that paper here"}
        </p>
        <h1 className="mt-4 text-balance text-4xl font-medium leading-tight sm:text-5xl">
          {status === "loading" ? "Getting your next step ready" : "Let's use a prepared paper instead."}
        </h1>
        <p className="mt-4 leading-7 text-[#5f6671]">
          I can&apos;t reopen that paper from here. You can try the upload again, or look at a
          prepared paper for now.
        </p>
        <Link
          className="focus-ring mt-7 inline-flex rounded-full bg-[#102a56] px-5 py-3 text-sm font-medium text-white"
          href="/sample"
        >
          Understand a prepared paper
        </Link>
      </section>
    </main>
  );
}
