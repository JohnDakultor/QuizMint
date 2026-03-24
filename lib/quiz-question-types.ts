export type QuizQuestionType =
  | "mcq"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  | "matching"
  | "essay_rubric"
  | "worksheet"
  | "gamified";

export type GamifiedMode = "bingo" | "sudoku" | "puzzle";

function hasTrueFalseOptions(options: string[]) {
  const normalized = options.map((opt) => String(opt).trim().toLowerCase());
  return normalized.length === 2 && normalized.includes("true") && normalized.includes("false");
}

export function inferQuizQuestionType(question: string, options: string[]): QuizQuestionType {
  const q = String(question || "").toLowerCase();
  const hasOptions = Array.isArray(options) && options.length >= 2;
  const hasNoOptions = !Array.isArray(options) || options.length === 0;

  if (hasTrueFalseOptions(options)) return "true_false";
  if (/match(ing)?|pair|column\s*a|column\s*b|match the following/.test(q)) return "matching";
  if (/essay|in your own words|justify|reflect|explain why|rubric|long answer/.test(q)) {
    return "essay_rubric";
  }
  if (/game challenge|super race|case challenge|sudoku|bingo|puzzle|riddle|gamified|game[-\s]*based/.test(q)) {
    return "gamified";
  }
  if (q.includes("____") && hasNoOptions) return "fill_blank";
  if (
    /\bworksheet\b|solve|compute|calculate|evaluate|balance equation|scientific method|hypothesis|lab/.test(
      q
    ) ||
    /[0-9]\s*[\+\-\*\/\^]\s*[0-9]/.test(q)
  ) {
    return "worksheet";
  }
  if (hasOptions) return "mcq";
  return "short_answer";
}

export function inferGamifiedMode(question: string): GamifiedMode {
  const q = String(question || "").toLowerCase();
  if (/\[sudoku\]|sudoku/.test(q)) return "sudoku";
  if (/\[super_race\]|\[super race\]|super race/.test(q)) return "bingo";
  if (/\[case_challenge\]|\[case challenge\]|case challenge/.test(q)) return "bingo";
  if (/\[bingo\]|bingo/.test(q)) return "bingo";
  return "puzzle";
}
