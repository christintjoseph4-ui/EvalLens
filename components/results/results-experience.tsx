"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import type { AnalysisQuestion, AnalysisResult, EvaluationClassification } from "@/types/analysis";

type AskResponse = {
  answer: string;
  evidence: string[];
  classification: "evidence" | "inference" | "teacher_discretion";
  nextAction: string;
};

const classificationCopy: Record<
  EvaluationClassification,
  { label: string; description: string; tone: string }
> = {
  consistent: {
    label: "Consistent evaluation",
    description: "The awarded marks align with the visible evidence and expected rubric areas.",
    tone: "bg-[#edf8f3] text-[#102a56] border-[#d9efe5]"
  },
  objective_review_opportunity: {
    label: "Potential review opportunity",
    description: "This response may benefit from a second review. EvalLens has not changed marks.",
    tone: "bg-[#f4ecd9] text-[#755a2d] border-[#dfcda8]"
  },
  teacher_discretion: {
    label: "Teacher discretion",
    description:
      "This area depends on evaluator discretion. EvalLens has used it only to identify future learning priorities.",
    tone: "bg-[#f0f3ff] text-[#4248a0] border-[#dce0ff]"
  }
};

const suggestedPrompts = [
  "Why was this answer incomplete?",
  "What exactly was missing?",
  "Explain the teacher's comment.",
  "Show me a full-mark answer.",
  "Give me two similar questions.",
  "Could this answer benefit from teacher review?",
  "Teach this concept in two minutes."
];

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function toPercent(value: number) {
  return `${value * 100}%`;
}

function getModeSummary(question: AnalysisQuestion, mode: string) {
  if (mode === "full-mark") {
    return question.fullMarkAnswer;
  }

  if (mode === "teach") {
    return question.conceptMinute;
  }

  if (mode === "practice") {
    return question.similarQuestions.join(" ");
  }

  if (mode === "review") {
    return classificationCopy[question.evaluationClassification].description;
  }

  return question.deductionReason;
}

