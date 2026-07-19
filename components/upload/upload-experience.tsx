"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, FileText, Shield, Sparkles, Target } from "lucide-react";
import { FileUploadCard } from "@/components/upload/file-upload-card";
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
type PreviewState = Record<UploadSlot, string | null>;
type UploadErrors = Record<UploadSlot, string>;
type AiAvailability =
  | { status: "checking" }
  | { status: "configured" }
  | { status: "unavailable"; message: string }
  | { status: "failed"; message: string };

type AiStatusResponse = {
  configured: boolean;
  provider: "OpenAI";
  modelConfigured: boolean;
};

type AnalyseResponse =
  | {
      success: true;
      mode: "live";
      analysis: AnalysisResult;
      askContextSeed?: unknown;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        retryable?: boolean;
        requestId?: string;
      };
      sampleAvailable: boolean;
    };

const initialUploads: UploadState = {
  questionPaper: null,
  evaluatedPaper: null,
  answerKey: null,
  markingScheme: null
};

const initialPreviews: PreviewState = {
  questionPaper: null,
  evaluatedPaper: null,
  answerKey: null,
  markingScheme: null
};

const initialUploadErrors: UploadErrors = {
  questionPaper: "",
  evaluatedPaper: "",
  answerKey: "",
  markingScheme: ""
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
    helper: "The questions you were answering"
  },
  {
    id: "evaluatedPaper",
    label: "Evaluated answer paper",
    required: true,
    helper: "The paper with marks and teacher notes"
  },
  {
    id: "answerKey",
    label: "Answer key",
    required: false,
    helper: "Helpful if you have it"
  },
  {
    id: "markingScheme",
    label: "Marking scheme",
    required: false,
    helper: "Helpful if your teacher shared one"
  }
];

const processingMessages = [
  "Preparing documents...",
  "Reading the question paper...",
  "Understanding the evaluated answers...",
  "Building your improvement plan..."
];

const unavailableMessage =
  "We can't read a new paper in this session yet. You can still explore a prepared paper and see how the guidance works.";
const statusCheckFailedMessage = "We couldn't check whether paper reading is ready. Please try again.";
const modelUnavailableMessage = "Paper reading is not fully ready on this deployment yet. Please try again shortly.";

function isSupportedFile(file: File) {
  return isSupportedFileName(file.name) && (!file.type || isSupportedUploadType(file.type));
}

