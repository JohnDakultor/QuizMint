type RawAttemptDetail = {
  question?: string;
  correct?: boolean;
};

type AttemptLike = {
  studentName?: string | null;
  studentEmail?: string | null;
  scorePercent?: number;
  submittedAt?: string | Date | null;
  result?: unknown;
};

type AssignmentLike = {
  id: string;
  title: string;
  class?: {
    id: string;
    name: string;
  } | null;
  dueAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  studentCount?: number;
  attempts: AttemptLike[];
};

type StudentRiskLike = {
  studentName: string | null;
  studentEmail?: string | null;
  averageScore: number;
  lowScoreCount: number;
  classNames?: string[];
};

function normalizeQuestionLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeIdentity(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function getAttemptDetails(result: unknown): RawAttemptDetail[] {
  return Array.isArray(result) ? (result as RawAttemptDetail[]) : [];
}

function getAttemptIdentity(attempt: AttemptLike) {
  const email = normalizeIdentity(attempt.studentEmail);
  if (email) return `email:${email}`;
  const name = normalizeIdentity(attempt.studentName);
  if (name) return `name:${name}`;
  return "";
}

function getAssignmentTimestamp(assignment: AssignmentLike) {
  const value = assignment.updatedAt || assignment.createdAt || assignment.dueAt || null;
  return value ? new Date(value).getTime() : 0;
}

function getAverageScore(attempts: AttemptLike[]) {
  if (!attempts.length) return 0;
  return Math.round(
    attempts.reduce((sum, attempt) => sum + Number(attempt.scorePercent || 0), 0) / attempts.length,
  );
}

function getMissingCount(studentCount: number, attempts: AttemptLike[]) {
  return Math.max(Number(studentCount || 0) - attempts.length, 0);
}

function toIdentityMap(attempts: AttemptLike[]) {
  const map = new Map<string, number[]>();
  for (const attempt of attempts) {
    const identity = getAttemptIdentity(attempt);
    if (!identity) continue;
    const current = map.get(identity) || [];
    current.push(Number(attempt.scorePercent || 0));
    map.set(identity, current);
  }
  return map;
}

function toAverageMap(attempts: AttemptLike[]) {
  const source = toIdentityMap(attempts);
  return new Map(
    Array.from(source.entries()).map(([identity, scores]) => [
      identity,
      scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    ]),
  );
}

function tokenizeLabel(value: string) {
  return normalizeQuestionLabel(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
}

function labelsOverlap(a: string, b: string) {
  const left = tokenizeLabel(a);
  const right = new Set(tokenizeLabel(b));
  if (!left.length || !right.size) return normalizeQuestionLabel(a).toLowerCase() === normalizeQuestionLabel(b).toLowerCase();
  const overlap = left.filter((token) => right.has(token)).length;
  return overlap >= Math.max(1, Math.ceil(Math.min(left.length, right.size) / 2));
}

function buildWeakLabelSnapshot(assignments: AssignmentLike[]) {
  return buildWeakQuestionTrends(assignments).map((item) => item.label);
}

type InterventionEffectiveness = {
  hasData: boolean;
  summary: string;
  launchedAt: string | null;
  baseline: {
    averageScore: number;
    missingCount: number;
    weakConcepts: string[];
    studentCount: number;
  };
  post: {
    averageScore: number;
    missingCount: number;
    weakConceptCarryoverCount: number;
    measuredAssignmentCount: number;
    assignmentTitles: string[];
  } | null;
  delta: {
    score: number;
    missing: number;
  } | null;
  studentImpact: {
    improvedCount: number;
    stillAtRiskCount: number;
  };
};

type InterventionReview = {
  status: "needs_data" | "effective" | "mixed" | "at_risk";
  headline: string;
  summary: string;
  nextMove: string;
  provenEffective: boolean;
};

export function buildWeakQuestionTrends(assignments: AssignmentLike[]) {
  const trendMap = new Map<
    string,
    { label: string; missCount: number; assignmentTitles: Set<string>; classNames: Set<string> }
  >();

  for (const assignment of assignments) {
    for (const attempt of assignment.attempts) {
      for (const detail of getAttemptDetails(attempt.result)) {
        if (detail.correct !== false || !detail.question) continue;
        const label = normalizeQuestionLabel(detail.question);
        if (!label) continue;
        const current = trendMap.get(label) || {
          label,
          missCount: 0,
          assignmentTitles: new Set<string>(),
          classNames: new Set<string>(),
        };
        current.missCount += 1;
        current.assignmentTitles.add(assignment.title);
        if (assignment.class?.name) current.classNames.add(assignment.class.name);
        trendMap.set(label, current);
      }
    }
  }

  return Array.from(trendMap.values())
    .map((item) => ({
      label: item.label,
      missCount: item.missCount,
      assignmentTitles: Array.from(item.assignmentTitles).slice(0, 3),
      classNames: Array.from(item.classNames).slice(0, 3),
    }))
    .sort((a, b) => b.missCount - a.missCount)
    .slice(0, 6);
}

export function buildStudentsAtRisk(assignments: AssignmentLike[]) {
  const studentMap = new Map<
    string,
    {
      studentName: string | null;
      studentEmail: string | null;
      scores: number[];
      lowScoreCount: number;
      assignmentTitles: Set<string>;
      classNames: Set<string>;
      latestSubmittedAt: number;
    }
  >();

  for (const assignment of assignments) {
    for (const attempt of assignment.attempts) {
      const identity = getAttemptIdentity(attempt);
      if (!identity) continue;
      const current = studentMap.get(identity) || {
        studentName: attempt.studentName || null,
        studentEmail: attempt.studentEmail || null,
        scores: [],
        lowScoreCount: 0,
        assignmentTitles: new Set<string>(),
        classNames: new Set<string>(),
        latestSubmittedAt: 0,
      };
      const score = Number(attempt.scorePercent || 0);
      current.scores.push(score);
      if (score < 70) current.lowScoreCount += 1;
      current.assignmentTitles.add(assignment.title);
      if (assignment.class?.name) current.classNames.add(assignment.class.name);
      const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() : 0;
      if (submittedAt > current.latestSubmittedAt) current.latestSubmittedAt = submittedAt;
      if (!current.studentName && attempt.studentName) current.studentName = attempt.studentName;
      if (!current.studentEmail && attempt.studentEmail) current.studentEmail = attempt.studentEmail;
      studentMap.set(identity, current);
    }
  }

  return Array.from(studentMap.values())
    .map((item) => {
      const averageScore = item.scores.length
        ? Math.round(item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length)
        : 0;
      return {
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        averageScore,
        lowScoreCount: item.lowScoreCount,
        assignmentTitles: Array.from(item.assignmentTitles).slice(0, 3),
        classNames: Array.from(item.classNames).slice(0, 2),
        latestSubmittedAt: item.latestSubmittedAt ? new Date(item.latestSubmittedAt).toISOString() : null,
      };
    })
    .filter((item) => item.lowScoreCount > 0 || item.averageScore < 75)
    .sort((a, b) => {
      if (b.lowScoreCount !== a.lowScoreCount) return b.lowScoreCount - a.lowScoreCount;
      return a.averageScore - b.averageScore;
    })
    .slice(0, 8);
}

export function buildPerformanceTrend(assignments: AssignmentLike[]) {
  return assignments
    .map((assignment) => {
      const submissionCount = assignment.attempts.length;
      const averageScore = submissionCount
        ? Math.round(
            assignment.attempts.reduce((sum, attempt) => sum + Number(attempt.scorePercent || 0), 0) /
              submissionCount,
          )
        : 0;
      const studentCount = Number(assignment.studentCount || 0);
      const completionRate =
        studentCount > 0 ? Math.round((submissionCount / studentCount) * 100) : submissionCount > 0 ? 100 : 0;
      return {
        id: assignment.id,
        label: assignment.title,
        averageScore,
        completionRate,
        submittedAt:
          assignment.updatedAt || assignment.dueAt ? new Date(assignment.updatedAt || assignment.dueAt || 0).toISOString() : null,
      };
    })
    .filter((item) => item.averageScore > 0 || item.completionRate > 0)
    .slice(0, 6);
}

export function buildAlertGroupsByClass(assignments: AssignmentLike[]) {
  const classMap = new Map<
    string,
    { classId: string; className: string; lowScoreAssignments: number; missingSubmissions: number; weakestScore: number }
  >();

  for (const assignment of assignments) {
    if (!assignment.class) continue;
    const submissionCount = assignment.attempts.length;
    const studentCount = Number(assignment.studentCount || 0);
    const averageScore = submissionCount
      ? Math.round(
          assignment.attempts.reduce((sum, attempt) => sum + Number(attempt.scorePercent || 0), 0) /
            submissionCount,
        )
      : 0;
    const missingCount = Math.max(studentCount - submissionCount, 0);
    if (averageScore >= 70 && missingCount === 0) continue;

    const current = classMap.get(assignment.class.id) || {
      classId: assignment.class.id,
      className: assignment.class.name,
      lowScoreAssignments: 0,
      missingSubmissions: 0,
      weakestScore: 100,
    };
    if (averageScore < 70) current.lowScoreAssignments += 1;
    current.missingSubmissions += missingCount;
    current.weakestScore = Math.min(current.weakestScore, averageScore || current.weakestScore);
    classMap.set(assignment.class.id, current);
  }

  return Array.from(classMap.values())
    .sort((a, b) => {
      if (b.missingSubmissions !== a.missingSubmissions) return b.missingSubmissions - a.missingSubmissions;
      return a.weakestScore - b.weakestScore;
    })
    .slice(0, 6);
}

export function buildInterventionSummary(input: {
  weakQuestionTrends: Array<{ label: string; missCount: number }>;
  studentsAtRisk: Array<{ studentName: string | null; averageScore: number; lowScoreCount: number }>;
  alertGroupsByClass: Array<{ className: string; missingSubmissions: number; lowScoreAssignments: number }>;
}) {
  const lines: string[] = [];
  const topWeak = input.weakQuestionTrends[0];
  const topStudent = input.studentsAtRisk[0];
  const topClass = input.alertGroupsByClass[0];

  if (topWeak) {
    lines.push(`Most repeated weak concept: "${topWeak.label}" with ${topWeak.missCount} misses.`);
  }
  if (topStudent) {
    lines.push(
      `${topStudent.studentName || "One student"} is trending at risk with ${topStudent.lowScoreCount} low-score assignment${topStudent.lowScoreCount === 1 ? "" : "s"} and an average of ${topStudent.averageScore}%.`,
    );
  }
  if (topClass) {
    lines.push(
      `${topClass.className} needs attention first: ${topClass.missingSubmissions} missing submissions and ${topClass.lowScoreAssignments} low-score assignment${topClass.lowScoreAssignments === 1 ? "" : "s"}.`,
    );
  }

  return lines.join(" ");
}

function toShortFocusLabel(label: string) {
  return label.replace(/\s+/g, " ").trim().slice(0, 120);
}

function inferSupportLevel(input: { averageScore: number; missingCount: number; lowScoreCount?: number }) {
  if (input.averageScore < 60 || input.missingCount >= 5 || (input.lowScoreCount ?? 0) >= 3) {
    return "high_support";
  }
  if (input.averageScore < 75 || input.missingCount > 0 || (input.lowScoreCount ?? 0) >= 1) {
    return "moderate_support";
  }
  return "light_support";
}

function buildStudentSupportGroups(students: StudentRiskLike[]) {
  const groups = {
    intensive: [] as StudentRiskLike[],
    targeted: [] as StudentRiskLike[],
    monitor: [] as StudentRiskLike[],
  };

  for (const student of students) {
    if (student.averageScore < 60 || student.lowScoreCount >= 3) {
      groups.intensive.push(student);
    } else if (student.averageScore < 75 || student.lowScoreCount >= 2) {
      groups.targeted.push(student);
    } else {
      groups.monitor.push(student);
    }
  }

  const formatGroup = (label: string, items: StudentRiskLike[]) => ({
    label,
    count: items.length,
    sampleStudents: items
      .slice(0, 3)
      .map((student) => student.studentName || student.studentEmail || "Student"),
  });

  return [
    formatGroup("Intensive support", groups.intensive),
    formatGroup("Targeted reteach", groups.targeted),
    formatGroup("Monitor", groups.monitor),
  ].filter((group) => group.count > 0);
}

function buildDifficultyShiftRecommendation(input: {
  averageScore: number;
  supportLevel: string;
  weakestSuccessRate?: number;
}) {
  const weakestSuccessRate = Number(input.weakestSuccessRate ?? 100);
  if (input.averageScore < 55 || weakestSuccessRate < 45 || input.supportLevel === "high_support") {
    return {
      direction: "shift_down",
      label: "Shift difficulty down",
      rationale: "Use easier language, shorter tasks, and more worked examples before returning to full difficulty.",
    };
  }
  if (input.averageScore < 75 || weakestSuccessRate < 65 || input.supportLevel === "moderate_support") {
    return {
      direction: "stabilize",
      label: "Hold difficulty at easy-medium",
      rationale: "Keep the difficulty steady while reinforcing the weak concepts with scaffolding and quick checks.",
    };
  }
  return {
    direction: "ramp_up",
    label: "Gradually raise difficulty",
    rationale: "The class is recovering well enough to move toward medium or transfer-level questions.",
  };
}

function buildRemediationSequence(input: {
  supportLevel: string;
  focus: string[];
  missingCount: number;
  className?: string;
}) {
  const primaryFocus = input.focus[0] || "the weakest concept";
  const classLabel = input.className || "the class";
  const steps = [
    `Reteach ${primaryFocus} with one worked example and a misconception check for ${classLabel}.`,
  ];

  if (input.supportLevel === "high_support") {
    steps.push("Run a short easy-to-medium mastery check before assigning a full follow-up task.");
  } else {
    steps.push("Use a focused follow-up quiz or mini-task to confirm recovery on the weak concept.");
  }

  if (input.missingCount > 0) {
    steps.push(`Send reminders to the ${input.missingCount} missing student submission${input.missingCount === 1 ? "" : "s"} so remediation and completion happen together.`);
  } else {
    steps.push("Move the class into the next topic only after the reteach check shows stable understanding.");
  }

  return steps;
}

export function buildAdaptiveAssignmentSummary(input: {
  assignmentTitle: string;
  averageScore: number;
  missingCount: number;
  hardestQuestions: Array<{ question: string; successRate: number }>;
  atRiskStudents: Array<{ studentName: string | null; averageScore: number; lowScoreCount: number }>;
}) {
  const focus = input.hardestQuestions
    .map((item) => toShortFocusLabel(item.question))
    .filter(Boolean)
    .slice(0, 3);
  const topAtRisk = input.atRiskStudents[0];
  const supportLevel = inferSupportLevel({
    averageScore: input.averageScore,
    missingCount: input.missingCount,
    lowScoreCount: topAtRisk?.lowScoreCount ?? 0,
  });

  const summaryLines: string[] = [];
  if (focus[0]) {
    summaryLines.push(`Primary reteach focus: ${focus[0]}.`);
  }
  if (focus[1]) {
    summaryLines.push(`Secondary focus: ${focus[1]}.`);
  }
  if (topAtRisk) {
    summaryLines.push(
      `${topAtRisk.studentName || "A student group"} is trending low with ${topAtRisk.lowScoreCount} low-score assignment${
        topAtRisk.lowScoreCount === 1 ? "" : "s"
      } and an average of ${topAtRisk.averageScore}%.`,
    );
  }
  if (input.missingCount > 0) {
    summaryLines.push(
      `${input.missingCount} student submission${input.missingCount === 1 ? "" : "s"} are still missing, so follow-up should combine remediation with completion recovery.`,
    );
  }

  const recommendation =
    supportLevel === "high_support"
      ? "Use a short reteach quiz with simpler wording, worked examples, and immediate feedback."
      : supportLevel === "moderate_support"
      ? "Use a follow-up quiz or mini-lesson that revisits the weakest concepts before moving on."
      : "Use a light mastery check to confirm the class is ready for the next topic.";

  const groupedSupport = buildStudentSupportGroups(input.atRiskStudents);
  const difficultyShift = buildDifficultyShiftRecommendation({
    averageScore: input.averageScore,
    supportLevel,
    weakestSuccessRate: input.hardestQuestions[0]?.successRate,
  });
  const remediationSequence = buildRemediationSequence({
    supportLevel,
    focus,
    missingCount: input.missingCount,
  });

  return {
    supportLevel,
    focus,
    summary: summaryLines.join(" "),
    recommendation,
    groupedSupport,
    difficultyShift,
    remediationSequence,
  };
}

export function buildAdaptiveClassSummary(input: {
  className: string;
  averageScore: number;
  totalMissingSubmissions: number;
  dueSoonCount: number;
  weakQuestionTrends: Array<{ label: string; missCount: number }>;
  studentsAtRisk: Array<{ studentName: string | null; averageScore: number; lowScoreCount: number }>;
}) {
  const focus = input.weakQuestionTrends
    .map((item) => toShortFocusLabel(item.label))
    .filter(Boolean)
    .slice(0, 3);
  const topAtRisk = input.studentsAtRisk[0];
  const supportLevel = inferSupportLevel({
    averageScore: input.averageScore,
    missingCount: input.totalMissingSubmissions,
    lowScoreCount: topAtRisk?.lowScoreCount ?? 0,
  });

  const summaryLines: string[] = [];
  if (focus[0]) {
    summaryLines.push(`${input.className} is repeatedly weak in ${focus[0]}.`);
  }
  if (focus[1]) {
    summaryLines.push(`Another recurring class weakness is ${focus[1]}.`);
  }
  if (topAtRisk) {
    summaryLines.push(
      `${topAtRisk.studentName || "One student cluster"} needs attention with ${topAtRisk.lowScoreCount} low-score assignment${
        topAtRisk.lowScoreCount === 1 ? "" : "s"
      }.`,
    );
  }
  if (input.totalMissingSubmissions > 0) {
    summaryLines.push(
      `${input.totalMissingSubmissions} submission${input.totalMissingSubmissions === 1 ? "" : "s"} are still missing across active work.`,
    );
  }

  const recommendation =
    supportLevel === "high_support"
      ? "Prioritize a reteach lesson for the weakest concept, then send reminders before the next class session."
      : supportLevel === "moderate_support"
      ? "Run a follow-up review for the top weak concept and monitor the at-risk students closely."
      : input.dueSoonCount > 0
      ? "Keep the class moving with a light review and stay ahead of due-soon work."
      : "Use a short reinforcement activity to keep mastery stable.";

  const groupedSupport = buildStudentSupportGroups(input.studentsAtRisk);
  const difficultyShift = buildDifficultyShiftRecommendation({
    averageScore: input.averageScore,
    supportLevel,
  });
  const remediationSequence = buildRemediationSequence({
    supportLevel,
    focus,
    missingCount: input.totalMissingSubmissions,
    className: input.className,
  });

  return {
    supportLevel,
    focus,
    summary: summaryLines.join(" "),
    recommendation,
    groupedSupport,
    difficultyShift,
    remediationSequence,
  };
}

export function buildAdaptiveWorkspaceSummary(input: {
  weakQuestionTrends: Array<{ label: string; missCount: number; classNames?: string[] }>;
  studentsAtRisk: Array<{ studentName: string | null; averageScore: number; lowScoreCount: number; classNames?: string[] }>;
  alertGroupsByClass: Array<{ classId: string; className: string; missingSubmissions: number; lowScoreAssignments: number; weakestScore: number }>;
}) {
  const topWeak = input.weakQuestionTrends[0];
  const topClass = input.alertGroupsByClass[0];
  const topAtRisk = input.studentsAtRisk[0];
  const supportLevel = inferSupportLevel({
    averageScore: topClass?.weakestScore ?? topAtRisk?.averageScore ?? 100,
    missingCount: topClass?.missingSubmissions ?? 0,
    lowScoreCount: topAtRisk?.lowScoreCount ?? 0,
  });

  const focus = input.weakQuestionTrends
    .map((item) => toShortFocusLabel(item.label))
    .filter(Boolean)
    .slice(0, 3);

  const summaryParts: string[] = [];
  if (topClass) {
    summaryParts.push(
      `${topClass.className} is the top intervention class with ${topClass.missingSubmissions} missing submissions and ${topClass.lowScoreAssignments} low-score assignment${
        topClass.lowScoreAssignments === 1 ? "" : "s"
      }.`,
    );
  }
  if (topWeak) {
    summaryParts.push(`Top weak concept across recent work: ${toShortFocusLabel(topWeak.label)}.`);
  }
  if (topAtRisk) {
    summaryParts.push(
      `${topAtRisk.studentName || "A student cluster"} is repeatedly underperforming with ${topAtRisk.lowScoreCount} low-score assignment${
        topAtRisk.lowScoreCount === 1 ? "" : "s"
      }.`,
    );
  }

  const recommendation =
    supportLevel === "high_support"
      ? "Generate a reteach quiz for the top weak concept and prioritize the highest-alert class first."
      : supportLevel === "moderate_support"
      ? "Use a focused follow-up quiz on the top weak concept before the next due assignment."
      : "Keep reinforcement light and use the adaptive context as a quick mastery check.";

  const suggestedPrompt = [
    topClass ? `Create a reteach quiz for ${topClass.className}.` : "Create a reteach quiz for the highest-need class.",
    focus[0] ? `Focus on this weak concept: ${focus[0]}.` : "",
    focus[1] ? `Secondary concept: ${focus[1]}.` : "",
    topAtRisk
      ? `${topAtRisk.studentName || "A student group"} is showing repeated low performance, so use clearer scaffolding and easier-to-medium progression.`
      : "",
    recommendation,
  ]
    .filter(Boolean)
    .join(" ");

  const groupedSupport = buildStudentSupportGroups(input.studentsAtRisk);
  const difficultyShift = buildDifficultyShiftRecommendation({
    averageScore: topClass?.weakestScore ?? topAtRisk?.averageScore ?? 100,
    supportLevel,
  });
  const remediationSequence = buildRemediationSequence({
    supportLevel,
    focus,
    missingCount: topClass?.missingSubmissions ?? 0,
    className: topClass?.className,
  });

  return {
    supportLevel,
    focus,
    primaryClassName: topClass?.className ?? null,
    primaryClassId: topClass?.classId ?? null,
    summary: summaryParts.join(" "),
    recommendation,
    suggestedPrompt,
    groupedSupport,
    difficultyShift,
    remediationSequence,
  };
}

export function buildAssignmentInterventionEffectiveness(input: {
  sourceAssignment: AssignmentLike;
  hardestQuestions: Array<{ question: string; successRate: number }>;
  interventionHistory: Array<{ createdAt: string | Date | null }>;
  followUpAssignments: AssignmentLike[];
}): InterventionEffectiveness {
  const launchedAt = input.interventionHistory
    .map((event) => (event.createdAt ? new Date(event.createdAt).getTime() : 0))
    .filter((value) => value > 0)
    .sort((a, b) => a - b)[0];
  const baselineWeakConcepts = input.hardestQuestions
    .map((item) => normalizeQuestionLabel(item.question))
    .filter(Boolean)
    .slice(0, 3);
  const baselineAverageScore = getAverageScore(input.sourceAssignment.attempts);
  const baselineMissingCount = getMissingCount(
    Number(input.sourceAssignment.studentCount || 0),
    input.sourceAssignment.attempts,
  );
  const baselineStudentMap = toAverageMap(input.sourceAssignment.attempts);
  const baselineLowScoreIdentities = Array.from(baselineStudentMap.entries())
    .filter(([, score]) => score < 70)
    .map(([identity]) => identity);

  const postAssignments = input.followUpAssignments
    .filter((assignment) => assignment.id !== input.sourceAssignment.id)
    .filter((assignment) => assignment.attempts.length > 0)
    .filter((assignment) => {
      if (!launchedAt) return true;
      return getAssignmentTimestamp(assignment) > launchedAt;
    })
    .sort((a, b) => getAssignmentTimestamp(a) - getAssignmentTimestamp(b));

  if (!postAssignments.length) {
    return {
      hasData: false,
      summary: "No scored follow-up assignment is available yet, so intervention impact will appear after the next completed check.",
      launchedAt: launchedAt ? new Date(launchedAt).toISOString() : null,
      baseline: {
        averageScore: baselineAverageScore,
        missingCount: baselineMissingCount,
        weakConcepts: baselineWeakConcepts,
        studentCount: Number(input.sourceAssignment.studentCount || 0),
      },
      post: null,
      delta: null,
      studentImpact: {
        improvedCount: 0,
        stillAtRiskCount: baselineLowScoreIdentities.length,
      },
    };
  }

  const postAverageScore = Math.round(
    postAssignments.reduce((sum, assignment) => sum + getAverageScore(assignment.attempts), 0) /
      postAssignments.length,
  );
  const postMissingCount = Math.round(
    postAssignments.reduce((sum, assignment) => sum + getMissingCount(Number(assignment.studentCount || 0), assignment.attempts), 0) /
      postAssignments.length,
  );
  const postWeakLabels = buildWeakLabelSnapshot(postAssignments);
  const weakConceptCarryoverCount = baselineWeakConcepts.filter((baselineLabel) =>
    postWeakLabels.some((postLabel) => labelsOverlap(baselineLabel, postLabel)),
  ).length;
  const postAverageByStudent = toAverageMap(postAssignments.flatMap((assignment) => assignment.attempts));
  const improvedCount = baselineLowScoreIdentities.filter((identity) => {
    const nextAverage = postAverageByStudent.get(identity);
    return typeof nextAverage === "number" && nextAverage >= 70;
  }).length;
  const stillAtRiskCount = baselineLowScoreIdentities.filter((identity) => {
    const nextAverage = postAverageByStudent.get(identity);
    return typeof nextAverage !== "number" || nextAverage < 70;
  }).length;
  const scoreDelta = postAverageScore - baselineAverageScore;
  const missingDelta = baselineMissingCount - postMissingCount;

  return {
    hasData: true,
    summary: `Average score ${scoreDelta >= 0 ? "improved" : "fell"} from ${baselineAverageScore}% to ${postAverageScore}%. Missing submissions ${missingDelta >= 0 ? "improved" : "worsened"} from ${baselineMissingCount} to ${postMissingCount}. ${weakConceptCarryoverCount === 0 ? "The baseline weak concepts are no longer showing up in the current weak-question set." : `${weakConceptCarryoverCount} baseline weak concept${weakConceptCarryoverCount === 1 ? " is" : "s are"} still carrying into follow-up work.`}`,
    launchedAt: launchedAt ? new Date(launchedAt).toISOString() : null,
    baseline: {
      averageScore: baselineAverageScore,
      missingCount: baselineMissingCount,
      weakConcepts: baselineWeakConcepts,
      studentCount: Number(input.sourceAssignment.studentCount || 0),
    },
    post: {
      averageScore: postAverageScore,
      missingCount: postMissingCount,
      weakConceptCarryoverCount,
      measuredAssignmentCount: postAssignments.length,
      assignmentTitles: postAssignments.map((assignment) => assignment.title).slice(0, 4),
    },
    delta: {
      score: scoreDelta,
      missing: missingDelta,
    },
    studentImpact: {
      improvedCount,
      stillAtRiskCount,
    },
  };
}

export function buildClassInterventionEffectiveness(input: {
  className: string;
  studentCount: number;
  assignments: AssignmentLike[];
  interventionHistory: Array<{ createdAt: string | Date | null }>;
}): InterventionEffectiveness {
  const launchedAt = input.interventionHistory
    .map((event) => (event.createdAt ? new Date(event.createdAt).getTime() : 0))
    .filter((value) => value > 0)
    .sort((a, b) => b - a)[0];

  const scoredAssignments = input.assignments
    .filter((assignment) => assignment.attempts.length > 0)
    .sort((a, b) => getAssignmentTimestamp(a) - getAssignmentTimestamp(b));
  const preAssignments = scoredAssignments
    .filter((assignment) => !launchedAt || getAssignmentTimestamp(assignment) <= launchedAt)
    .slice(-3);
  const postAssignments = scoredAssignments.filter(
    (assignment) => launchedAt && getAssignmentTimestamp(assignment) > launchedAt,
  );

  const baselineAverageScore = preAssignments.length
    ? Math.round(
        preAssignments.reduce((sum, assignment) => sum + getAverageScore(assignment.attempts), 0) /
          preAssignments.length,
      )
    : 0;
  const baselineMissingCount = preAssignments.length
    ? Math.round(
        preAssignments.reduce(
          (sum, assignment) => sum + getMissingCount(Number(assignment.studentCount || input.studentCount), assignment.attempts),
          0,
        ) / preAssignments.length,
      )
    : 0;
  const baselineWeakConcepts = buildWeakLabelSnapshot(preAssignments).slice(0, 3);
  const baselineLowScoreStudents = buildStudentsAtRisk(preAssignments)
    .filter((student) => student.averageScore < 70 || student.lowScoreCount > 0)
    .map((student) => {
      const email = normalizeIdentity(student.studentEmail);
      if (email) return `email:${email}`;
      const name = normalizeIdentity(student.studentName);
      return name ? `name:${name}` : "";
    })
    .filter(Boolean);

  if (!launchedAt || !postAssignments.length) {
    return {
      hasData: false,
      summary: `No scored post-intervention work is available yet for ${input.className}, so impact will appear after the next completed assignment.`,
      launchedAt: launchedAt ? new Date(launchedAt).toISOString() : null,
      baseline: {
        averageScore: baselineAverageScore,
        missingCount: baselineMissingCount,
        weakConcepts: baselineWeakConcepts,
        studentCount: input.studentCount,
      },
      post: null,
      delta: null,
      studentImpact: {
        improvedCount: 0,
        stillAtRiskCount: baselineLowScoreStudents.length,
      },
    };
  }

  const postAverageScore = Math.round(
    postAssignments.reduce((sum, assignment) => sum + getAverageScore(assignment.attempts), 0) /
      postAssignments.length,
  );
  const postMissingCount = Math.round(
    postAssignments.reduce(
      (sum, assignment) => sum + getMissingCount(Number(assignment.studentCount || input.studentCount), assignment.attempts),
      0,
    ) / postAssignments.length,
  );
  const postWeakLabels = buildWeakLabelSnapshot(postAssignments);
  const weakConceptCarryoverCount = baselineWeakConcepts.filter((baselineLabel) =>
    postWeakLabels.some((postLabel) => labelsOverlap(baselineLabel, postLabel)),
  ).length;
  const postAverageByStudent = toAverageMap(postAssignments.flatMap((assignment) => assignment.attempts));
  const improvedCount = baselineLowScoreStudents.filter((identity) => {
    const nextAverage = postAverageByStudent.get(identity);
    return typeof nextAverage === "number" && nextAverage >= 70;
  }).length;
  const stillAtRiskCount = baselineLowScoreStudents.filter((identity) => {
    const nextAverage = postAverageByStudent.get(identity);
    return typeof nextAverage !== "number" || nextAverage < 70;
  }).length;
  const scoreDelta = postAverageScore - baselineAverageScore;
  const missingDelta = baselineMissingCount - postMissingCount;

  return {
    hasData: true,
    summary: `${input.className} moved from ${baselineAverageScore}% to ${postAverageScore}% average after intervention tracking began. Missing submissions ${missingDelta >= 0 ? "dropped" : "rose"} from ${baselineMissingCount} to ${postMissingCount}. ${weakConceptCarryoverCount === 0 ? "The top baseline weak concepts have largely cleared in later work." : `${weakConceptCarryoverCount} baseline weak concept${weakConceptCarryoverCount === 1 ? " still appears" : "s still appear"} in later weak-question trends.`}`,
    launchedAt: new Date(launchedAt).toISOString(),
    baseline: {
      averageScore: baselineAverageScore,
      missingCount: baselineMissingCount,
      weakConcepts: baselineWeakConcepts,
      studentCount: input.studentCount,
    },
    post: {
      averageScore: postAverageScore,
      missingCount: postMissingCount,
      weakConceptCarryoverCount,
      measuredAssignmentCount: postAssignments.length,
      assignmentTitles: postAssignments.map((assignment) => assignment.title).slice(0, 4),
    },
    delta: {
      score: scoreDelta,
      missing: missingDelta,
    },
    studentImpact: {
      improvedCount,
      stillAtRiskCount,
    },
  };
}

export function buildInterventionReview(input: {
  effectiveness: InterventionEffectiveness;
  supportLevel?: string | null;
  recommendation?: string | null;
}): InterventionReview {
  const supportLevel = String(input.supportLevel || "");
  const recommendation = String(input.recommendation || "").trim();
  const effect = input.effectiveness;

  if (!effect.hasData || !effect.delta || !effect.post) {
    return {
      status: "needs_data",
      headline: "Intervention impact still gathering",
      summary: effect.summary,
      nextMove:
        recommendation ||
        "Run the next scored follow-up check before deciding whether the intervention was effective.",
      provenEffective: false,
    };
  }

  const scoreDelta = effect.delta.score;
  const missingRecovery = effect.delta.missing;
  const stillAtRisk = effect.studentImpact.stillAtRiskCount;
  const improved = effect.studentImpact.improvedCount;
  const carryover = effect.post.weakConceptCarryoverCount;

  if (scoreDelta >= 10 && missingRecovery >= 0 && carryover <= 1 && improved >= stillAtRisk) {
    return {
      status: "effective",
      headline: "Teaching action is working",
      summary: `${effect.summary} The follow-up is showing strong enough recovery to reuse this approach in similar classes.`,
      nextMove:
        "Keep the successful structure, move the class into the next concept, and save this intervention as a reusable follow-up pattern.",
      provenEffective: true,
    };
  }

  if (scoreDelta >= 0 || missingRecovery > 0 || improved > 0) {
    return {
      status: "mixed",
      headline: "Intervention is helping, but not finished yet",
      summary: `${effect.summary} Recovery is visible, but some students or concepts still need another round of support.`,
      nextMove:
        supportLevel === "high_support"
          ? "Keep difficulty low, target the students still at risk, and run one more short mastery check."
          : "Repeat the strongest part of this intervention with a narrower concept focus before moving on.",
      provenEffective: false,
    };
  }

  return {
    status: "at_risk",
    headline: "Intervention needs adjustment",
    summary: `${effect.summary} The current follow-up has not produced enough improvement yet.`,
    nextMove:
      supportLevel === "high_support"
        ? "Shift difficulty down further, shorten tasks, and reteach the weakest concept with more scaffolding."
        : "Revise the follow-up plan with clearer explanations and a more focused reteach target.",
    provenEffective: false,
  };
}

export function buildWorkspaceInterventionReview(input: {
  adaptiveSummary: {
    supportLevel: string;
    recommendation: string;
    primaryClassName: string | null;
    focus: string[];
  };
  performanceTrend: Array<{ averageScore: number }>;
  lowScoreAlertCount: number;
  reminderNeededCount: number;
}) {
  const latestAverage = input.performanceTrend[0]?.averageScore ?? 0;
  const earliestAverage = input.performanceTrend[input.performanceTrend.length - 1]?.averageScore ?? latestAverage;
  const scoreDelta = latestAverage - earliestAverage;
  const focusText = input.adaptiveSummary.focus.slice(0, 2).join("; ");

  if (!input.performanceTrend.length) {
    return {
      headline: "Not enough follow-up data yet",
      summary: "The workspace needs more scored assignments before it can tell you whether the recent intervention direction is working.",
      nextMove: input.adaptiveSummary.recommendation,
    };
  }

  if (scoreDelta >= 8 && input.lowScoreAlertCount <= 1) {
    return {
      headline: "Recent intervention direction is improving outcomes",
      summary: `${input.adaptiveSummary.primaryClassName || "Your priority class"} is trending upward by ${scoreDelta}% across recent scored work${focusText ? ` while focusing on ${focusText}` : ""}.`,
      nextMove: "Reuse this intervention pattern in the library and keep the next follow-up light unless new weak concepts appear.",
    };
  }

  if (scoreDelta >= 0) {
    return {
      headline: "Progress is visible but fragile",
      summary: `${input.lowScoreAlertCount} low-score alert${input.lowScoreAlertCount === 1 ? "" : "s"} and ${input.reminderNeededCount} pending reminder${input.reminderNeededCount === 1 ? "" : "s"} mean the current intervention still needs reinforcement.`,
      nextMove: input.adaptiveSummary.recommendation,
    };
  }

  return {
    headline: "Current intervention path needs adjustment",
    summary: `Recent average performance is down ${Math.abs(scoreDelta)}%, so the current follow-up structure is not yet producing stable recovery.`,
    nextMove: "Lower the difficulty, narrow the concept focus, and relaunch a shorter reteach bundle.",
  };
}
