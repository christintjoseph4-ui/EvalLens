import { randomUUID } from "crypto";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import {
  bytesToMegabytes,
  estimatePdfPageCount,
  isSupportedFileName,
  isSupportedUploadType,
  maxUploadFileSizeBytes,
  maxUploadPageCount
} from "@/lib/document-processing";
import {
  evaluatedPaperExtractionSchema,
  modelAnalysisResultSchema,
  questionPaperExtractionSchema,
  type EvaluatedPaperExtraction,
  type QuestionPaperExtraction
} from "@/lib/ai-schemas";
import { evaluatedPaperExtractionPrompt } from "@/lib/prompts/evaluated-answer-paper";
import { learningDiagnosisPrompt } from "@/lib/prompts/learning-diagnosis";
import { questionPaperExtractionPrompt } from "@/lib/prompts/question-paper";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { validateAnalysisResult } from "@/lib/validation";
import type { AnalysisResult } from "@/types/analysis";

export type AnalysisFailureCode =
  | "MISSING_REQUIRED_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "INVALID_TARGET_SCORE"
  | "OPENAI_NOT_CONFIGURED"
  | "MODEL_ANALYSIS_FAILED"
  | "MODEL_OUTPUT_INVALID";

export class CalmAnalysisError extends Error {
  constructor(
    public readonly code: AnalysisFailureCode,
    message: string
  ) {
    super(message);
    this.name = "CalmAnalysisError";
  }
}

type UploadSlot = "questionPaper" | "evaluatedPaper" | "answerKey" | "markingScheme";

export type PreparedUploadFile = {
  slot: UploadSlot;
  safeFilename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  pageCount: number | null;
};

export type AnalyseFormInput = {
  questionPaper: PreparedUploadFile;
  evaluatedPaper: PreparedUploadFile;
  answerKey?: PreparedUploadFile;
  markingScheme?: PreparedUploadFile;
  targetScore?: number;
  examDate?: string;
  subject?: string;
};

const slotLabels: Record<UploadSlot, string> = {
  questionPaper: "question paper",
  evaluatedPaper: "evaluated answer paper",
  answerKey: "answer key",
  markingScheme: "marking scheme"
};