export function UploadExperience() {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const previewUrlsRef = useRef<PreviewState>(initialPreviews);
  const [uploads, setUploads] = useState<UploadState>(initialUploads);
  const [previewUrls, setPreviewUrls] = useState<PreviewState>(initialPreviews);
  const [uploadErrors, setUploadErrors] = useState<UploadErrors>(initialUploadErrors);
  const [targetScore, setTargetScore] = useState("35");
  const [examDate, setExamDate] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAvailability, setAiAvailability] = useState<AiAvailability>({ status: "checking" });

  const acceptedFormats = useMemo(() => formatSupportedUploadTypes(), []);
  const acceptValue = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const checkAiAvailability = useCallback(async (showChecking = true) => {
    if (showChecking) {
      setAiAvailability({ status: "checking" });
    }

    try {
      const response = await fetch("/api/ai-status", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("AI status check failed.");
      }

      const status = (await response.json()) as AiStatusResponse;
      if (status.configured && status.modelConfigured && status.provider === "OpenAI") {
        setAiAvailability({ status: "configured" });
        return;
      }

      setAiAvailability({
        status: "unavailable",
        message: status.configured ? modelUnavailableMessage : unavailableMessage
      });
    } catch {
      setAiAvailability({
        status: "failed",
        message: statusCheckFailedMessage
      });
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    fetch("/api/ai-status", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("AI status check failed.");
        }
        return response.json() as Promise<AiStatusResponse>;
      })
      .then((status) => {
        if (!isActive) {
          return;
        }

        if (status.configured && status.modelConfigured && status.provider === "OpenAI") {
          setAiAvailability({ status: "configured" });
          return;
        }

        setAiAvailability({
          status: "unavailable",
          message: status.configured ? modelUnavailableMessage : unavailableMessage
        });
      })
      .catch(() => {
        if (isActive) {
          setAiAvailability({
            status: "failed",
            message: statusCheckFailedMessage
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  function setSlotError(slot: UploadSlot, message: string) {
    setUploadErrors((current) => ({
      ...current,
      [slot]: message
    }));
  }

  function revokePreview(slot: UploadSlot) {
    const existing = previewUrlsRef.current[slot];
    if (existing) {
      URL.revokeObjectURL(existing);
    }
    previewUrlsRef.current = {
      ...previewUrlsRef.current,
      [slot]: null
    };
    setPreviewUrls((current) => ({
      ...current,
      [slot]: null
    }));
  }

  function removeFile(slot: UploadSlot) {
    setError("");
    setSlotError(slot, "");
    revokePreview(slot);
    setUploads((current) => ({
      ...current,
      [slot]: null
    }));
  }

  function updateFile(slot: UploadSlot, file: File | null) {
    setError("");
    setSlotError(slot, "");
    if (!file) {
      removeFile(slot);
      return;
    }

    if (file && !isSupportedFile(file)) {
      setSlotError(slot, `This file type is hard for EvalLens to read right now. Please use ${acceptedFormats}.`);
      return;
    }

    if (file.size <= 0) {
      setSlotError(slot, "This file looks empty. Please choose the file again.");
      return;
    }

    if (file.size > maxUploadFileSizeBytes) {
      setSlotError(
        slot,
        `This file is ${bytesToMegabytes(file.size)} MB. Please choose a file under ${bytesToMegabytes(
          maxUploadFileSizeBytes
        )} MB so we can read it smoothly.`
      );
      return;
    }

    let nextPreviewUrl: string | null = null;
    if (file.type.startsWith("image/")) {
      try {
        nextPreviewUrl = URL.createObjectURL(file);
      } catch {
        setSlotError(slot, "We couldn't create a preview for this image. Please choose the file again.");
        return;
      }
    }

    const previousPreviewUrl = previewUrlsRef.current[slot];
    previewUrlsRef.current = {
      ...previewUrlsRef.current,
      [slot]: nextPreviewUrl
    };
    setUploads((current) => ({ ...current, [slot]: file }));
    setPreviewUrls((current) => ({ ...current, [slot]: nextPreviewUrl }));
    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
    }
  }

  async function createPlan() {
    if (inFlightRef.current || isProcessing) {
      return;
    }

    if (aiAvailability.status === "checking") {
      setError("Checking whether paper reading is ready. Please wait a moment.");
      return;
    }

    if (aiAvailability.status === "failed") {
      setError(aiAvailability.message);
      return;
    }

    if (aiAvailability.status !== "configured") {
      setError(aiAvailability.message);
      return;
    }

    if (!uploads.questionPaper || !uploads.evaluatedPaper) {
      setError("Add the question paper and the evaluated answer paper, then we can begin.");
      return;
    }

    const targetScoreValue = targetScore.trim() ? Number(targetScore) : undefined;
    if (targetScoreValue !== undefined && (!Number.isFinite(targetScoreValue) || targetScoreValue < 0)) {
      setError("Add a target score that feels realistic for your next attempt.");
      return;
    }

    setError("");
    inFlightRef.current = true;
    setIsProcessing(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 70_000);

    try {
      const formData = new FormData();
      formData.set("questionPaper", uploads.questionPaper);
      formData.set("evaluatedAnswerPaper", uploads.evaluatedPaper);
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

      const result = await fetch("/api/analyze", {
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
        setError("We couldn't finish reading this paper yet. You can try again, or look at a prepared paper for now.");
        return;
      }

      const sessionAnalysis = validated.data;
      window.sessionStorage.setItem(
        `evallens:analysis:${sessionAnalysis.analysisId}`,
        JSON.stringify(sessionAnalysis)
      );
      router.push(`/results/live?analysisId=${encodeURIComponent(sessionAnalysis.analysisId)}`);
    } catch {
      setError("We couldn't finish reading this paper yet. You can try again, or look at a prepared paper for now.");
    } finally {
      window.clearTimeout(timeoutId);
      inFlightRef.current = false;
      setIsProcessing(false);
    }
  }

  const canSubmit =
    Boolean(uploads.questionPaper && uploads.evaluatedPaper) &&
    aiAvailability.status === "configured" &&
    !isProcessing;

  if (isProcessing) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <section className="glass paper-shadow w-full max-w-2xl rounded-[34px] p-8 text-center sm:p-10">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#eef1ff] text-[#6d73d9]">
            <Sparkles size={20} aria-hidden />
          </span>
          <p className="mt-5 text-sm font-medium text-[#102a56]">You&apos;ve already done the hard part.</p>
          <h1 className="mt-4 text-balance text-4xl font-medium leading-tight sm:text-5xl">Understanding your answers...</h1>
          <div className="mt-10 space-y-3 text-left" role="status" aria-live="polite">
            {processingMessages.map((message, index) => (
              <div
                className="flex items-center gap-3 rounded-[20px] border premium-hairline bg-white/70 px-4 py-3.5"
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
            We are reading the paper gently and looking for the best place to begin.
          </p>
          {error ? (
            <div className="mt-5 rounded-2xl border border-[#e5d4c8] bg-[#fff8f4] px-4 py-3 text-sm text-[#7a4e43]">
              <p>{error}</p>
              <Link className="mt-3 inline-flex font-medium text-[#102a56]" href="/sample">
                Explore a prepared paper
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
        <Link className="focus-ring rounded-full text-lg font-medium" href="/">
          EvalLens AI
        </Link>
        <Link className="focus-ring rounded-full text-sm text-[#102a56]" href="/sample">
          See an example
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-14 py-16 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="lg:pt-10">
          <p className="text-sm font-medium text-[#6d73d9]">Let&apos;s understand your paper</p>
          <h1 className="mt-5 text-balance text-4xl font-medium leading-[1.05] sm:text-5xl">
            Your paper can show you what to do next.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-[#5f6671]">
            Add the paper and the teacher-marked answer sheet. We&apos;ll help you find the
            small changes that can make the biggest difference.
          </p>
          <div className="mt-8 flex max-w-xl gap-3 rounded-[24px] border premium-hairline bg-white/62 p-5 text-sm leading-6 text-[#5f6671]">
            <Shield className="mt-0.5 shrink-0 text-[#102a56]" size={17} aria-hidden />
            <p>
              Your documents are used only to generate this analysis. Avoid uploading papers
              containing unnecessary personal information.
            </p>
          </div>
        </div>

        <div className="soft-enter">
          <div className="grid gap-4 md:grid-cols-2">
            {slots.map((slot) => (
              <FileUploadCard
                key={slot.id}
                id={slot.id}
                label={slot.label}
                helper={slot.helper}
                required={slot.required}
                file={uploads[slot.id]}
                previewUrl={previewUrls[slot.id]}
                error={uploadErrors[slot.id]}
                accept={acceptValue}
                onSelect={(file) => updateFile(slot.id, file)}
                onRemove={() => removeFile(slot.id)}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="rounded-[28px] border premium-hairline bg-white/70 p-6 md:col-span-2">
              <span className="text-base font-medium">Subject</span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border premium-hairline bg-[#fffefb] px-4 py-3"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label className="rounded-[28px] border premium-hairline bg-white/70 p-6">
              <span className="flex items-center gap-2 text-base font-medium">
                <Target size={17} aria-hidden />
                Goal for next time
              </span>
              <input
                className="focus-ring mt-4 w-full rounded-2xl border premium-hairline bg-[#fffefb] px-4 py-3"
                type="number"
                min="0"
                value={targetScore}
                onChange={(event) => setTargetScore(event.target.value)}
              />
            </label>
            <label className="rounded-[28px] border premium-hairline bg-white/70 p-6">
              <span className="flex items-center gap-2 text-base font-medium">
                <CalendarDays size={17} aria-hidden />
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
            <div className="mt-4 rounded-2xl border border-[#e5d4c8] bg-[#fff8f4] px-4 py-3 text-sm text-[#7a4e43]">
              <p>{error}</p>
              <button
                className="focus-ring mt-3 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-[#102a56] transition hover:bg-white"
                type="button"
                onClick={() => void createPlan()}
              >
                Retry
              </button>
            </div>
          ) : null}

          {aiAvailability.status === "checking" ? (
            <p className="mt-4 rounded-2xl border premium-hairline bg-white/62 px-4 py-3 text-sm text-[#666d78]" role="status">
              Checking whether paper reading is ready...
            </p>
          ) : null}

          {aiAvailability.status === "unavailable" ? (
            <div className="mt-4 rounded-2xl border border-[#e5d4c8] bg-[#fff8f4] px-4 py-3 text-sm text-[#7a4e43]">
              <p>{aiAvailability.message}</p>
              <Link className="mt-3 inline-flex font-medium text-[#102a56]" href="/sample">
                Explore a prepared paper
              </Link>
            </div>
          ) : null}

          {aiAvailability.status === "failed" ? (
            <div className="mt-4 rounded-2xl border border-[#e5d4c8] bg-[#fff8f4] px-4 py-3 text-sm text-[#7a4e43]">
              <p>{aiAvailability.message}</p>
              <button
                className="focus-ring mt-3 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-[#102a56] transition hover:bg-white"
                type="button"
                onClick={() => void checkAiAvailability()}
              >
                Check again
              </button>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[#102a56] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#091b3d] disabled:cursor-not-allowed disabled:opacity-55"
              type="button"
              disabled={!canSubmit}
              onClick={() => void createPlan()}
            >
              <FileText size={17} aria-hidden />
              {isProcessing
                ? "Preparing my next step"
                : aiAvailability.status === "checking"
                  ? "Checking paper reading"
                  : "Help me find my next step"}
            </button>
            <Link
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border premium-hairline bg-white/72 px-5 py-3 text-sm font-medium text-[#102a56] transition hover:bg-white/90"
              href="/sample"
            >
              See a gentle example
              <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
