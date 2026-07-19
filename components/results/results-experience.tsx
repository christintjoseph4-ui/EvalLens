"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    label: "This looks clear",
    description: "The marks match what is visible on the paper. We can use this answer to plan the next step.",
    tone: "bg-[#edf8f3] text-[#102a56] border-[#d9efe5]"
  },
  objective_review_opportunity: {
    label: "Worth reviewing together",
    description: "This answer may benefit from another review. EvalLens has not changed marks.",
    tone: "bg-[#f4ecd9] text-[#755a2d] border-[#dfcda8]"
  },
  teacher_discretion: {
    label: "Best discussed with your teacher",
    description:
      "This depends on the evaluator's judgement. We will use it only to guide what to practise next.",
    tone: "bg-[#f0f3ff] text-[#4248a0] border-[#dce0ff]"
  }
};

const promptGroups = [
  {
    label: "Understand",
    prompts: [
      "What was missing here?",
      "Can you explain this simply?",
      "What does the teacher's note mean?"
    ]
  },
  {
    label: "Improve",
    prompts: ["Show me a stronger answer.", "Teach me this concept."]
  },
  {
    label: "Practice",
    prompts: ["Give me two similar questions.", "Is this worth reviewing together?"]
  }
];

const defaultPrompt = promptGroups[0]?.prompts[0] ?? "";

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

function responseSourceLabel(classification: AskResponse["classification"]) {
  if (classification === "teacher_discretion") {
    return "Best discussed with your teacher";
  }

  if (classification === "inference") {
    return "A careful reading of the evidence";
  }

  return "Directly from the paper";
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
        <p className="text-sm font-medium text-[#6d73d9]">What we could read</p>
        <h3 className="mt-2 text-2xl font-semibold">The answer text is ready.</h3>
        <p className="mt-3 leading-7 text-[#5f6671]">
          We could read the answer and notes for this question. The paper image preview is not
          available in this session.
        </p>
        <div className="mt-5 rounded-2xl border premium-hairline bg-[#f8f9fc] p-4">
          <p className="text-sm font-semibold">What you wrote</p>
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
          loading="lazy"
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
    <article className="rounded-[26px] border premium-hairline bg-white/72 p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/88">
      <p className="text-sm font-medium text-[#666d78]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#102a56]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f6671]">{helper}</p>
    </article>
  );
}