function extensionForFile(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function mimeForFile(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = extensionForFile(file);
  if (extension === "pdf") {
    return "application/pdf";
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  return "";
}

async function prepareFile(file: File | null, slot: UploadSlot, required: boolean) {
  if (!file) {
    if (required) {
      throw new CalmAnalysisError(
        "MISSING_REQUIRED_FILE",
        "Please add both the question paper and evaluated answer paper to continue."
      );
    }
    return undefined;
  }

  const mimeType = mimeForFile(file);
  if (!isSupportedUploadType(mimeType) || !isSupportedFileName(file.name)) {
    throw new CalmAnalysisError(
      "UNSUPPORTED_FILE_TYPE",
      `The ${slotLabels[slot]} must be a PDF, PNG, JPG or JPEG file.`
    );
  }

  if (file.size <= 0) {
    throw new CalmAnalysisError("EMPTY_FILE", `The ${slotLabels[slot]} appears to be empty.`);
  }

  if (file.size > maxUploadFileSizeBytes) {
    throw new CalmAnalysisError(
      "FILE_TOO_LARGE",
      `The ${slotLabels[slot]} is ${bytesToMegabytes(file.size)} MB. Please upload a file under ${bytesToMegabytes(
        maxUploadFileSizeBytes
      )} MB.`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pageCount = mimeType === "application/pdf" ? estimatePdfPageCount(buffer) : 1;
  if (pageCount && pageCount > maxUploadPageCount) {
    throw new CalmAnalysisError(
      "TOO_MANY_PAGES",
      `That ${slotLabels[slot]} appears to have more than ${maxUploadPageCount} pages. Please use a shorter paper for this session.`
    );
  }

  const extension = extensionForFile(file);
  return {
    slot,
    safeFilename: `${slot}.${extension}`,
    mimeType,
    size: file.size,
    buffer,
    pageCount
  } satisfies PreparedUploadFile;
}

function parseTargetScore(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const score = Number(value);
  if (!Number.isFinite(score) || score < 0) {
    throw new CalmAnalysisError("INVALID_TARGET_SCORE", "Please enter a valid target score.");
  }

  return score;
}

function parseOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getFormFile(formData: FormData, slot: UploadSlot) {
  const value = formData.get(slot);
  return value instanceof File ? value : null;
}

export async function parseAnalyseFormData(formData: FormData): Promise<AnalyseFormInput> {
  const questionPaper = await prepareFile(getFormFile(formData, "questionPaper"), "questionPaper", true);
  const evaluatedPaper = await prepareFile(getFormFile(formData, "evaluatedPaper"), "evaluatedPaper", true);
  const answerKey = await prepareFile(getFormFile(formData, "answerKey"), "answerKey", false);
  const markingScheme = await prepareFile(getFormFile(formData, "markingScheme"), "markingScheme", false);

  if (!questionPaper || !evaluatedPaper) {
    throw new CalmAnalysisError(
      "MISSING_REQUIRED_FILE",
      "Please add both the question paper and evaluated answer paper to continue."
    );
  }

  return {
    questionPaper,
    evaluatedPaper,
    answerKey,
    markingScheme,
    targetScore: parseTargetScore(formData.get("targetScore")),
    examDate: parseOptionalText(formData.get("examDate")),
    subject: parseOptionalText(formData.get("subject"))
  };
}

function toInputContent(file: PreparedUploadFile, label: string): ResponseInputContent {
  const base64 = file.buffer.toString("base64");
  if (file.mimeType.startsWith("image/")) {
    return {
      type: "input_image",
      detail: "high",
      image_url: `data:${file.mimeType};base64,${base64}`
    };
  }

  return {
    type: "input_file",
    detail: "high",
    filename: `${label}-${file.safeFilename}`,
    file_data: base64
  };
}

function extractParsed<T>(value: T | null, code: AnalysisFailureCode): T {
  if (!value) {
    throw new CalmAnalysisError(
      code,
      "We could not complete this upload reliably. Explore the prepared sample to experience the complete EvalLens workflow."
    );
  }

  return value;
}

async function extractQuestionPaper(input: AnalyseFormInput): Promise<QuestionPaperExtraction> {
  const client = getOpenAIClient();
  const content: ResponseInputContent[] = [
    {
      type: "input_text",
      text: [
        "Extract the question paper.",
        input.subject ? `User-provided subject: ${input.subject}` : "",
        input.examDate ? `Exam date: ${input.examDate}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    },
    toInputContent(input.questionPaper, "question-paper")
  ];

  if (input.answerKey) {
    content.push({ type: "input_text", text: "Optional answer key follows." });
    content.push(toInputContent(input.answerKey, "answer-key"));
  }

  if (input.markingScheme) {
    content.push({ type: "input_text", text: "Optional marking scheme follows." });
    content.push(toInputContent(input.markingScheme, "marking-scheme"));
  }

  const response = await client.responses.parse({
    model: getOpenAIModel(),
    instructions: questionPaperExtractionPrompt,
    input: [{ role: "user", content }],
    text: { format: zodTextFormat(questionPaperExtractionSchema, "question_paper_extraction") },
    store: false
  });

  return extractParsed(response.output_parsed, "MODEL_ANALYSIS_FAILED");
}

async function extractEvaluatedPaper(input: AnalyseFormInput): Promise<EvaluatedPaperExtraction> {
  const client = getOpenAIClient();
  const response = await client.responses.parse({
    model: getOpenAIModel(),
    instructions: evaluatedPaperExtractionPrompt,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Extract the evaluated answer paper." },
          toInputContent(input.evaluatedPaper, "evaluated-paper")
        ]
      }
    ],
    text: { format: zodTextFormat(evaluatedPaperExtractionSchema, "evaluated_paper_extraction") },
    store: false
  });

  return extractParsed(response.output_parsed, "MODEL_ANALYSIS_FAILED");
}

function compactQuestionExtraction(extraction: QuestionPaperExtraction) {
  return JSON.stringify(extraction);
}

function compactAnswerExtraction(extraction: EvaluatedPaperExtraction) {
  return JSON.stringify(extraction);
}

function repairAnalysisResult(input: unknown): unknown {
  const parsed = modelAnalysisResultSchema.safeParse(input);
  if (!parsed.success) {
    return input;
  }

  const analysis = parsed.data;
  const maximumMarks = analysis.exam.maximumMarks;
  analysis.analysisId = analysis.analysisId || `live-${randomUUID()}`;
  analysis.studentGoal.currentScore = Math.min(analysis.studentGoal.currentScore, maximumMarks);
  analysis.studentGoal.potentialScore = Math.min(analysis.studentGoal.potentialScore, maximumMarks);
  analysis.studentGoal.recoverableMarks = Math.min(
    analysis.studentGoal.recoverableMarks,
    Math.max(maximumMarks - analysis.studentGoal.currentScore, 0)
  );

  analysis.questions = analysis.questions.map((question) => {
    const maximum = question.maximumMarks;
    const awarded = Math.min(question.awardedMarks, maximum);
    return {
      ...question,
      awardedMarks: awarded,
      recoverableMarks: Math.min(question.recoverableMarks, Math.max(maximum - awarded, 0)),
      paperPageImage: question.paperPageImage || "live-upload-preview",
      answerRegion: question.answerRegion ?? { x: 0.08, y: 0.12, width: 0.84, height: 0.18 }
    };
  });

  return analysis;
}

async function buildFinalAnalysis(
  input: AnalyseFormInput,
  questionExtraction: QuestionPaperExtraction,
  answerExtraction: EvaluatedPaperExtraction
): Promise<AnalysisResult> {
  const client = getOpenAIClient();
  const response = await client.responses.parse({
    model: getOpenAIModel(),
    instructions: learningDiagnosisPrompt,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Create the final EvalLens analysis. Use analysisId live-${randomUUID()}.`,
              input.targetScore !== undefined ? `Target score: ${input.targetScore}` : "No target score provided.",
              input.subject ? `User-provided subject: ${input.subject}` : "",
              "Question paper extraction:",
              compactQuestionExtraction(questionExtraction),
              "Evaluated answer paper extraction:",
              compactAnswerExtraction(answerExtraction)
            ]
              .filter(Boolean)
              .join("\n")
          }
        ]
      }
    ],
    text: { format: zodTextFormat(modelAnalysisResultSchema, "evallens_analysis_result") },
    store: false
  });

  const modelOutput = extractParsed(response.output_parsed, "MODEL_OUTPUT_INVALID");
  const firstPass = modelAnalysisResultSchema.safeParse(modelOutput);
  const candidate = firstPass.success ? firstPass.data : modelOutput;
  const finalResult = validateAnalysisResult(candidate);
  return finalResult;
}

