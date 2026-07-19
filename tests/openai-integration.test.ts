import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapOpenAIError } from "@/lib/openai/errors";
import { buildCompactAskContext } from "@/lib/openai/ask-context";
import { sampleAnalysis } from "@/lib/sample-analysis";
import type { EvalLensAnalysis } from "@/lib/openai/schemas";

const openAIMocks = vi.hoisted(() => ({
  parse: vi.fn()
}));

vi.mock("@/lib/openai/client", () => ({
  getOpenAIClient: () => ({
    responses: {
      parse: openAIMocks.parse
    }
  })
}));

function uploadFile(name: string, type: string, size = 8) {
  return new File([new Uint8Array(size)], name, { type });
}

function validFormData() {
  const formData = new FormData();
  formData.set("questionPaper", uploadFile("questions.png", "image/png"));
  formData.set("evaluatedAnswerPaper", uploadFile("answers.webp", "image/webp"));
  formData.set("subject", "Physics");
  return formData;
}

function validEvalLensAnalysis(): EvalLensAnalysis {
  return {
    analysisId: "live-test",
    documentSummary: {
      subject: "Physics",
      classLevel: "Class 12",
      examTitle: "Practice test",
      totalMarksAvailable: 10,
      teacherAwardedMarks: 6,
      overallConfidence: 0.84
    },
    overview: {
      headline: "You have a clear place to begin.",
      encouragement: "This paper shows useful next steps, not a limit on you.",
      overallSummary: "The main idea is visible, and the final checking needs practice.",
      marksYouCanStillGain: 2
    },
    questionAnalysis: [
      {
        questionId: "q1",
        questionText: "Calculate the acceleration.",
        maximumMarks: 10,
        awardedMarks: 6,
        studentAnswerSummary: "The answer uses the right formula but misses the unit check.",
        teacherFeedbackSummary: "A unit note is visible.",
        outcome: "partially_correct",
        conceptsTested: ["Kinematics"],
        whatWentWell: ["The formula choice is appropriate."],
        learningOpportunities: ["Add units and show the final check."],
        evidence: [
          {
            source: "student_answer",
            excerpt: "Formula and substitution are visible.",
            page: 1,
            confidence: 0.86
          },
          {
            source: "teacher_annotation",
            excerpt: "Teacher note points to missing units.",
            page: 1,
            confidence: 0.8
          }
        ],
        recoverableMarks: 2,
        improvedAnswer: "Use the formula, substitute values, and write the final answer with units.",
        nextStep: "Practise one unit-check question.",
        confidence: 0.82
      }
    ],
    reviewTogether: [],
    revisionPlan: {
      immediateActions: [
        {
          action: "Redo this answer with a unit check.",
          reason: "It addresses the visible gap.",
          estimatedMinutes: 15
        }
      ],
      topics: [
        {
          topic: "Kinematics",
          priority: "high",
          reason: "This topic appears in the marked answer.",
          practiceSuggestion: "Try one acceleration question and check units."
        }
      ]
    },
    learningProfile: {
      conceptualUnderstanding: 72,
      calculationAccuracy: 68,
      answerCompleteness: 64,
      useOfUnitsAndNotation: 58,
      presentationClarity: 70
    },
    generatedAt: "2026-07-19T00:00:00.000Z"
  };
}

function listFiles(entryPath: string): string[] {
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    return [entryPath];
  }

  return fs
    .readdirSync(entryPath)
    .flatMap((entry) => listFiles(path.join(entryPath, entry)));
}