function Overview({ analysis }: { analysis: AnalysisResult }) {
  const metrics = [
    {
      label: "Where you are now",
      value: `${analysis.studentGoal.currentScore}/${analysis.exam.maximumMarks}`,
      helper: "The score on this paper"
    },
    {
      label: "Where you want to go",
      value: `${analysis.studentGoal.targetScore ?? analysis.exam.maximumMarks}`,
      helper: "Your goal for the next attempt"
    },
    {
      label: "Marks you can still gain",
      value: `${analysis.studentGoal.recoverableMarks}`,
      helper: "Places where practice can help"
    },
    {
      label: "A realistic next score",
      value: `${analysis.studentGoal.potentialScore}/${analysis.exam.maximumMarks}`,
      helper: "Grounded in what this paper shows"
    }
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="glass rounded-[28px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">Where you&apos;ll improve fastest</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">{analysis.summary.headline}</h2>
          <p className="mt-4 leading-7 text-[#5f6671]">{analysis.summary.supportingMessage}</p>
        </article>
        <article className="glass rounded-[28px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">You&apos;re already doing well at</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">
            Understanding the main ideas.
          </h2>
          <p className="mt-4 leading-7 text-[#5f6671]">
            Your paper shows that the foundation is there. A few cleaner final steps can make
            the answer feel much stronger.
          </p>
        </article>
        <article className="glass rounded-[28px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">One small step for today</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">
            {analysis.summary.nextBestAction}
          </h2>
          <a
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-[#102a56] px-5 py-3 font-medium text-white"
            href="#paper"
          >
            Let&apos;s look together
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
          <p className="text-sm font-medium text-[#6d73d9]">Look at one answer at a time</p>
          <h2 className="mt-2 text-balance text-5xl font-semibold leading-tight">
            Let&apos;s see what this answer is showing us.
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
              <p className="text-sm text-[#666d78]">Your marked paper</p>
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
          <div className="max-h-[760px] overflow-auto rounded-[24px] bg-[#eef1f6] p-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedQuestion.id}
                initial={{ opacity: 0, scale: 0.992, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.992, y: -6 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                  <EvidenceOverlay question={selectedQuestion} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-full border premium-hairline bg-white/68 px-4 py-2 text-sm disabled:opacity-40"
              type="button"
              disabled={selectedIndex === 0}
              onClick={() => go(-1)}
            >
              <ChevronLeft size={16} aria-hidden />
              Previous answer
            </button>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-full border premium-hairline bg-white/68 px-4 py-2 text-sm disabled:opacity-40"
              type="button"
              disabled={selectedIndex === analysis.questions.length - 1}
              onClick={() => go(1)}
            >
              Next answer
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>

        <aside className="glass rounded-[30px] p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedQuestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-[#666d78]">Question {selectedQuestion.number}</p>
              <h3 className="mt-2 text-2xl font-semibold leading-snug">
                {selectedQuestion.questionText}
              </h3>
            </div>
            <div className="rounded-2xl border premium-hairline bg-white/70 px-4 py-3 text-center">
              <p className="text-sm text-[#666d78]">Given marks</p>
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
                What you did well
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
                Something worth practising
              </h4>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f6671]">
                {selectedQuestion.improvementOpportunities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white/76 p-4">
            <h4 className="font-semibold">What the paper shows</h4>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f6671]">
              {selectedQuestion.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <p className="rounded-2xl bg-[#f8f9fc] p-4 text-sm leading-6">
              <span className="block font-semibold text-[#1f2423]">This belongs to</span>
              {selectedQuestion.topic}
            </p>
            <p className="rounded-2xl bg-[#f8f9fc] p-4 text-sm leading-6">
              <span className="block font-semibold text-[#1f2423]">Try this next</span>
              {selectedQuestion.nextAction}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["deduction", "What affected this answer?"],
              ["full-mark", "Show a stronger answer"],
              ["teach", "Teach me this concept"],
              ["practice", "Give me a similar question"],
              ["review", "Is this worth reviewing together?"]
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
                ? "What to notice"
                : mode === "full-mark"
                  ? "A stronger answer could look like"
                  : mode === "teach"
                    ? "A simple way to understand it"
                    : mode === "practice"
                      ? "Try a nearby question"
                      : "How to talk about it"}
            </p>
            <p className="mt-2 leading-7 text-[#2b3340]">{getModeSummary(selectedQuestion, mode)}</p>
          </div>

          <AskMyPaper key={selectedQuestion.id} question={selectedQuestion} />
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>
    </section>
  );
}

function AskMyPaper({ question }: { question: AnalysisQuestion }) {
  const [prompt, setPrompt] = useState(defaultPrompt);
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
      setError("I couldn't answer that clearly from this question yet.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-[28px] border premium-hairline bg-white/78 p-4">
      <h4 className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle size={19} className="text-[#102a56]" aria-hidden />
        Ask your paper
      </h4>
      <div className="mt-5 grid gap-4">
        {promptGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[#7b8391]">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.prompts.map((item) => (
                <button
                  className="focus-ring rounded-full border premium-hairline bg-white px-3 py-2 text-xs font-medium text-[#102a56] transition hover:-translate-y-0.5 hover:bg-[#f8f9fc]"
                  type="button"
                  key={item}
                  onClick={() => void askPaper(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="paper-question">
          Ask a question about this paper
        </label>
        <input
          id="paper-question"
          className="focus-ring min-w-0 flex-1 rounded-full border premium-hairline bg-white px-4 py-3 text-sm"
          placeholder="Ask anything about this answer..."
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
      {isLoading ? <p className="mt-4 text-sm text-[#666d78]">Reading this answer carefully...</p> : null}
      {error ? (
        <p className="mt-4 text-sm text-[#7a4e43]">
          I couldn&apos;t answer that clearly from this question yet. Try one of the prompts above.
        </p>
      ) : null}
      {response ? (
        <motion.div
          className="mt-5 space-y-4 rounded-[24px] border premium-hairline bg-[#fbfaf7] p-4 text-sm leading-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <div>
            <p className="font-semibold">What I can point to</p>
            <ul className="mt-1 space-y-1 text-[#5f6671]">
              {response.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p>
            <span className="font-semibold">Here&apos;s the answer: </span>
            <span className="text-[#5f6671]">{response.answer}</span>
          </p>
          <p>
            <span className="font-semibold">How confident this is: </span>
            <span className="text-[#5f6671]">{responseSourceLabel(response.classification)}</span>
          </p>
          <p>
            <span className="font-semibold">Next small step: </span>
            <span className="text-[#5f6671]">{response.nextAction}</span>
          </p>
        </motion.div>
      ) : null}
    </section>
  );
}

function CircularMetric({ label, value, helper }: { label: string; value: number; helper: string }) {
  const background = `conic-gradient(#6d73d9 ${Math.round(value) * 3.6}deg, #edf0f6 0deg)`;

  return (
    <article className="rounded-[30px] border premium-hairline bg-white/70 p-5 text-center transition duration-300 hover:-translate-y-0.5 hover:bg-white/88">
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
      <p className="mt-2 text-sm leading-6 text-[#666d78]">{helper}</p>
    </article>
  );
}

function RevisionAndJourney({ analysis, isLive }: { analysis: AnalysisResult; isLive: boolean }) {
  const reviewCount = analysis.reviewOpportunities.length;
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-[34px] p-6">
          <p className="text-sm font-medium text-[#6d73d9]">Your next practice steps</p>
          <h2 className="mt-2 text-4xl font-semibold">Start small. Keep going.</h2>
          <div className="mt-6 space-y-3">
            {analysis.revisionPlan.map((item, index) => (
              <article className="rounded-[28px] border premium-hairline bg-white/70 p-5" key={item.priority}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {index === 0 ? "Start here" : index === 1 ? "Next" : "Keep going"} - {item.topic}
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
              <p className="text-sm font-medium text-[#6d73d9]">Your progress</p>
              <h2 className="mt-2 text-4xl font-semibold">
                {isLive ? "The path is starting to appear" : "Small improvements add up."}
              </h2>
            </div>
            <span className="rounded-full border premium-hairline bg-white/70 px-3 py-1 text-sm text-[#666d78]">
              {isLive ? "Starting point" : "Prepared path"}
            </span>
          </div>
          <p className="mt-4 leading-7 text-[#5f6671]">
            This view is not here to judge the score. It is here to show where the next bit
            of progress can happen.
          </p>
          <div className="mt-7 space-y-3">
            {analysis.historicalPreview.map((point, index) => (
              <article
                className="rounded-[26px] border premium-hairline bg-white/70 p-5"
                key={point.testName}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf8f3] text-sm font-semibold text-[#102a56]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#6d73d9]">
                        {index === 0 ? "Started here" : index === 1 ? "Built on it" : "Now"}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">{point.testName}</h3>
                    </div>
                  </div>
                  <p className="rounded-full bg-[#102a56] px-4 py-2 text-sm font-semibold text-white">
                    {point.score}/40
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#5f6671]">
                  <span className="rounded-full bg-[#f8f9fc] px-3 py-1">
                    Ideas {percent(point.conceptMastery)}
                  </span>
                  <span className="rounded-full bg-[#f8f9fc] px-3 py-1">
                    Calculations {percent(point.numericalAccuracy)}
                  </span>
                  <span className="rounded-full bg-[#f8f9fc] px-3 py-1">
                    Completeness {percent(point.answerCompleteness)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-5">
          <p className="text-sm font-medium text-[#6d73d9]">What this paper helps us understand</p>
          <h2 className="mt-2 text-4xl font-semibold">You are more than the score.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CircularMetric
            label="You understand concepts well."
            value={analysis.learningTwin.conceptMastery}
            helper="This is something to build on."
          />
          <CircularMetric
            label="Calculations are getting steadier."
            value={analysis.learningTwin.numericalAccuracy}
            helper="A few careful checks can help here."
          />
          <CircularMetric
            label="Your explanations are becoming clearer."
            value={analysis.learningTwin.presentation}
            helper="Keep making the steps easy to follow."
          />
          <CircularMetric
            label="Complete answers are within reach."
            value={analysis.learningTwin.answerCompleteness}
            helper="Small additions can change the whole answer."
          />
        </div>
      </section>

      <section className="mt-5">
        <article className="glass rounded-[34px] p-6 sm:p-8">
          <ClipboardCheck className="text-[#102a56]" size={24} aria-hidden />
          <p className="mt-5 text-sm font-medium text-[#6d73d9]">Worth reviewing together</p>
          <h2 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight">
            {reviewCount > 0
              ? `${reviewCount} ${reviewCount === 1 ? "answer" : "answers"} may be worth discussing.`
              : "Nothing here needs a review conversation."}
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-[#5f6671]">
            Review suggestions appear only when the paper gives clear evidence. The teacher&apos;s
            judgement still matters, and the goal is a calm conversation.
          </p>
        </article>
      </section>
    </div>
  );
}

export function ResultsExperience({
  analysis,
  modeLabel = "Prepared paper",
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
            Good news. Your paper tells us more than your score does.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5f6671]">
            Let&apos;s look at the places where a little improvement could make a big difference.
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
              View my progress
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
            Every evaluation is another opportunity to grow. We&apos;ll be ready whenever you bring
            your next paper.
          </p>
          <span className="inline-flex items-center gap-2 text-[#102a56]">
            <Sparkles size={16} aria-hidden />
            Learning is not finished yet.
          </span>
        </div>
      </footer>
    </main>
  );
}