function EvidenceOverlay({ question }: { question: AnalysisQuestion }) {
  const annotationRegions = question.teacherAnnotations
    .map((annotation) => annotation.region)
    .filter((region): region is NonNullable<typeof region> => Boolean(region));

  const canRenderImage =
    question.paperPageImage.startsWith("/") || question.paperPageImage.startsWith("data:image/");

  if (!canRenderImage) {
    return (
      <div className="rounded-[28px] border premium-hairline bg-white/76 p-6">
        <p className="text-sm font-medium text-[#6d73d9]">Evidence preview</p>
        <h3 className="mt-2 text-2xl font-semibold">Paper image preview unavailable</h3>
        <p className="mt-3 leading-7 text-[#5f6671]">
          EvalLens could read the uploaded document, but this demo keeps live files only in the
          current session and does not persist rendered PDF pages. Use the evidence notes on the
          right for this question.
        </p>
        <div className="mt-5 rounded-2xl border premium-hairline bg-[#f8f9fc] p-4">
          <p className="text-sm font-semibold">Student answer evidence</p>
          <p className="mt-2 text-sm leading-6 text-[#5f6671]">{question.studentAnswer}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border premium-hairline bg-white">
      {question.paperPageImage.startsWith("data:image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.paperPageImage}
          alt={`Evaluated answer paper page for question ${question.number}`}
          className="h-auto w-full"
        />
      ) : (
        <Image
          src={question.paperPageImage}
          alt={`Evaluated answer paper page for question ${question.number}`}
          width={900}
          height={1200}
          className="h-auto w-full"
          priority
        />
      )}
      <div
        className="absolute rounded-xl border-2 border-[#102a56] bg-[#72c7a3]/22"
        style={{
          left: toPercent(question.answerRegion.x),
          top: toPercent(question.answerRegion.y),
          width: toPercent(question.answerRegion.width),
          height: toPercent(question.answerRegion.height)
        }}
      />
      {annotationRegions.map((region, index) => (
        <div
          className="absolute rounded-lg border-2 border-[#b98273] bg-[#b98273]/16"
          key={`${question.id}-annotation-${index}`}
          style={{
            left: toPercent(region.x),
            top: toPercent(region.y),
            width: toPercent(region.width),
            height: toPercent(region.height)
          }}
        />
      ))}
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-3xl border border-[#e2dcd0] bg-white/68 p-5">
      <p className="text-sm text-[#666d78]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#656d69]">{helper}</p>
    </article>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-[#2b3340]">{label}</span>
        <span className="font-medium">{percent(value)}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#e7e1d6]">
        <motion.div
          className="h-2 rounded-full bg-[#6d73d9]"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function Overview({ analysis }: { analysis: AnalysisResult }) {
  const metrics = [
    {
      label: "Current score",
      value: `${analysis.studentGoal.currentScore}/${analysis.exam.maximumMarks}`,
      helper: "Teacher-awarded score"
    },
    {
      label: "Target score",
      value: `${analysis.studentGoal.targetScore ?? analysis.exam.maximumMarks}`,
      helper: "Student goal for the next attempt"
    },
    {
      label: "Recoverable marks",
      value: `${analysis.studentGoal.recoverableMarks}`,
      helper: "Evidence-based improvement opportunity"
    },
    {
      label: "Potential score",
      value: `${analysis.studentGoal.potentialScore}/${analysis.exam.maximumMarks}`,
      helper: "Never exceeds maximum marks"
    }
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="glass rounded-[28px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">Biggest Opportunity</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">{analysis.summary.headline}</h2>
          <p className="mt-4 leading-7 text-[#5f6671]">{analysis.summary.supportingMessage}</p>
        </article>
        <article className="glass rounded-[28px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">Strong Foundation</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">
            Conceptual understanding is improving.
          </h2>
          <p className="mt-4 leading-7 text-[#5f6671]">
            The sample history shows steady growth across three evaluations, with numerical
            accuracy still the highest-impact development area.
          </p>
        </article>
        <article className="glass rounded-[28px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">Today&apos;s Focus</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">
            {analysis.summary.nextBestAction}
          </h2>
          <a
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-[#102a56] px-5 py-3 font-medium text-white"
            href="#paper"
          >
            Explore my paper
            <ArrowRight size={18} aria-hidden />
          </a>
        </article>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}

function QuestionExplorer({ analysis }: { analysis: AnalysisResult }) {
  const [selectedId, setSelectedId] = useState(analysis.questions[0]?.id ?? "");
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState("deduction");

  const selectedQuestion = useMemo(
    () => analysis.questions.find((question) => question.id === selectedId) ?? analysis.questions[0],
    [analysis.questions, selectedId]
  );

  const selectedIndex = analysis.questions.findIndex((question) => question.id === selectedQuestion.id);
  const classification = classificationCopy[selectedQuestion.evaluationClassification];

  function go(delta: number) {
    const nextIndex = Math.min(Math.max(selectedIndex + delta, 0), analysis.questions.length - 1);
    const nextQuestion = analysis.questions[nextIndex];
    if (nextQuestion) {
      setSelectedId(nextQuestion.id);
      setMode("deduction");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12" id="paper">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[#6d73d9]">Question Explorer</p>
          <h2 className="mt-2 text-balance text-5xl font-semibold leading-tight">
            Evidence first. Guidance that feels human.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis.questions.map((question) => (
            <button
              className={`focus-ring rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedId === question.id
                  ? "bg-[#102a56] text-white"
                  : "border premium-hairline bg-white/68 text-[#2b3340] hover:bg-white"
              }`}
              type="button"
              key={question.id}
              onClick={() => {
                setSelectedId(question.id);
                setMode("deduction");
              }}
            >
              Q{question.number}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.92fr]">
        <div className="glass rounded-[30px] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#666d78]">Original evaluated answer paper</p>
              <p className="font-medium">Page {selectedQuestion.teacherAnnotations[0]?.page ?? 1}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="focus-ring rounded-full border premium-hairline bg-white/70 p-2 text-[#102a56]"
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((current) => Math.max(0.82, current - 0.08))}
              >
                <ZoomOut size={18} aria-hidden />
              </button>
              <button
                className="focus-ring rounded-full border premium-hairline bg-white/70 p-2 text-[#102a56]"
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((current) => Math.min(1.16, current + 0.08))}
              >
                <ZoomIn size={18} aria-hidden />
              </button>
            </div>
          </div>
          <div className="max-h-[760px] overflow-auto rounded-[24px] bg-[#ece7dc] p-3">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
              <EvidenceOverlay question={selectedQuestion} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-full border premium-hairline bg-white/68 px-4 py-2 text-sm disabled:opacity-40"
              type="button"
              disabled={selectedIndex === 0}
              onClick={() => go(-1)}
            >
              <ChevronLeft size={16} aria-hidden />
              Previous
            </button>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-full border premium-hairline bg-white/68 px-4 py-2 text-sm disabled:opacity-40"
              type="button"
              disabled={selectedIndex === analysis.questions.length - 1}
              onClick={() => go(1)}
            >
              Next
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>

        <aside className="glass rounded-[30px] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-[#666d78]">Question {selectedQuestion.number}</p>
              <h3 className="mt-2 text-2xl font-semibold leading-snug">
                {selectedQuestion.questionText}
              </h3>
            </div>
            <div className="rounded-2xl border premium-hairline bg-white/70 px-4 py-3 text-center">
              <p className="text-sm text-[#666d78]">Marks</p>
              <p className="text-xl font-semibold">
                {selectedQuestion.awardedMarks}/{selectedQuestion.maximumMarks}
              </p>
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border px-4 py-3 ${classification.tone}`}>
            <p className="font-medium">{classification.label}</p>
            <p className="mt-1 text-sm leading-6">{classification.description}</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/62 p-4">
              <h4 className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={18} className="text-[#102a56]" aria-hidden />
                What went well
              </h4>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f6671]">
                {selectedQuestion.whatWentWell.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/62 p-4">
              <h4 className="flex items-center gap-2 font-semibold">
                <Target size={18} className="text-[#6d73d9]" aria-hidden />
                Could strengthen
              </h4>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f6671]">
                {selectedQuestion.improvementOpportunities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white/76 p-4">
            <h4 className="font-semibold">Relevant evidence</h4>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f6671]">
              {selectedQuestion.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <p className="rounded-2xl bg-[#f8f9fc] p-4 text-sm leading-6">
              <span className="block font-semibold text-[#1f2423]">Topic</span>
              {selectedQuestion.topic}
            </p>
            <p className="rounded-2xl bg-[#f8f9fc] p-4 text-sm leading-6">
              <span className="block font-semibold text-[#1f2423]">Next action</span>
              {selectedQuestion.nextAction}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["deduction", "Why did I lose marks?"],
              ["full-mark", "Show a full-mark answer"],
              ["teach", "Teach this concept"],
              ["practice", "Give me a similar question"],
              ["review", "Could this benefit from review?"]
            ].map(([id, label]) => (
              <button
                className={`focus-ring rounded-full px-4 py-2 text-sm font-medium ${
                  mode === id
                    ? "bg-[#102a56] text-white"
                    : "border premium-hairline bg-white/70 text-[#102a56]"
                }`}
                type="button"
                key={id}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#ded8ce] bg-white/72 p-4">
            <p className="text-sm font-semibold text-[#6d73d9]">
              {mode === "deduction"
                ? "Likely reason"
                : mode === "full-mark"
                  ? "Full-mark answer guidance"
                  : mode === "teach"
                    ? "Two-minute concept"
                    : mode === "practice"
                      ? "Similar practice"
                      : "Review boundary"}
            </p>
            <p className="mt-2 leading-7 text-[#2b3340]">{getModeSummary(selectedQuestion, mode)}</p>
          </div>

          <AskMyPaper key={selectedQuestion.id} question={selectedQuestion} />
        </aside>
      </div>
    </section>
  );
}

function AskMyPaper({ question }: { question: AnalysisQuestion }) {
  const [prompt, setPrompt] = useState(suggestedPrompts[0] ?? "");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function askPaper(nextPrompt = prompt) {
    setPrompt(nextPrompt);
    setError("");
    setIsLoading(true);
    setResponse(null);

    try {
      const result = await fetch("/api/ask-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, prompt: nextPrompt, question })
      });

      if (!result.ok) {
        throw new Error("Unable to answer from paper context.");
      }

      const payload = (await result.json()) as { response: AskResponse };
      setResponse(payload.response);
    } catch {
      setError("I could not answer that reliably from this question context. Try a suggested prompt.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-[28px] border premium-hairline bg-white/78 p-4">
      <h4 className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle size={19} className="text-[#102a56]" aria-hidden />
        Ask My Paper
      </h4>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestedPrompts.map((item) => (
          <button
            className="focus-ring rounded-full border premium-hairline bg-white px-3 py-2 text-xs font-medium text-[#102a56]"
            type="button"
            key={item}
            onClick={() => void askPaper(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="paper-question">
          Ask a question about this paper
        </label>
        <input
          id="paper-question"
          className="focus-ring min-w-0 flex-1 rounded-full border premium-hairline bg-white px-4 py-3 text-sm"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button
          className="focus-ring rounded-full bg-[#102a56] px-4 py-3 text-white disabled:opacity-50"
          type="button"
          disabled={isLoading || !prompt.trim()}
          onClick={() => void askPaper()}
          aria-label="Ask paper"
        >
          <Search size={18} aria-hidden />
        </button>
      </div>
      {isLoading ? <p className="mt-4 text-sm text-[#666d78]">Grounding the answer in this question...</p> : null}
      {error ? <p className="mt-4 text-sm text-[#7a4e43]">{error}</p> : null}
      {response ? (
        <div className="mt-4 space-y-3 text-sm leading-6">
          <div>
            <p className="font-semibold">Direct evidence</p>
            <ul className="mt-1 space-y-1 text-[#5f6671]">
              {response.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p>
            <span className="font-semibold">Answer: </span>
            <span className="text-[#5f6671]">{response.answer}</span>
          </p>
          <p>
            <span className="font-semibold">Classification: </span>
            <span className="text-[#5f6671]">{response.classification.replaceAll("_", " ")}</span>
          </p>
          <p>
            <span className="font-semibold">Next step: </span>
            <span className="text-[#5f6671]">{response.nextAction}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}

function CircularMetric({ label, value }: { label: string; value: number }) {
  const background = `conic-gradient(#6d73d9 ${Math.round(value) * 3.6}deg, #edf0f6 0deg)`;

  return (
    <article className="rounded-[30px] border premium-hairline bg-white/70 p-5 text-center">
      <div
        className="mx-auto flex h-28 w-28 items-center justify-center rounded-full"
        style={{ background }}
        aria-label={`${label}: ${percent(value)}`}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fffefb]">
          <span className="text-2xl font-semibold text-[#102a56]">{percent(value)}</span>
        </div>
      </div>
      <p className="mt-4 font-semibold">{label}</p>
    </article>
  );
}

function RevisionAndJourney({ analysis, isLive }: { analysis: AnalysisResult; isLive: boolean }) {
  const reviewCount = analysis.reviewOpportunities.length;
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-[34px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">Revision Plan</p>
          <h2 className="mt-2 text-4xl font-semibold">Today, tomorrow, this week.</h2>
          <div className="mt-6 space-y-3">
            {analysis.revisionPlan.map((item, index) => (
              <article className="rounded-[28px] border premium-hairline bg-white/70 p-5" key={item.priority}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {index === 0 ? "Today's Focus" : index === 1 ? "Tomorrow" : "This Week"} · {item.topic}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#5f6671]">{item.reason}</p>
                  </div>
                  <span className="rounded-full bg-[#edf8f3] px-3 py-1 text-sm text-[#102a56]">
                    {item.durationMinutes} min
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#2b3340]">{item.action}</p>
                <p className="mt-2 text-sm text-[#666d78]">{item.expectedBenefit}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="glass rounded-[34px] p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-[#6d73d9]">Learning Journey</p>
              <h2 className="mt-2 text-4xl font-semibold">
                {isLive ? "Learning history preview" : "Sample learning history"}
              </h2>
            </div>
            <span className="rounded-full border premium-hairline bg-white/70 px-3 py-1 text-sm text-[#666d78]">
              {isLive ? "Preview" : "Seeded data"}
            </span>
          </div>
          <p className="mt-4 leading-7 text-[#5f6671]">
            Your conceptual understanding has improved across three evaluations. Numerical
            accuracy remains your highest-impact development area.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {analysis.historicalPreview.map((point, index) => (
              <article className="rounded-[28px] border premium-hairline bg-white/70 p-5" key={point.testName}>
                <p className="text-sm text-[#666d78]">
                  {index === 0 ? "Current" : index === 1 ? "Next" : "Target"}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{point.testName}</h3>
                <p className="mt-4 text-3xl font-semibold text-[#102a56]">{point.score}/40</p>
                <div className="mt-4 space-y-3">
                  <ProgressBar label="Concept" value={point.conceptMastery} />
                  <ProgressBar label="Accuracy" value={point.numericalAccuracy} />
                  <ProgressBar label="Completeness" value={point.answerCompleteness} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-5">
          <p className="text-sm font-medium text-[#6d73d9]">Learning Twin</p>
          <h2 className="mt-2 text-4xl font-semibold">Not statistics. A clearer picture.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CircularMetric label="Concept Mastery" value={analysis.learningTwin.conceptMastery} />
          <CircularMetric label="Numerical Accuracy" value={analysis.learningTwin.numericalAccuracy} />
          <CircularMetric label="Presentation" value={analysis.learningTwin.presentation} />
          <CircularMetric label="Learning Confidence" value={analysis.learningTwin.answerCompleteness} />
        </div>
      </section>

      <section className="mt-5">
        <article className="glass rounded-[34px] p-6 sm:p-8">
          <ClipboardCheck className="text-[#102a56]" size={24} aria-hidden />
          <p className="mt-5 text-sm font-medium text-[#6d73d9]">Review Opportunity</p>
          <h2 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight">
            {reviewCount > 0 ? `${reviewCount} objective case to discuss.` : "No objective review signal."}
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#5f6671]">
            Potential review opportunities are shown only when objective evidence is strong.
            Teacher authority remains protected, and subjective answers stay in the learning lane.
          </p>
        </article>
      </section>
    </div>
  );
}

export function ResultsExperience({
  analysis,
  modeLabel = "Evidence-based sample",
  isLive = false
}: {
  analysis: AnalysisResult;
  modeLabel?: string;
  isLive?: boolean;
}) {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Link className="focus-ring rounded-full text-lg font-semibold" href="/">
          EvalLens AI
        </Link>
        <div className="flex items-center gap-2 rounded-full border premium-hairline bg-white/62 px-3 py-2 text-sm text-[#5f6671]">
          <ShieldCheck size={16} className="text-[#102a56]" aria-hidden />
          {modeLabel}
        </div>
      </nav>

      <header className="mx-auto max-w-7xl px-5 pt-4 sm:px-8 lg:px-12">
        <div className="glass rounded-[34px] p-7 sm:p-9">
          <p className="text-sm font-medium text-[#6d73d9]">{analysis.exam.subject}</p>
          <h1 className="mt-3 max-w-4xl text-balance text-5xl font-semibold leading-tight sm:text-7xl">
            Your paper has a next step.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5f6671]">
            {isLive
              ? "This live analysis was created from the uploaded papers in this browser session. EvalLens connects visible evidence, awarded marks, and next actions without overriding the evaluator."
              : "This prepared Physics demonstration shows how EvalLens connects marks, teacher annotations, student work, and next actions without overriding the evaluator."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-[#102a56] px-5 py-3 font-medium text-white"
              href="#paper"
            >
              Explore my paper
              <ArrowRight size={18} aria-hidden />
            </a>
            <a
              className="focus-ring inline-flex items-center gap-2 rounded-full border premium-hairline bg-white/70 px-5 py-3 font-medium text-[#102a56]"
              href="#journey"
            >
              <BookOpen size={18} aria-hidden />
              View learning journey
            </a>
          </div>
        </div>
      </header>

      <Overview analysis={analysis} />
      <QuestionExplorer analysis={analysis} />
      <div id="journey">
        <RevisionAndJourney analysis={analysis} isLive={isLive} />
      </div>

      <footer className="mx-auto max-w-7xl px-5 pb-10 pt-3 text-sm leading-6 text-[#666d78] sm:px-8 lg:px-12">
        <div className="flex flex-col gap-3 rounded-3xl border premium-hairline bg-white/54 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {isLive
              ? "Every conclusion shown here is tied to extracted paper evidence. Keep the original paper nearby for teacher review conversations."
              : "Every conclusion shown here is tied to seeded paper evidence. Live multimodal analysis is available from the upload flow when configured."}
          </p>
          <span className="inline-flex items-center gap-2 text-[#102a56]">
            <Sparkles size={16} aria-hidden />
            Teachers evaluate. EvalLens interprets.
          </span>
        </div>
      </footer>
    </main>
  );
}
