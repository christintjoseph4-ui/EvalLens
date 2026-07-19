"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, FileText, Shield, Sparkles, Target, UploadCloud } from "lucide-react";
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
  "Understanding teacher feedback",
  "Building learning intelligence",
  "Preparing your improvement plan"
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
      setError(`Please upload a ${acceptedFormats} file.`);
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
        setError("This paper needs a more careful read. You can still explore the prepared sample.");
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
      setError("This upload needs another try. You can still explore the prepared sample.");
    } finally {
      window.clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <section className="glass paper-shadow w-full max-w-2xl rounded-[36px] p-8 text-center sm:p-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef1ff] text-[#6d73d9]">
            <Sparkles size={22} aria-hidden />
          </span>
          <p className="mt-5 text-sm font-medium text-[#102a56]">Building your improvement plan</p>
          <h1 className="mt-3 text-balance text-5xl font-semibold leading-tight">Reading the paper with care</h1>
          <div className="mt-9 space-y-3 text-left" role="status" aria-live="polite">
            {processingMessages.map((message, index) => (
              <div
                className="flex items-center gap-3 rounded-[22px] border premium-hairline bg-white/70 px-4 py-3"
                key={message}
              >
                <span
                  className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#6d73d9]"
                  style={{ animationDelay: `${index * 180}ms` }}
                />
                <span className="text-[#2b3340]">{message}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-[#666d78]">
            EvalLens is reading the paper and teacher feedback. If this upload needs more care,
            the prepared sample remains available.
          </p>
          {error ? (
            <div className="mt-5 rounded-2xl border border-[#e5d4c8] bg-[#fff8f4] px-4 py-3 text-sm text-[#7a4e43]">
              <p>{error}</p>
              <Link className="mt-3 inline-flex font-medium text-[#102a56]" href="/sample">
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
        <Link className="focus-ring rounded-full text-sm text-[#102a56]" href="/sample">
          Try sample
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 py-12 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="lg:pt-8">
          <p className="text-sm font-medium text-[#6d73d9]">Start My Learning Journey</p>
          <h1 className="mt-4 text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl">
            Your evaluated paper becomes a learning journey.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f6671]">
            Add the evaluated paper and related exam material. EvalLens will turn the evidence
            into a calm plan for what to do next.
          </p>
          <div className="mt-7 flex max-w-xl gap-3 rounded-[26px] border premium-hairline bg-white/62 p-4 text-sm leading-6 text-[#5f6671]">
            <Shield className="mt-0.5 shrink-0 text-[#102a56]" size={18} aria-hidden />
            <p>
              Your papers are processed to create this analysis. Avoid uploading documents
              containing unnecessary personal information.
            </p>
          </div>
        </div>

        <div className="soft-enter">
          <div className="grid gap-4 md:grid-cols-2">
            {slots.map((slot) => (
              <label
                className={`focus-within:ring-2 focus-within:ring-[#6d73d9]/35 rounded-[30px] border premium-hairline bg-white/70 p-5 transition hover:bg-white ${
                  slot.required ? "md:min-h-64" : "md:min-h-44"
                }`}
                key={slot.id}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold">{slot.label}</span>
                  {slot.required ? (
                    <span className="text-xs uppercase tracking-[0.12em] text-[#6d73d9]">
                      Required
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-sm text-[#666d78]">{slot.helper}</span>
                <span
                  className={`mt-6 flex flex-col items-center justify-center rounded-[26px] border border-dashed border-[#ccd3df] bg-[#f8f9fc] px-4 py-6 text-center ${
                    slot.required ? "min-h-32" : "min-h-20"
                  }`}
                >
                  <UploadCloud size={25} className="text-[#102a56]" aria-hidden />
                  <span className="mt-3 max-w-full truncate text-sm text-[#2b3340]">
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
            <label className="rounded-[30px] border premium-hairline bg-white/70 p-5 md:col-span-2">
              <span className="text-lg font-semibold">Subject</span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border premium-hairline bg-[#fffefb] px-4 py-3"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label className="rounded-[30px] border premium-hairline bg-white/70 p-5">
              <span className="flex items-center gap-2 text-lg font-semibold">
                <Target size={18} aria-hidden />
                Target score
              </span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border premium-hairline bg-[#fffefb] px-4 py-3"
                type="number"
                min="0"
                value={targetScore}
                onChange={(event) => setTargetScore(event.target.value)}
              />
            </label>
            <label className="rounded-[30px] border premium-hairline bg-white/70 p-5">
              <span className="flex items-center gap-2 text-lg font-semibold">
                <CalendarDays size={18} aria-hidden />
                Exam date
              </span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border premium-hairline bg-[#fffefb] px-4 py-3"
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
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#102a56] px-6 py-3.5 font-medium text-white transition hover:bg-[#091b3d] disabled:cursor-not-allowed disabled:opacity-55"
              type="button"
              disabled={isProcessing}
              onClick={() => void createPlan()}
            >
              <FileText size={18} aria-hidden />
              {isProcessing ? "Building my improvement plan" : "Build my improvement plan"}
            </button>
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border premium-hairline bg-white/72 px-6 py-3.5 font-medium text-[#102a56] transition hover:bg-white"
              href="/sample"
            >
              Try Sample Experience
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
