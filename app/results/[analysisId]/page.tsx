import { notFound } from "next/navigation";
import { ResultsExperience } from "@/components/results/results-experience";
import { sampleAnalysis } from "@/lib/sample-analysis";

export function generateStaticParams() {
  return [{ analysisId: sampleAnalysis.analysisId }];
}

export default async function ResultsPage({
  params
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const { analysisId } = await params;

  if (analysisId !== sampleAnalysis.analysisId) {
    notFound();
  }

  return <ResultsExperience analysis={sampleAnalysis} />;
}
