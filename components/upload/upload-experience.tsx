"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, FileText, Target, UploadCloud } from "lucide-react";
import {
  bytesToMegabytes,
  formatSupportedUploadTypes,
  isSupportedFileName,
  isSupportedUploadType,
  maxUploadFileSizeBytes
} from "@/lib/document-processing";
import { safeValidateAnalysisResult } from "@/lib/validation";
import type { AnalysisResult } from "@/types/analysis";

type UploadSlot = "questionPaper" | "evaluatedPaper" | "answerKey" | "markingScheme";

type UploadState = Record<UploadSlot, File | null>;

type AnalyseResponse =
  | {
      success: true;
      mode: "live";
      analysis: AnalysisResult;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
      sampleAvailable: boolean;
    };

const initialUploads: UploadState = {
  questionPaper: null,
  evaluatedPaper: null,
  answerKey: null,
  markingScheme: null
};

const slots: Array<{
  id: UploadSlot;
  label: string;
  required: boolean;
  helper: string;
}> = [
  {
    id: "questionPaper",
    label: "Question paper",
    required: true,
    helper: "PDF, JPG, JPEG or PNG"
  },
  {
    id: "evaluatedPaper",
    label: "Evaluated answer paper",
    required: true,
    helper: "Include teacher marks and annotations"
  },
  {
    id: "answerKey",
    label: "Answer key",
    required: false,
    helper: "Optional"
  },
  {
    id: "markingScheme",
    label: "Marking scheme",
    required: false,
    helper: "Optional"
  }
];

const processingMessages = [
  "Understanding the questions",
  "Connecting answers with evaluator observations",
  "Identifying growth opportunities",
  "Preparing your next learning steps"
];

function isSupportedFile(file: File) {
  return isSupportedFileName(file.name) && (!file.type || isSupportedUploadType(file.type));
}

function readImageDataUrl(file: File | null) {
  if (!file || !file.type.startsWith("image/")) {
    return Promise.resolve<string | null>(null);
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image preview."));
    reader.readAsDataURL(file);
  });
}

function attachSessionPreview(analysis: AnalysisResult, previewUrl: string | null) {
  if (!previewUrl) {
    return analysis;
  }

  return {
    ...analysis,
    questions: analysis.questions.map((question) => ({
      ...question,
      paperPageImage:
        question.paperPageImage === "live-upload-preview" ? previewUrl : question.paperPageImage
    }))
  };
}