export async function analyseUploadedPaper(input: AnalyseFormInput): Promise<AnalysisResult> {
  try {
    const [questionExtraction, answerExtraction] = await Promise.all([
      extractQuestionPaper(input),
      extractEvaluatedPaper(input)
    ]);

    try {
      return await buildFinalAnalysis(input, questionExtraction, answerExtraction);
    } catch (error) {
      if (error instanceof CalmAnalysisError) {
        throw error;
      }

      const client = getOpenAIClient();
      const repairResponse = await client.responses.parse({
        model: getOpenAIModel(),
        instructions: `${learningDiagnosisPrompt}\nRepair the prior structured result so it validates. Do not add unsupported paper facts.`,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Create a valid EvalLens analysis from these extractions.",
                  input.targetScore !== undefined ? `Target score: ${input.targetScore}` : "No target score provided.",
                  compactQuestionExtraction(questionExtraction),
                  compactAnswerExtraction(answerExtraction)
                ].join("\n")
              }
            ]
          }
        ],
        text: { format: zodTextFormat(modelAnalysisResultSchema, "evallens_analysis_repair") },
        store: false
      });

      const repaired = repairAnalysisResult(extractParsed(repairResponse.output_parsed, "MODEL_OUTPUT_INVALID"));
      return validateAnalysisResult(repaired);
    }
  } catch (error) {
    if (error instanceof CalmAnalysisError) {
      throw error;
    }

    throw new CalmAnalysisError(
      "MODEL_ANALYSIS_FAILED",
      "We could not complete this upload reliably. Explore the prepared sample to experience the complete EvalLens workflow."
    );
  }
}
