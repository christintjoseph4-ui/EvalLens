import { analysisResultSchema, evaluationClassificationSchema, regionSchema } from "@/lib/analysis-schema";
import { askPaperLiveResponseSchema, modelAnalysisResultSchema } from "@/lib/ai-schemas";
import { sampleAnalysis } from "@/lib/sample-analysis";

export type QualityCheck = {
  name: string;
  passed: boolean;
};

function check(name: string, passed: boolean): QualityCheck {
  return { name, passed };
}

export function runSchemaQualityChecks(): QualityCheck[] {
  const firstQuestion = sampleAnalysis.questions[0];
  const invalidClassification = evaluationClassificationSchema.safeParse("teacher_mistake");
  const invalidRegion = regionSchema.safeParse({ x: 1.2, y: 0, width: 0.4, height: 0.2 });

  const marksExceedingMaximum = analysisResultSchema.safeParse({
    ...sampleAnalysis,
    questions: firstQuestion
      ? [{ ...firstQuestion, awardedMarks: firstQuestion.maximumMarks + 1 }, ...sampleAnalysis.questions.slice(1)]
      : sampleAnalysis.questions
  });

  const recoverableExceedingLost = analysisResultSchema.safeParse({
    ...sampleAnalysis,
    questions: firstQuestion
      ? [{ ...firstQuestion, recoverableMarks: firstQuestion.maximumMarks + 1 }, ...sampleAnalysis.questions.slice(1)]
      : sampleAnalysis.questions
  });

  const potentialExceedingMaximum = analysisResultSchema.safeParse({
    ...sampleAnalysis,
    studentGoal: {
      ...sampleAnalysis.studentGoal,
      potentialScore: sampleAnalysis.exam.maximumMarks + 1
    }
  });

  const malformedStructuredOutput = modelAnalysisResultSchema.safeParse({
    analysisId: "bad-output",
    exam: { title: "Only partial" }
  });

  const askPaperFailure = askPaperLiveResponseSchema.safeParse({
    answer: "",
    evidence: [],
    classification: "judgement",
    nextAction: ""
  });

  return [
    check("sample analysis remains valid", analysisResultSchema.safeParse(sampleAnalysis).success),
    check("marks exceeding maximum are rejected", !marksExceedingMaximum.success),
    check("recoverable marks exceeding lost marks are rejected", !recoverableExceedingLost.success),
    check("potential score exceeding maximum is rejected", !potentialExceedingMaximum.success),
    check("invalid evaluation classification is rejected", !invalidClassification.success),
    check("invalid evidence coordinates are rejected", !invalidRegion.success),
    check("malformed structured output is rejected", !malformedStructuredOutput.success),
    check("malformed Ask My Paper output is rejected", !askPaperFailure.success)
  ];
}
