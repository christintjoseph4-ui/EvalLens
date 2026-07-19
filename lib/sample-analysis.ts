import { validateAnalysisResult } from "@/lib/validation";

const rawSampleAnalysis = {
  analysisId: "sample-physics-projectile-motion",
  exam: {
    title: "Class 12 Physics Unit Test: Motion and Fields",
    subject: "Physics",
    maximumMarks: 40
  },
  studentGoal: {
    currentScore: 22,
    targetScore: 35,
    recoverableMarks: 13,
    potentialScore: 35
  },
  summary: {
    headline: "You are 13 recoverable marks closer to your goal.",
    supportingMessage:
      "Your conceptual understanding is stronger than the current score suggests. The highest-impact improvements are completeness, numerical accuracy, and units.",
    nextBestAction: "Spend 25 minutes revising Projectile Motion with two calculation checks."
  },
  learningTwin: {
    conceptMastery: 68,
    numericalAccuracy: 54,
    answerCompleteness: 61,
    presentation: 72
  },
  questions: [
    {
      id: "q1",
      number: "1",
      questionText:
        "Define projectile motion and state two assumptions used while deriving its trajectory.",
      maximumMarks: 6,
      awardedMarks: 4,
      topic: "Projectile Motion",
      expectedSkills: ["Definition recall", "Assumption identification", "Precise wording"],
      studentAnswer:
        "Projectile motion is motion in two dimensions under gravity. The horizontal velocity is constant and vertical velocity changes due to gravity.",
      teacherAnnotations: [
        {
          text: "Incomplete assumptions",
          page: 1,
          region: { x: 0.62, y: 0.2, width: 0.22, height: 0.05 }
        }
      ],
      whatWentWell: [
        "Identified two-dimensional motion under gravity.",
        "Correctly separated horizontal and vertical components."
      ],
      improvementOpportunities: [
        "State that air resistance is neglected.",
        "Mention that acceleration due to gravity is constant and downward."
      ],
      deductionReason:
        "The answer gives the core idea but does not fully state two assumptions required by the question.",
      evidence: [
        "Student wrote: horizontal velocity is constant.",
        "Teacher annotation says: Incomplete assumptions."
      ],
      attentionTopics: ["Projectile Motion"],
      attentionSkills: ["Completeness", "Definition precision"],
      improvementCategory: "Completeness",
      nextAction:
        "Rewrite this definition with two explicit assumptions, then compare it with the full-mark answer.",
      recoverableMarks: 2,
      evaluationClassification: "consistent",
      mappingConfidence: 0.96,
      analysisConfidence: 0.9,
      requiresManualReview: false,
      paperPageImage: "/demo/evaluated-paper/page-1.svg",
      answerRegion: { x: 0.1, y: 0.13, width: 0.53, height: 0.15 },
      fullMarkAnswer:
        "Projectile motion is the two-dimensional motion of an object projected into the air and moving under the influence of gravity alone. In the standard derivation, air resistance is neglected and acceleration due to gravity is taken as constant and vertically downward.",
      similarQuestions: [
        "State two assumptions made while analysing a projectile launched at an angle.",
        "Why is horizontal velocity constant in ideal projectile motion?"
      ],
      conceptMinute:
        "Treat projectile motion as two simpler motions happening together: horizontal motion at constant velocity and vertical motion with constant downward acceleration due to gravity."
    },
    {
      id: "q2",
      number: "2",
      questionText:
        "A ball is projected horizontally at 12 m/s from a 20 m high platform. Find the time of flight and horizontal range. Take g = 10 m/s^2.",
      maximumMarks: 8,
      awardedMarks: 5,
      topic: "Projectile Motion",
      expectedSkills: ["Formula selection", "Substitution", "Calculation accuracy"],
      studentAnswer:
        "t = sqrt(2h/g) = sqrt(40/10) = sqrt(4) = 2 s. Range = u x t = 12 x 3 = 36 m.",
      teacherAnnotations: [
        {
          text: "Calculation check",
          page: 1,
          region: { x: 0.68, y: 0.41, width: 0.19, height: 0.05 }
        }
      ],
      whatWentWell: [
        "Selected the correct time-of-flight formula.",
        "Calculated the time of flight correctly as 2 s."
      ],
      improvementOpportunities: [
        "Use the calculated time consistently in the range step.",
        "Add a quick final substitution check before writing the answer."
      ],
      deductionReason:
        "The method is correct, but the final range uses 3 s instead of the calculated 2 s.",
      evidence: [
        "Student calculated t = 2 s.",
        "Student then wrote Range = 12 x 3 = 36 m.",
        "Teacher annotation points to the range calculation."
      ],
      attentionTopics: ["Projectile Motion"],
      attentionSkills: ["Calculation accuracy", "Final substitution check"],
      improvementCategory: "Calculation accuracy",
      nextAction: "Redo three range questions and circle the value substituted in the final step.",
      recoverableMarks: 2,
      evaluationClassification: "consistent",
      mappingConfidence: 0.94,
      analysisConfidence: 0.92,
      requiresManualReview: false,
      paperPageImage: "/demo/evaluated-paper/page-1.svg",
      answerRegion: { x: 0.1, y: 0.33, width: 0.58, height: 0.14 },
      fullMarkAnswer:
        "For vertical motion, h = 1/2 gt^2, so 20 = 1/2 x 10 x t^2 and t = 2 s. Horizontal range = horizontal speed x time = 12 x 2 = 24 m.",
      similarQuestions: [
        "A stone is projected horizontally at 15 m/s from a height of 45 m. Find time of flight and range.",
        "A ball leaves a table horizontally and lands after 1.5 s. If its speed is 8 m/s, find its range."
      ],
      conceptMinute:
        "When a projectile is launched horizontally, vertical motion decides time while horizontal velocity decides range. The bridge between them is the same time value."
    },
    {
      id: "q3",
      number: "3",
      questionText:
        "Derive the expression for centripetal force and state its SI unit.",
      maximumMarks: 6,
      awardedMarks: 5,
      topic: "Circular Motion",
      expectedSkills: ["Formula derivation", "Units and notation", "Concept naming"],
      studentAnswer:
        "Centripetal acceleration a = v^2/r. Hence force F = ma = mv^2/r. It acts towards the centre.",
      teacherAnnotations: [
        {
          text: "Unit?",
          page: 1,
          region: { x: 0.65, y: 0.63, width: 0.09, height: 0.05 }
        }
      ],
      whatWentWell: [
        "Derived the expression F = mv^2/r correctly.",
        "Mentioned that the force acts towards the centre."
      ],
      improvementOpportunities: ["Add the SI unit clearly: newton or N."],
      deductionReason:
        "The derivation is correct, but the requested SI unit was not written.",
      evidence: [
        "Student wrote the correct formula F = mv^2/r.",
        "Teacher annotation asks: Unit?"
      ],
      attentionTopics: ["Circular Motion"],
      attentionSkills: ["Units and notation"],
      improvementCategory: "Units and notation",
      nextAction: "Add units to the final line of every numerical or derivation answer.",
      recoverableMarks: 1,
      evaluationClassification: "consistent",
      mappingConfidence: 0.95,
      analysisConfidence: 0.91,
      requiresManualReview: false,
      paperPageImage: "/demo/evaluated-paper/page-1.svg",
      answerRegion: { x: 0.1, y: 0.55, width: 0.54, height: 0.13 },
      fullMarkAnswer:
        "Centripetal acceleration is a = v^2/r. From Newton's second law, F = ma, so centripetal force F = mv^2/r, directed towards the centre of the circular path. The SI unit is newton, N.",
      similarQuestions: [
        "Derive centripetal acceleration for uniform circular motion and state its direction.",
        "A mass moves in a circle of radius r with speed v. Write the centripetal force and its unit."
      ],
      conceptMinute:
        "Centripetal force is not a new kind of force. It is the net inward force needed to keep an object moving along a circular path."
    },
    {
      id: "q4",
      number: "4",
      questionText:
        "Explain why the electric field inside a charged conducting sphere is zero in electrostatic equilibrium.",
      maximumMarks: 10,
      awardedMarks: 3,
      topic: "Electrostatics",
      expectedSkills: ["Concept explanation", "Cause and effect", "Scientific reasoning"],
      studentAnswer:
        "The electric field is zero because positive and negative charges cancel each other inside the sphere. The charges stay everywhere equally.",
      teacherAnnotations: [
        {
          text: "Concept unclear",
          page: 2,
          region: { x: 0.64, y: 0.22, width: 0.2, height: 0.05 }
        }
      ],
      whatWentWell: [
        "Recognised that the field inside the conductor is zero in the stated condition."
      ],
      improvementOpportunities: [
        "Explain that free charges redistribute until internal electric field becomes zero.",
        "State that excess charge resides on the outer surface of a conductor."
      ],
      deductionReason:
        "The answer gives the final result but explains it using charge cancellation, which is not the correct electrostatic-equilibrium reasoning.",
      evidence: [
        "Student wrote: charges cancel each other inside the sphere.",
        "Teacher annotation says: Concept unclear."
      ],
      attentionTopics: ["Electrostatics"],
      attentionSkills: ["Concept understanding", "Scientific explanation"],
      improvementCategory: "Concept understanding",
      nextAction:
        "Review conductor equilibrium and write a three-line explanation using free-charge redistribution.",
      recoverableMarks: 4,
      evaluationClassification: "teacher_discretion",
      mappingConfidence: 0.93,
      analysisConfidence: 0.88,
      requiresManualReview: false,
      paperPageImage: "/demo/evaluated-paper/page-2.svg",
      answerRegion: { x: 0.1, y: 0.13, width: 0.53, height: 0.15 },
      fullMarkAnswer:
        "In a conductor, free charges move when an electric field is present. In electrostatic equilibrium they redistribute on the surface until the electric field inside the conducting material becomes zero. If an internal field remained, charges would continue moving, so equilibrium would not exist.",
      similarQuestions: [
        "Why does excess charge reside on the surface of a conductor?",
        "Explain the electric field inside a hollow conducting shell in electrostatic equilibrium."
      ],
      conceptMinute:
        "A conductor reaches electrostatic equilibrium only when its free charges no longer drift. That can happen inside the conductor only if the internal electric field is zero."
    },
    {
      id: "q5",
      number: "5",
      questionText:
        "For a projectile launched with speed u at angle theta, write the formula for maximum height and calculate it for u = 20 m/s, theta = 30 degrees, g = 10 m/s^2.",
      maximumMarks: 10,
      awardedMarks: 5,
      topic: "Projectile Motion",
      expectedSkills: ["Formula recall", "Trigonometric substitution", "Objective calculation"],
      studentAnswer:
        "H = u^2 sin^2 theta / 2g. H = 20^2 x (1/2)^2 / 20 = 400 x 1/4 / 20 = 5 m.",
      teacherAnnotations: [
        {
          text: "5/10",
          page: 2,
          region: { x: 0.7, y: 0.49, width: 0.08, height: 0.05 }
        }
      ],
      whatWentWell: [
        "Used the correct maximum-height formula.",
        "Substituted sin 30 degrees correctly as 1/2.",
        "Arrived at the objective numerical answer of 5 m."
      ],
      improvementOpportunities: [
        "Keep the final answer visually separate and include one short formula-label line."
      ],
      deductionReason:
        "The paper evidence shows the formula, substitution, unit, and final answer. The awarded mark may be lower than expected for this objective calculation, but the teacher remains the final authority.",
      evidence: [
        "Student wrote H = u^2 sin^2 theta / 2g.",
        "Student calculated H = 5 m.",
        "The question asks for the formula and calculation."
      ],
      attentionTopics: ["Projectile Motion"],
      attentionSkills: ["Answer structure", "Objective calculation"],
      improvementCategory: "Answer structure",
      nextAction:
        "Ask the teacher whether the answer presentation missed any rubric requirement before assuming a mark change.",
      recoverableMarks: 4,
      evaluationClassification: "objective_review_opportunity",
      mappingConfidence: 0.95,
      analysisConfidence: 0.86,
      requiresManualReview: true,
      paperPageImage: "/demo/evaluated-paper/page-2.svg",
      answerRegion: { x: 0.1, y: 0.4, width: 0.58, height: 0.14 },
      fullMarkAnswer:
        "Maximum height H = u^2 sin^2 theta / 2g. Here u = 20 m/s, theta = 30 degrees, and g = 10 m/s^2. H = 20^2 x (1/2)^2 / 20 = 400 x 1/4 / 20 = 5 m.",
      similarQuestions: [
        "Find the maximum height of a projectile launched at 10 m/s at 45 degrees, taking g = 10 m/s^2.",
        "A projectile reaches a maximum height of 20 m. Relate this height to its vertical component of initial velocity."
      ],
      conceptMinute:
        "Maximum height depends only on the initial vertical component. At the top, vertical velocity becomes zero, so v^2 = u_y^2 - 2gH gives H = u_y^2/2g."
    }
  ],
  topicProgress: [
    {
      topic: "Projectile Motion",
      scorePercentage: 70,
      status: "Strong foundation with recoverable calculation and completeness marks",
      nextAction: "Practice two mixed projectile questions and check final substitutions."
    },
    {
      topic: "Circular Motion",
      scorePercentage: 83,
      status: "Secure derivation; unit notation needs a final-line habit",
      nextAction: "Add units and direction to the closing line."
    },
    {
      topic: "Electrostatics",
      scorePercentage: 30,
      status: "Current development area",
      nextAction: "Revise conductor equilibrium using charge redistribution."
    }
  ],
  reviewOpportunities: [
    {
      questionId: "q5",
      reason:
        "The formula, substitution, unit, and final numerical answer are visible in the evaluated answer.",
      evidence: [
        "Correct formula is written.",
        "sin 30 degrees is substituted as 1/2.",
        "Final answer is 5 m."
      ],
      confidence: 0.86
    }
  ],
  revisionPlan: [
    {
      priority: 1,
      topic: "Projectile Motion",
      reason: "Several recoverable marks come from completeness and final-step checking.",
      action: "Solve two horizontal-projection questions and one maximum-height question.",
      durationMinutes: 25,
      practiceQuestions: 3,
      expectedBenefit: "Recover calculation and presentation marks without relearning the full chapter."
    },
    {
      priority: 2,
      topic: "Electrostatics",
      reason: "The largest conceptual gap appears in conductor equilibrium.",
      action: "Write a three-line explanation, then teach it aloud once.",
      durationMinutes: 18,
      practiceQuestions: 2,
      expectedBenefit: "Improve explanation quality on theory questions."
    },
    {
      priority: 3,
      topic: "Units and notation",
      reason: "One mark was recoverable by adding the requested SI unit.",
      action: "Add a final unit-and-direction check to every answer.",
      durationMinutes: 7,
      practiceQuestions: 5,
      expectedBenefit: "Build a low-effort habit that protects easy marks."
    }
  ],
  historicalPreview: [
    {
      testName: "Sample Test 1",
      score: 16,
      conceptMastery: 52,
      numericalAccuracy: 48,
      answerCompleteness: 45
    },
    {
      testName: "Sample Test 2",
      score: 19,
      conceptMastery: 61,
      numericalAccuracy: 50,
      answerCompleteness: 54
    },
    {
      testName: "Sample Test 3",
      score: 22,
      conceptMastery: 68,
      numericalAccuracy: 54,
      answerCompleteness: 61
    }
  ]
};

export const sampleAnalysis = validateAnalysisResult(rawSampleAnalysis);

export function getSampleQuestion(questionId: string) {
  return sampleAnalysis.questions.find((question) => question.id === questionId);
}