export function UploadExperience() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadState>(initialUploads);
  const [targetScore, setTargetScore] = useState("35");
  const [examDate, setExamDate] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const acceptedFormats = useMemo(() => formatSupportedUploadTypes(), []);

  function updateFile(slot: UploadSlot, file: File | null) {
    setError("");
    if (file && !isSupportedFile(file)) {
      setError(`That file type is not supported yet. Please use ${acceptedFormats}.`);
      return;
    }

    if (file && file.size > maxUploadFileSizeBytes) {
      setError(
        `That file is ${bytesToMegabytes(file.size)} MB. Please upload a file under ${bytesToMegabytes(
          maxUploadFileSizeBytes
        )} MB.`
      );
      return;
    }

    setUploads((current) => ({
      ...current,
      [slot]: file
    }));
  }

  async function createPlan() {
    if (isProcessing) {
      return;
    }

    if (!uploads.questionPaper || !uploads.evaluatedPaper) {
      setError("Please add both the question paper and evaluated answer paper to continue.");
      return;
    }

    const targetScoreValue = targetScore.trim() ? Number(targetScore) : undefined;
    if (targetScoreValue !== undefined && (!Number.isFinite(targetScoreValue) || targetScoreValue < 0)) {
      setError("Please enter a valid target score.");
      return;
    }

    setError("");
    setIsProcessing(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 70_000);

    try {
      const formData = new FormData();
      formData.set("questionPaper", uploads.questionPaper);
      formData.set("evaluatedPaper", uploads.evaluatedPaper);
      if (uploads.answerKey) {
        formData.set("answerKey", uploads.answerKey);
      }
      if (uploads.markingScheme) {
        formData.set("markingScheme", uploads.markingScheme);
      }
      if (targetScoreValue !== undefined) {
        formData.set("targetScore", String(targetScoreValue));
      }
      if (examDate) {
        formData.set("examDate", examDate);
      }
      if (subject.trim()) {
        formData.set("subject", subject.trim());
      }

      const result = await fetch("/api/analyse", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      const payload = (await result.json()) as AnalyseResponse;

      if (!payload.success) {
        setError(payload.error.message);
        return;
      }

      const validated = safeValidateAnalysisResult(payload.analysis);
      if (!validated.success) {
        setError("The live analysis was not reliable enough to show. Please explore the prepared sample.");
        return;
      }

      const previewUrl = await readImageDataUrl(uploads.evaluatedPaper);
      const sessionAnalysis = attachSessionPreview(validated.data, previewUrl);
      window.sessionStorage.setItem(
        `evallens:analysis:${sessionAnalysis.analysisId}`,
        JSON.stringify(sessionAnalysis)
      );
      router.push(`/results/live?analysisId=${encodeURIComponent(sessionAnalysis.analysisId)}`);
    } catch {
      setError(
        "We could not complete this upload reliably. Explore the prepared sample to experience the complete EvalLens workflow."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <section className="glass paper-shadow w-full max-w-2xl rounded-[32px] p-8 text-center">
          <p className="text-sm font-medium text-[#365f5b]">Creating your improvement plan</p>
          <h1 className="mt-3 text-4xl font-semibold">Reading the paper with care</h1>
          <div className="mt-8 space-y-3 text-left">
            {processingMessages.map((message, index) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-[#e3ded3] bg-white/62 px-4 py-3"
                key={message}
              >
                <span
                  className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#365f5b]"
                  style={{ animationDelay: `${index * 180}ms` }}
                />
                <span className="text-[#4f5754]">{message}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-[#6b716f]">
            Live analysis is running on the server. If the upload cannot be read reliably,
            the prepared sample remains available.
          </p>
          {error ? (
            <div className="mt-5 rounded-2xl border border-[#e5d4c8] bg-[#fff8f4] px-4 py-3 text-sm text-[#7a4e43]">
              <p>{error}</p>
              <Link className="mt-3 inline-flex font-medium text-[#365f5b]" href="/sample">
                Explore the prepared sample
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <nav className="mx-auto flex max-w-6xl items-center justify-between py-3">
        <Link className="focus-ring rounded-full text-lg font-semibold" href="/">
          EvalLens AI
        </Link>
        <Link className="focus-ring rounded-full text-sm text-[#365f5b]" href="/sample">
          Try sample
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-8 py-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-medium text-[#365f5b]">Analyse an evaluated paper</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            Create my improvement plan
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-[#626966]">
            Add the evaluated paper and related exam material. Live analysis uses the server-side
            OpenAI pipeline; the prepared sample stays available for a reliable demo.
          </p>
          <p className="mt-4 max-w-xl rounded-2xl border border-[#ddd8ce] bg-white/58 px-4 py-3 text-sm leading-6 text-[#626966]">
            Your papers are processed to create this analysis. Avoid uploading documents
            containing unnecessary personal information.
          </p>
        </div>

        <div className="glass rounded-[28px] p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {slots.map((slot) => (
              <label
                className="focus-within:ring-2 focus-within:ring-[#365f5b]/40 rounded-3xl border border-[#e2dcd0] bg-white/64 p-5"
                key={slot.id}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{slot.label}</span>
                  {slot.required ? (
                    <span className="text-xs uppercase tracking-[0.12em] text-[#8b6d3f]">
                      Required
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-sm text-[#6b716f]">{slot.helper}</span>
                <span className="mt-5 flex min-h-24 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfc8ba] bg-[#faf7f0] px-4 py-5 text-center">
                  <UploadCloud size={24} className="text-[#365f5b]" aria-hidden />
                  <span className="mt-3 max-w-full truncate text-sm text-[#4f5754]">
                    {uploads[slot.id]?.name ?? "Choose file"}
                  </span>
                </span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  aria-label={slot.label}
                  onChange={(event) => updateFile(slot.id, event.target.files?.[0] ?? null)}
                />
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="rounded-3xl border border-[#e2dcd0] bg-white/64 p-5 md:col-span-2">
              <span className="font-medium">Subject</span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border border-[#d9d2c5] bg-[#fffdf8] px-4 py-3"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label className="rounded-3xl border border-[#e2dcd0] bg-white/64 p-5">
              <span className="flex items-center gap-2 font-medium">
                <Target size={18} aria-hidden />
                Target score
              </span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border border-[#d9d2c5] bg-[#fffdf8] px-4 py-3"
                type="number"
                min="0"
                value={targetScore}
                onChange={(event) => setTargetScore(event.target.value)}
              />
            </label>
            <label className="rounded-3xl border border-[#e2dcd0] bg-white/64 p-5">
              <span className="flex items-center gap-2 font-medium">
                <CalendarDays size={18} aria-hidden />
                Exam date
              </span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border border-[#d9d2c5] bg-[#fffdf8] px-4 py-3"
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-[#e5d4c8] bg-[#fff8f4] px-4 py-3 text-sm text-[#7a4e43]">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#365f5b] px-6 py-3 font-medium text-white transition hover:bg-[#244843] disabled:cursor-not-allowed disabled:opacity-55"
              type="button"
              disabled={isProcessing}
              onClick={() => void createPlan()}
            >
              <FileText size={18} aria-hidden />
              {isProcessing ? "Creating my improvement plan" : "Create my improvement plan"}
            </button>
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-[#cfc8ba] bg-white/70 px-6 py-3 font-medium text-[#244843] transition hover:bg-white"
              href="/sample"
            >
              Try the sample experience
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
