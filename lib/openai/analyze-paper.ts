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
import { getOpenAIClient } from "@/lib/openai/client";
import {
  getAnalysisMaxOutputTokens,
  getOpenAIModel,
  getOpenAIRequestTimeoutMs,
  getRepairMaxOutputTokens,
  isOpenAIConfigured
} from "@/lib/openai/config";
import { EvalLensApiError, createRequestId, mapOpenAIError } from "@/lib/openai/errors";
import { analyzePaperPrompt } from "@/lib/openai/prompts";
import { evalLensAnalysisSchema, modelEvalLensAnalysisSchema, type EvalLensAnalysis } from "@/lib/openai/schemas";
import { mapEvalLensAnalysisToResult } from "@/lib/openai/transform";
import type { AnalysisResult } from "@/types/analysis";

type UploadSlot = "questionPaper" | "evaluatedAnswerPaper" | "answerKey" | "markingScheme";

type PreparedUploadFile = {
  slot: UploadSlot;
  originalFilename: string;
  safeFilename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  pageCount: number | null;
};

export type AnalyzePaperInput = {
  questionPaper: PreparedUploadFile;
  evaluatedAnswerPaper: PreparedUploadFile;
  answerKey?: PreparedUploadFile;
  markingScheme?: PreparedUploadFile;
  subject?: string;
  classLevel?: string;
  examTitle?: string;
  targetScore?: number;
  examDate?: string;
};

export type AnalyzePaperResult = {
  requestId: string;
  model: string;
  durationMs: number;
  responseId: string | null;
  evalLensAnalysis: EvalLensAnalysis;
  analysis: AnalysisResult;
};

const slotLabels: Record<UploadSlot, string> = {
  questionPaper: "question paper",
  evaluatedAnswerPaper: "evaluated answer paper",
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
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  return "";
}

function neutralFilename(file: File, slot: UploadSlot) {
  const extension = extensionForFile(file) || "upload";
  const isPdf = extension === "pdf";

  if (slot === "questionPaper") {
    return isPdf ? "question-paper.pdf" : `question-paper-image.${extension}`;
  }

  if (slot === "evaluatedAnswerPaper") {
    return isPdf ? "evaluated-answer-paper.pdf" : `evaluated-answer-image.${extension}`;
  }

  if (slot === "answerKey") {
    return isPdf ? "answer-key.pdf" : `answer-key-image.${extension}`;
  }

  return isPdf ? "marking-scheme.pdf" : `marking-scheme-image.${extension}`;
}

function getFormFile(formData: FormData, slot: UploadSlot) {
  const value = formData.get(slot);
  return value instanceof File ? value : null;
}

function getEvaluatedPaperFile(formData: FormData) {
  return getFormFile(formData, "evaluatedAnswerPaper") ?? getFormFile(formData, "evaluatedPaper" as UploadSlot);
}

function parseOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseTargetScore(value: FormDataEntryValue | null, requestId: string) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new EvalLensApiError(
      "INVALID_REQUEST",
      "Add a target score that feels realistic for your next attempt.",
      400,
      false,
      requestId
    );
  }

  return parsed;
}