describe("OpenAI upload validation", () => {
  beforeEach(() => {
    openAIMocks.parse.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("rejects a missing question paper", async () => {
    const { parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    const formData = new FormData();
    formData.set("evaluatedAnswerPaper", uploadFile("answers.png", "image/png"));

    await expect(parseAnalyzeFormData(formData, "req-missing-question")).rejects.toMatchObject({
      code: "MISSING_REQUIRED_FILE",
      status: 400
    });
  });

  it("rejects a missing evaluated answer paper", async () => {
    const { parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    const formData = new FormData();
    formData.set("questionPaper", uploadFile("questions.png", "image/png"));

    await expect(parseAnalyzeFormData(formData, "req-missing-answer")).rejects.toMatchObject({
      code: "MISSING_REQUIRED_FILE",
      status: 400
    });
  });

  it("rejects unsupported file types", async () => {
    const { parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    const formData = validFormData();
    formData.set("questionPaper", uploadFile("questions.txt", "text/plain"));

    await expect(parseAnalyzeFormData(formData, "req-unsupported")).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
      status: 400
    });
  });

  it("rejects oversized files", async () => {
    const { maxUploadFileSizeBytes } = await import("@/lib/document-processing");
    const { parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    const formData = validFormData();
    formData.set("questionPaper", uploadFile("questions.png", "image/png", maxUploadFileSizeBytes + 1));

    await expect(parseAnalyzeFormData(formData, "req-oversized")).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
      status: 400
    });
  });
});

describe("OpenAI analysis service", () => {
  beforeEach(() => {
    openAIMocks.parse.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("refuses production analysis when the API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const { analyzeUploadedPaper, parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    const input = await parseAnalyzeFormData(validFormData(), "req-no-key");

    await expect(analyzeUploadedPaper(input, "req-no-key")).rejects.toMatchObject({
      code: "OPENAI_NOT_CONFIGURED",
      status: 500
    });
  });

  it("maps OpenAI timeout and rate-limit errors", () => {
    const timeout = new Error("Request timed out") as Error & { name: string };
    timeout.name = "AbortError";

    expect(mapOpenAIError(timeout, "req-timeout")).toMatchObject({
      code: "OPENAI_TIMEOUT",
      status: 504,
      retryable: true
    });

    expect(mapOpenAIError({ status: 429 }, "req-rate")).toMatchObject({
      code: "OPENAI_RATE_LIMITED",
      status: 429,
      retryable: true
    });
  });

  it("returns a controlled error when the model output fails Zod validation twice", async () => {
    const { analyzeUploadedPaper, parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    openAIMocks.parse.mockResolvedValue({ id: "resp-invalid", output_parsed: {} });
    const input = await parseAnalyzeFormData(validFormData(), "req-invalid");

    await expect(analyzeUploadedPaper(input, "req-invalid")).rejects.toMatchObject({
      code: "MODEL_OUTPUT_INVALID",
      status: 502
    });
    expect(openAIMocks.parse).toHaveBeenCalledTimes(2);
  });

  it("uses text-only repair without resending PDF or image inputs", async () => {
    const { analyzeUploadedPaper, parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    openAIMocks.parse
      .mockResolvedValueOnce({ id: "resp-invalid", output_parsed: {}, output_text: "{\"bad\":true}" })
      .mockResolvedValueOnce({ id: "resp-repaired", output_parsed: validEvalLensAnalysis() });
    const input = await parseAnalyzeFormData(validFormData(), "req-repair");

    await analyzeUploadedPaper(input, "req-repair");

    const repairPayload = JSON.stringify(openAIMocks.parse.mock.calls[1]?.[0]);
    expect(repairPayload).not.toContain("input_image");
    expect(repairPayload).not.toContain("input_file");
    expect(repairPayload).not.toContain("data:image/");
    expect(repairPayload).not.toContain("data:application/pdf");
    expect(repairPayload).toContain("{\\\"bad\\\":true}");
  });

  it("returns a validated result for successful mocked OpenAI analysis", async () => {
    const { analyzeUploadedPaper, parseAnalyzeFormData } = await import("@/lib/openai/analyze-paper");
    openAIMocks.parse.mockResolvedValue({ id: "resp-success", output_parsed: validEvalLensAnalysis() });
    const input = await parseAnalyzeFormData(validFormData(), "req-success");

    const result = await analyzeUploadedPaper(input, "req-success");

    expect(result.responseId).toBe("resp-success");
    expect(result.analysis.analysisId).toMatch(/^live-/);
    expect(result.analysis.questions[0]?.questionText).toContain("acceleration");
  });
});

describe("Ask My Paper", () => {
  beforeEach(() => {
    openAIMocks.parse.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("grounds requests in the supplied analysis context", async () => {
    const { answerFromPaper } = await import("@/lib/openai/ask-paper");
    openAIMocks.parse.mockResolvedValue({
      id: "ask-success",
      output_parsed: {
        answer: "The paper shows the unit check is the next useful step.",
        evidence: ["Teacher note points to missing units."],
        classification: "evidence",
        nextAction: "Redo the answer with units."
      }
    });

    const response = await answerFromPaper(
      {
        analysisId: sampleAnalysis.analysisId,
        question: "Why did I lose marks?",
        questionId: sampleAnalysis.questions[0]?.id,
        analysisContext: sampleAnalysis
      },
      "req-ask"
    );

    expect(response.answer).toContain("unit");
    expect(openAIMocks.parse).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(openAIMocks.parse.mock.calls[0]?.[0])).toContain(sampleAnalysis.analysisId);
  });

  it("removes data URLs before sending Ask My Paper context to OpenAI", async () => {
    const { answerFromPaper } = await import("@/lib/openai/ask-paper");
    const unsafeAnalysis = {
      ...sampleAnalysis,
      questions: sampleAnalysis.questions.map((question, index) => ({
        ...question,
        paperPageImage: index === 0 ? "data:image/png;base64,SHOULD_NOT_LEAVE_BROWSER" : question.paperPageImage,
        previewImage: "data:image/jpeg;base64,ALSO_BLOCKED",
        imageData: "data:application/pdf;base64,PDF_BLOCKED"
      }))
    };
    openAIMocks.parse.mockResolvedValue({
      id: "ask-sanitized",
      output_parsed: {
        answer: "The paper points to the unit check.",
        evidence: ["Teacher note points to missing units."],
        classification: "evidence",
        nextAction: "Redo the answer with units."
      }
    });

    await answerFromPaper(
      {
        analysisId: unsafeAnalysis.analysisId,
        question: "Why did I lose marks in Q1?",
        questionId: unsafeAnalysis.questions[0]?.id,
        analysisContext: buildCompactAskContext(unsafeAnalysis, "Why did I lose marks in Q1?", unsafeAnalysis.questions[0]?.id)
      },
      "req-ask-sanitized"
    );

    const askPayload = JSON.stringify(openAIMocks.parse.mock.calls[0]?.[0]);
    expect(askPayload).not.toContain("paperPageImage");
    expect(askPayload).not.toContain("previewImage");
    expect(askPayload).not.toContain("imageData");
    expect(askPayload).not.toContain("data:image/");
    expect(askPayload).not.toContain("data:application/pdf");
  });
});

describe("client-side secret exposure", () => {
  it("does not define a public OpenAI API key variable", () => {
    const root = process.cwd();
    const files = ["app", "components", "lib", "types"];

    const contents = files
      .flatMap((entry) => listFiles(path.join(root, entry)))
      .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file))
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");

    expect(contents).not.toContain("NEXT_PUBLIC_OPENAI_API_KEY");
  });
});

describe("upload preview storage", () => {
  it("uses local object URLs without base64 preview storage", () => {
    const root = process.cwd();
    const uploadExperience = fs.readFileSync(
      path.join(root, "components", "upload", "upload-experience.tsx"),
      "utf8"
    );
    const uploadCard = fs.readFileSync(
      path.join(root, "components", "upload", "file-upload-card.tsx"),
      "utf8"
    );
    const liveLoader = fs.readFileSync(
      path.join(root, "components", "results", "live-results-loader.tsx"),
      "utf8"
    );

    expect(uploadExperience).toContain("URL.createObjectURL(file)");
    expect(uploadExperience).toContain("URL.revokeObjectURL");
    expect(uploadExperience).toContain('formData.set("questionPaper", uploads.questionPaper)');
    expect(uploadExperience).toContain('formData.set("evaluatedAnswerPaper", uploads.evaluatedPaper)');
    expect(uploadExperience).not.toContain("FileReader");
    expect(uploadExperience).not.toContain("readAsDataURL");
    expect(uploadExperience).not.toContain("evallens:preview");
    expect(liveLoader).not.toContain("evallens:preview");
    expect(uploadCard).not.toContain("sessionStorage");
  });
});