export async function prepareUploadFile(file: File | null, slot: UploadSlot, required: boolean, requestId: string) {
  if (!file) {
    if (required) {
      throw new EvalLensApiError(
        "MISSING_REQUIRED_FILE",
        "Add the question paper and the evaluated answer paper, then we can begin.",
        400,
        false,
        requestId
      );
    }

    return undefined;
  }

  const mimeType = mimeForFile(file);
  if (!isSupportedUploadType(mimeType) || !isSupportedFileName(file.name)) {
    throw new EvalLensApiError(
      "UNSUPPORTED_FILE_TYPE",
      `This ${slotLabels[slot]} is hard for EvalLens to read right now. Please use a PDF, PNG, JPG, JPEG or WEBP file.`,
      400,
      false,
      requestId
    );
  }

  if (file.size <= 0) {
    throw new EvalLensApiError(
      "EMPTY_FILE",
      `This ${slotLabels[slot]} looks empty. Please choose the file again.`,
      400,
      false,
      requestId
    );
  }

  if (file.size > maxUploadFileSizeBytes) {
    throw new EvalLensApiError(
      "FILE_TOO_LARGE",
      `The ${slotLabels[slot]} is ${bytesToMegabytes(file.size)} MB. Please choose a file under ${bytesToMegabytes(
        maxUploadFileSizeBytes
      )} MB so we can read it smoothly.`,
      400,
      false,
      requestId
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    throw new EvalLensApiError(
      "INVALID_UPLOAD",
      "We could not read one of the uploaded documents. Try a clearer PDF or image.",
      400,
      true,
      requestId
    );
  }

  const pageCount = mimeType === "application/pdf" ? estimatePdfPageCount(buffer) : 1;
  if (pageCount && pageCount > maxUploadPageCount) {
    throw new EvalLensApiError(
      "TOO_MANY_PAGES",
      `That ${slotLabels[slot]} appears to have more than ${maxUploadPageCount} pages. Please use a shorter paper for now.`,
      400,
      false,
      requestId
    );
  }

  return {
    slot,
    originalFilename: file.name,
    safeFilename: neutralFilename(file, slot),
    mimeType,
    size: file.size,
    buffer,
    pageCount
  } satisfies PreparedUploadFile;
}

export async function parseAnalyzeFormData(formData: FormData, requestId = createRequestId()): Promise<AnalyzePaperInput> {
  const questionPaper = await prepareUploadFile(getFormFile(formData, "questionPaper"), "questionPaper", true, requestId);
  const evaluatedAnswerPaper = await prepareUploadFile(
    getEvaluatedPaperFile(formData),
    "evaluatedAnswerPaper",
    true,
    requestId
  );
  const answerKey = await prepareUploadFile(getFormFile(formData, "answerKey"), "answerKey", false, requestId);
  const markingScheme = await prepareUploadFile(getFormFile(formData, "markingScheme"), "markingScheme", false, requestId);

  if (!questionPaper || !evaluatedAnswerPaper) {
    throw new EvalLensApiError(
      "MISSING_REQUIRED_FILE",
      "Add the question paper and the evaluated answer paper, then we can begin.",
      400,
      false,
      requestId
    );
  }

  return {
    questionPaper,
    evaluatedAnswerPaper,
    answerKey,
    markingScheme,
    subject: parseOptionalText(formData.get("subject")),
    classLevel: parseOptionalText(formData.get("classLevel")),
    examTitle: parseOptionalText(formData.get("examTitle")),
    targetScore: parseTargetScore(formData.get("targetScore"), requestId),
    examDate: parseOptionalText(formData.get("examDate"))
  };
}

function toOpenAIContent(file: PreparedUploadFile, label: string): ResponseInputContent {
  const dataUrl = `data:${file.mimeType};base64,${file.buffer.toString("base64")}`;

  if (file.mimeType.startsWith("image/")) {
    return {
      type: "input_image",
      detail: "high",
      image_url: dataUrl
    } as ResponseInputContent;
  }

  return {
    type: "input_file",
    filename: `${label}-${file.safeFilename}`,
    file_data: dataUrl
  } as ResponseInputContent;
}

function buildAnalysisContent(input: AnalyzePaperInput): ResponseInputContent[] {
  const context = [
    "Analyze these uploaded documents together.",
    "Document 1: question paper.",
    "Document 2: teacher-evaluated student answer paper.",
    input.subject ? `User-provided subject: ${input.subject}` : "",
    input.classLevel ? `User-provided class level: ${input.classLevel}` : "",
    input.examTitle ? `User-provided exam title: ${input.examTitle}` : "",
    input.examDate ? `Exam date: ${input.examDate}` : "",
    input.targetScore !== undefined ? `Student goal for next time: ${input.targetScore}` : "",
    "Return the validated EvalLens analysis structure. Do not include raw OCR dumps."
  ]
    .filter(Boolean)
    .join("\n");

  const content: ResponseInputContent[] = [
    { type: "input_text", text: context } as ResponseInputContent,
    toOpenAIContent(input.questionPaper, "question-paper"),
    toOpenAIContent(input.evaluatedAnswerPaper, "evaluated-answer-paper")
  ];

  if (input.answerKey) {
    content.push({ type: "input_text", text: "Optional answer key follows." } as ResponseInputContent);
    content.push(toOpenAIContent(input.answerKey, "answer-key"));
  }

  if (input.markingScheme) {
    content.push({
      type: "input_text",
      text: "Optional marking scheme follows."
    } as ResponseInputContent);
    content.push(toOpenAIContent(input.markingScheme, "marking-scheme"));
  }

  return content;
}

function responseText(response: unknown) {
  const candidate = response as { output_text?: string; output?: unknown; output_parsed?: unknown };
  if (candidate.output_text?.trim()) {
    return candidate.output_text;
  }

  if (candidate.output_parsed) {
    return JSON.stringify(candidate.output_parsed);
  }

  return JSON.stringify(candidate.output ?? {});
}

async function runAnalysisRequest(input: AnalyzePaperInput) {
  const client = getOpenAIClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAIRequestTimeoutMs());

  try {
    return await client.responses.parse(
      {
        model: getOpenAIModel(),
        instructions: analyzePaperPrompt,
        input: [{ role: "user", content: buildAnalysisContent(input) }],
        text: { format: zodTextFormat(modelEvalLensAnalysisSchema, "evallens_analysis") },
        max_output_tokens: getAnalysisMaxOutputTokens(),
        store: false
      },
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function runRepairRequest(malformedOutput: string) {
  const client = getOpenAIClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAIRequestTimeoutMs());

  try {
    return await client.responses.parse(
      {
        model: getOpenAIModel(),
        instructions:
          "Repair the supplied malformed EvalLens structured output so it validates. Do not add new facts. Do not ask for or infer from source documents. Return structured data only.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: malformedOutput.slice(0, 24_000)
              }
            ]
          }
        ],
        text: { format: zodTextFormat(modelEvalLensAnalysisSchema, "evallens_analysis_repair") },
        max_output_tokens: getRepairMaxOutputTokens(),
        store: false
      },
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeUploadedPaper(
  input: AnalyzePaperInput,
  requestId = createRequestId()
): Promise<AnalyzePaperResult> {
  if (!isOpenAIConfigured()) {
    throw new EvalLensApiError(
      "OPENAI_NOT_CONFIGURED",
      "AI analysis is not configured on this deployment.",
      500,
      false,
      requestId
    );
  }

  const startedAt = Date.now();
  const model = getOpenAIModel();
  let responseId: string | null = null;

  try {
    let response = await runAnalysisRequest(input);
    responseId = response.id ?? null;
    let parsed = modelEvalLensAnalysisSchema.safeParse(response.output_parsed);

    if (!parsed.success) {
      response = await runRepairRequest(responseText(response));
      responseId = response.id ?? responseId;
      parsed = modelEvalLensAnalysisSchema.safeParse(response.output_parsed);
    }

    if (!parsed.success) {
      throw new EvalLensApiError(
        "MODEL_OUTPUT_INVALID",
        "We could not turn the AI response into a reliable paper analysis yet.",
        502,
        true,
        requestId
      );
    }

    const evalLensAnalysis = {
      ...parsed.data,
      analysisId: `live-${randomUUID()}`,
      generatedAt: new Date().toISOString()
    };
    const validatedEvalLensAnalysis = evalLensAnalysisSchema.parse(evalLensAnalysis);
    const analysis = mapEvalLensAnalysisToResult(validatedEvalLensAnalysis);
    const durationMs = Date.now() - startedAt;

    console.info("EvalLens OpenAI analysis completed", {
      requestId,
      model,
      durationMs,
      responseId,
      success: true
    });

    return {
      requestId,
      model,
      durationMs,
      responseId,
      evalLensAnalysis: validatedEvalLensAnalysis,
      analysis
    };
  } catch (error) {
    if (error instanceof EvalLensApiError) {
      console.error("EvalLens OpenAI analysis failed", {
        requestId,
        model,
        durationMs: Date.now() - startedAt,
        responseId,
        code: error.code
      });
      throw error;
    }

    const mapped = mapOpenAIError(error, requestId);
    console.error("EvalLens OpenAI analysis failed", {
      requestId,
      model,
      durationMs: Date.now() - startedAt,
      responseId,
      code: mapped.code
    });
    throw mapped;
  }
}
