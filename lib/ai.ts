
// interface OpenRouterResponse {
//   choices: { message: { content: string } }[];
// }



// export async function generateQuizAI(
//   text: string,
//   difficulty: string,
//   adaptiveLearning: boolean,
//   isProOrPremium: boolean,
//   userPrompt: string = "" 
// ) {
//   const difficultyPrompt =
//     difficulty === "easy"
//       ? "Make the questions easy and straightforward."
//       : difficulty === "medium"
//       ? "Make the questions moderately challenging."
//       : "Make the questions difficult and thought-provoking.";

//   const adaptivePrompt = adaptiveLearning
//     ? "Include adaptive learning hints and explanations for each question."
//     : "";


// const systemPrompt = `
// You are Quizmints AI, a strict and deterministic quiz generator.

// RULES (NON-NEGOTIABLE):
// - Use ONLY the content explicitly provided by the user.
// - DO NOT infer, assume, expand, or add external knowledge.
// - If the content is insufficient to generate a meaningful question, skip it.
// - DO NOT invent options or examples not in the content.
// - DO NOT reference slides, step numbers, page numbers, or any meta content.
// - DO NOT use placeholder options like "Example 1".
// - Do NOT use placeholder text like "Example 1, Example 2."
// - Questions must be relevant, clear, and answerable from the content.

// QUESTION COUNT:
// - Default: Generate exactly 10 questions.
// - If the user specifies a number (N): Generate exactly N questions.
// - Maximum allowed questions: 50.
// - Minimum allowed questions: 1.

// QUESTION FORMAT:
// - Each question must have exactly 4 options.
// - Options must be explicitly derived from the content.
// - Options must be unique, plausible, and clearly distinguishable.
// - Only ONE option must be correct.
// - Do NOT use placeholder text like "Example 1, Example 2."
// - Skip questions that cannot meet these requirements.

// OUTPUT FORMAT:
// - Return ONLY valid JSON.
// - Do NOT include markdown, comments, or extra text.
// - Do NOT wrap the JSON in code blocks.

// JSON SCHEMA (MUST MATCH EXACTLY):
// {
//   "title": "string",
//   "instructions": "string",
//   "questions": [
//     {
//       "question": "string",
//       "options": ["string", "string", "string", "string"],
//       "answer": "string",
//       "explanation": "string",
//       "hint": "string"
//     }
//   ]
// }

// VALIDATION:
// - Ensure the answer exists in the options.
// - Ensure all options are taken directly from the content.
// - Do not invent content, options, or answers.
// - Ensure the question count matches the requested number.
// `;


//   const finalUserPrompt = `
// Use ONLY the following content to create a quiz. DO NOT invent content.
// Difficulty: ${difficultyPrompt}
// Adaptive: ${adaptivePrompt}
// User Instructions: ${userPrompt}

// Content:
// ${text}
// `;

//   const modelToUse = isProOrPremium
//     ? "tngtech/deepseek-r1t2-chimera:free"
//     : "tngtech/deepseek-r1t-chimera:free";

//   const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: modelToUse,
//       response_format: { type: "json_object" },
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: finalUserPrompt },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     const errorData = await response.text();
//     throw new Error("AI response failed: " + errorData);
//   }

//   const data = (await response.json()) as OpenRouterResponse;
//   const raw = data?.choices?.[0]?.message?.content || "";

//   const parsed = safeExtractJSON(raw);
//   if (!parsed) throw new Error("AI did not return valid JSON");

//   return parsed;
// }

// // Safely extract JSON even if AI adds garbage
// function safeExtractJSON(raw: string) {
//   const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
//   const first = cleaned.indexOf("{");
//   const last = cleaned.lastIndexOf("}");
//   if (first === -1 || last === -1) return null;
//   const jsonString = cleaned.substring(first, last + 1);
//   try {
//     return JSON.parse(jsonString);
//   } catch {
//     return attemptJSONRepair(jsonString);
//   }
// }

// // Automatic JSON repair
// function attemptJSONRepair(jsonString: string) {
//   let repaired = jsonString;
//   repaired = repaired.replace(/,\s*([\]}])/g, "$1"); // remove trailing commas
//   repaired = repaired.replace(/[“”]/g, '"'); // fix smart quotes
//   repaired = repaired.replace(/\/\/.*$/gm, ""); // remove comments
//   try {
//     return JSON.parse(repaired);
//   } catch {
//     throw new Error("AI returned irreparable JSON");
//   }
// }

import { estimateOpenRouterCost, extractOpenRouterUsage } from "@/lib/unit-economics";
import { log } from "@/lib/logger";
import type { GamifiedMode } from "@/lib/quiz-question-types";

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
  provider?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

type QuestionTypePlan = {
  totalCount: number;
  includeMCQ: boolean;
  includeTrueFalse: boolean;
  includeFillBlank: boolean;
  includeShortAnswer: boolean;
  includeMatching: boolean;
  includeEssayRubric: boolean;
  includeWorksheet: boolean;
  includeGamified: boolean;
  mcqTarget: number;
  trueFalseTarget: number;
  fillBlankTarget: number;
  shortAnswerTarget: number;
  matchingTarget: number;
  essayRubricTarget: number;
  worksheetTarget: number;
  gamifiedTarget: number;
};

export type QuizQuestionMixInput = {
  mcq?: number;
  trueFalse?: number;
  fillBlank?: number;
  shortAnswer?: number;
  matching?: number;
  essayRubric?: number;
  worksheet?: number;
  gamified?: number;
};

export type QuizAIGenerationMeta = {
  retryCount: number;
  fallbackUsed: boolean;
  finalModel: string;
  finalProvider: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type QuizAIGenerationResult = {
  quiz: any;
  meta: QuizAIGenerationMeta;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractProviderFromPayload(payload: string): string | null {
  try {
    const parsed = JSON.parse(payload) as any;
    if (typeof parsed?.provider === "string") return parsed.provider;
    if (typeof parsed?.provider_name === "string") return parsed.provider_name;
    if (typeof parsed?.error?.provider === "string") return parsed.error.provider;
    if (typeof parsed?.error?.metadata?.provider_name === "string") {
      return parsed.error.metadata.provider_name;
    }
  } catch {
    const match = payload.match(/"provider_name"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return match[1];
  }
  return null;
}


export async function generateQuizAIWithMeta(
  text: string,
  difficulty: string,
  adaptiveLearning: boolean,
  isProOrPremium: boolean,
  userPrompt: string = "",
  options?: {
    liteMode?: boolean;
    questionMix?: QuizQuestionMixInput | null;
    gamifiedMode?: GamifiedMode | null;
  }
): Promise<QuizAIGenerationResult> {
  const difficultyPrompt =
    difficulty === "easy"
      ? "Make the questions easy and straightforward."
      : difficulty === "medium"
      ? "Make the questions moderately challenging."
      : "Make the questions difficult and thought-provoking.";

  const adaptivePrompt = adaptiveLearning
    ? "Include adaptive learning hints and explanations for each question."
    : "";

  const requestTopic = (userPrompt || text || "").trim();
  const typePlan = buildQuestionTypePlan(requestTopic, options?.questionMix ?? null);
  const hasRetrievedContext =
    /Context:/i.test(text) ||
    /User request:/i.test(text) ||
    /Use the following context/i.test(text);

  // Check if the text looks like a prompt/instruction vs actual content
  const isPromptLike = text.length < 500 && 
    (text.includes("create") || 
     text.includes("generate") || 
     text.includes("make") || 
     text.includes("quiz about") ||
     text.split(' ').length < 100); // Short text is likely a prompt
  const gamifiedMode = options?.gamifiedMode || "puzzle";

  const systemPrompt = `
You are Quizmints AI, a quiz generator.

PRIMARY INTENT (MUST FOLLOW):
- The user's topic/request is: "${requestTopic}"
- Keep questions centered on this request.
- If retrieved context is unrelated to this topic, IGNORE that context.

${isPromptLike ? 
  // When user gives a prompt (e.g., "create me a quiz about plants")
  `The user has provided a topic or prompt. Generate a quiz about: "${requestTopic}"
  - Use general knowledge about this topic
  - Create relevant and educational questions
  - Ensure questions are factual and accurate` : 
  // When user provides actual content
  `Use provided content to create a quiz, but prioritize the user's requested topic.
  ${hasRetrievedContext ? "- Retrieved context is OPTIONAL and only valid if it directly matches the user's topic." : ""}
  - Questions must be directly based on the provided content
  - Do not add external knowledge not in the content`}

RULES:
- Generate exactly ${typePlan.totalCount} questions
- Only ONE option must be correct
- Options must be clear and distinct
- Ensure the answer exists in the options
- Strictly follow the user's directions about topic and question types.
- If the user specifies question types (e.g., multiple choice, true/false, fill in the blanks), include all requested types.
- If the user specifies a number of items, match it exactly.
- Required type mix:
  - Multiple choice (MCQ): ${typePlan.mcqTarget}
  - True/False: ${typePlan.trueFalseTarget}
  - Fill in the Blank: ${typePlan.fillBlankTarget}
  - Short Answer: ${typePlan.shortAnswerTarget}
  - Matching: ${typePlan.matchingTarget}
  - Essay with Rubric: ${typePlan.essayRubricTarget}
  - Worksheet (subject-based): ${typePlan.worksheetTarget}
  - Gamified (Bingo/Sudoku/Puzzle): ${typePlan.gamifiedTarget}
- For MCQ:
  - Exactly 4 options per question.
- For True/False:
  - Options must be exactly ["True", "False"].
  - Answer must be exactly "True" or "False".
  - Prefix question text with "True or False:".
- For Fill in the Blank:
  - Use a blank marker in the question like "____".
  - Options must be an empty array [].
  - Answer should be the exact missing word/phrase.
- For Short Answer:
  - Options must be an empty array [].
  - Answer must be a concise expected answer key (1-2 lines max).
  - Do NOT use "____" in the question.
- For Matching:
  - Options must be an empty array [].
  - Question should clearly ask to match pairs.
  - Answer must list key pairs in plain text lines (e.g., "A -> 1; B -> 2").
- For Essay with Rubric:
  - Options must be an empty array [].
  - Question should be open-ended.
  - Answer must provide a concise model response + scoring criteria hint.
- For Worksheet (subject-based):
  - Options must be an empty array [].
  - Question can be math, science, chemistry, or other subject worksheet style.
  - Answer must provide the expected final response (value, term, formula, or short result).
- For Gamified:
  - Can be MCQ-style with 4 options OR open-answer with options [].
  - Keep puzzle/game context but still objectively answerable.
  - Use the selected game style: ${gamifiedMode.toUpperCase()}.
  - The question text MUST start with "Game Challenge [${gamifiedMode.toUpperCase()}]:" so renderer can detect it reliably.

Difficulty: ${difficultyPrompt}
${adaptivePrompt}

QUESTION COUNT:
- Default: Generate exactly 10 questions.
- If the user specifies a number (N): Generate exactly N questions.
- Maximum allowed questions: 50.
- Minimum allowed questions: 1.

OUTPUT FORMAT:
- Return ONLY valid JSON.
- Do NOT include markdown, comments, or extra text.

JSON SCHEMA (MUST MATCH EXACTLY):
{
  "title": "string",
  "instructions": "string",
  "questions": [
    {
      "question": "string",
      "options": ["string"],
      "answer": "string",
      "explanation": "string",
      "hint": "string"
    }
  ]
}
`;

  const finalUserPrompt = isPromptLike 
    ? `Generate a quiz about: ${requestTopic}
       Difficulty: ${difficultyPrompt}
       ${adaptivePrompt}
       Required type mix (must match exactly):
       - MCQ: ${typePlan.mcqTarget}
       - True/False: ${typePlan.trueFalseTarget}
       - Fill in the Blank: ${typePlan.fillBlankTarget}
       - Short Answer: ${typePlan.shortAnswerTarget}
       - Matching: ${typePlan.matchingTarget}
       - Essay with Rubric: ${typePlan.essayRubricTarget}
       - Worksheet (subject-based): ${typePlan.worksheetTarget}
       - Gamified: ${typePlan.gamifiedTarget}
       ${userPrompt ? `User Instructions (must follow): ${userPrompt}` : ''}`
    : `Content to base quiz on:
       ${text}
       
       Difficulty: ${difficultyPrompt}
       Adaptive: ${adaptivePrompt}
       Required type mix (must match exactly):
       - MCQ: ${typePlan.mcqTarget}
       - True/False: ${typePlan.trueFalseTarget}
       - Fill in the Blank: ${typePlan.fillBlankTarget}
       - Short Answer: ${typePlan.shortAnswerTarget}
       - Matching: ${typePlan.matchingTarget}
       - Essay with Rubric: ${typePlan.essayRubricTarget}
       - Worksheet (subject-based): ${typePlan.worksheetTarget}
       - Gamified: ${typePlan.gamifiedTarget}
       ${userPrompt ? `User Instructions (must follow): ${userPrompt}` : ''}
       Primary Topic (must dominate output): ${requestTopic}`;

  const modelToUse = isProOrPremium
    ? process.env.OPENROUTER_MODEL_PRO ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera"
    : process.env.OPENROUTER_MODEL_FREE ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera";

  const fallbackModel =
    process.env.OPENROUTER_FALLBACK_MODEL || "openai/gpt-4o-mini";

  let retryCount = 0;
  let fallbackUsed = false;
  let finalModel = modelToUse;
  let finalProvider: string | null = null;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let estimatedCostUsd = 0;

  const maxTokens = options?.liteMode
    ? Number(process.env.QUIZ_MAX_TOKENS_LITE || 2200)
    : 4000;

  const callOpenRouter = async (model: string, extraUserInstruction = "") => {
    const maxRetries = 2;
    let attempt = 0;

    while (true) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost",
            "X-Title": "QuizMint Quiz Generator",
          },
          body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: extraUserInstruction
                  ? `${finalUserPrompt}\n\n${extraUserInstruction}`
                  : finalUserPrompt,
              },
            ],
            temperature: 0.2,
            max_tokens: maxTokens,
          }),
        }
      );

      const responseText = await response.text();
      if (!response.ok) {
        const payloadCodeMatch = responseText.match(/"code"\s*:\s*(\d{3})/);
        const payloadCode = payloadCodeMatch ? Number(payloadCodeMatch[1]) : null;
        const retryableStatus = new Set([429, 500, 502, 503, 504]);
        const shouldRetry =
          retryableStatus.has(response.status) ||
          (payloadCode !== null && retryableStatus.has(payloadCode));

        if (shouldRetry && attempt < maxRetries) {
          attempt += 1;
          retryCount += 1;
          await delay(500 * attempt);
          continue;
        }

        const provider = extractProviderFromPayload(responseText);
        if (provider) finalProvider = provider;
        throw new Error("AI response failed: " + responseText);
      }

      let data: OpenRouterResponse | null = null;
      try {
        data = JSON.parse(responseText) as OpenRouterResponse;
      } catch {
        throw new Error("AI response not JSON: " + responseText.slice(0, 300));
      }

      finalModel = model;
      finalProvider = data?.provider || extractProviderFromPayload(responseText);

      const raw = data?.choices?.[0]?.message?.content?.trim() || "";
      if (!raw) {
        throw new Error(
          "AI returned empty content: " + responseText.slice(0, 300)
        );
      }
      const usage = extractOpenRouterUsage(data);
      const cost = usage ? estimateOpenRouterCost(model, usage) : null;
      return {
        raw,
        usage,
        cost,
      };
    }
  };

  let raw = "";
  try {
    const aiCall = await callOpenRouter(modelToUse);
    raw = aiCall.raw;
    if (aiCall.usage) {
      promptTokens += aiCall.usage.promptTokens;
      completionTokens += aiCall.usage.completionTokens;
      totalTokens += aiCall.usage.totalTokens;
    }
    if (aiCall.cost) {
      estimatedCostUsd += aiCall.cost.estimatedCostUsd;
    }
  } catch (primaryErr) {
    if (fallbackModel && fallbackModel !== modelToUse) {
      fallbackUsed = true;
      const aiCall = await callOpenRouter(fallbackModel);
      raw = aiCall.raw;
      if (aiCall.usage) {
        promptTokens += aiCall.usage.promptTokens;
        completionTokens += aiCall.usage.completionTokens;
        totalTokens += aiCall.usage.totalTokens;
      }
      if (aiCall.cost) {
        estimatedCostUsd += aiCall.cost.estimatedCostUsd;
      }
    } else {
      throw primaryErr;
    }
  }

  log.debug("quiz_ai_raw_response", { rawChars: raw.length, preview: raw.substring(0, 300) });

  let parsed: any | null = null;
  try {
    parsed = safeExtractJSON(raw);
  } catch {
    // Retry once with a more reliable model for JSON outputs
    fallbackUsed = true;
    const aiCall = await callOpenRouter(fallbackModel);
    raw = aiCall.raw;
    if (aiCall.usage) {
      promptTokens += aiCall.usage.promptTokens;
      completionTokens += aiCall.usage.completionTokens;
      totalTokens += aiCall.usage.totalTokens;
    }
    if (aiCall.cost) {
      estimatedCostUsd += aiCall.cost.estimatedCostUsd;
    }
    log.debug("quiz_ai_raw_response_fallback", { rawChars: raw.length, preview: raw.substring(0, 300) });
    parsed = safeExtractJSON(raw);
  }

  if (!parsed) throw new Error("AI did not return valid JSON");

  if (!meetsQuestionTypePlan(parsed, typePlan)) {
    const strictMixInstruction = `RETRY WITH STRICT COMPLIANCE:
- Generate exactly ${typePlan.totalCount} questions.
- Include exactly ${typePlan.mcqTarget} MCQ, ${typePlan.trueFalseTarget} True/False, ${typePlan.fillBlankTarget} Fill in the Blank, and ${typePlan.shortAnswerTarget} Short Answer questions.
- Include exactly ${typePlan.matchingTarget} Matching, ${typePlan.essayRubricTarget} Essay with Rubric, ${typePlan.worksheetTarget} Worksheet (subject-based), and ${typePlan.gamifiedTarget} Gamified questions.
- MCQ must have exactly 4 options.
- True/False must have exactly options ["True","False"] and answers only "True" or "False".
- Fill in the Blank must include "____" in the question, use options [], and provide the missing term as answer.
- Short Answer must use options [] and provide a concise answer key.
- Matching must use options [] and provide pair mappings in answer text.
- Essay with Rubric must use options [] and provide a concise model answer/rubric hint.
- Worksheet (subject-based) must use options [] and provide the expected final answer.
- Gamified can use 4 options or options [] but must be objectively gradable.
- Gamified questions must include the prefix "Game Challenge [${gamifiedMode.toUpperCase()}]:" in the question text.
- Return JSON only.`;

    try {
      const aiCall = await callOpenRouter(modelToUse, strictMixInstruction);
      raw = aiCall.raw;
      if (aiCall.usage) {
        promptTokens += aiCall.usage.promptTokens;
        completionTokens += aiCall.usage.completionTokens;
        totalTokens += aiCall.usage.totalTokens;
      }
      if (aiCall.cost) {
        estimatedCostUsd += aiCall.cost.estimatedCostUsd;
      }
      parsed = safeExtractJSON(raw);
    } catch {
      fallbackUsed = true;
      const aiCall = await callOpenRouter(fallbackModel, strictMixInstruction);
      raw = aiCall.raw;
      if (aiCall.usage) {
        promptTokens += aiCall.usage.promptTokens;
        completionTokens += aiCall.usage.completionTokens;
        totalTokens += aiCall.usage.totalTokens;
      }
      if (aiCall.cost) {
        estimatedCostUsd += aiCall.cost.estimatedCostUsd;
      }
      parsed = safeExtractJSON(raw);
    }

    if (!parsed || !meetsQuestionTypePlan(parsed, typePlan)) {
      fallbackUsed = true;
      const aiCall = await callOpenRouter(fallbackModel, strictMixInstruction);
      raw = aiCall.raw;
      if (aiCall.usage) {
        promptTokens += aiCall.usage.promptTokens;
        completionTokens += aiCall.usage.completionTokens;
        totalTokens += aiCall.usage.totalTokens;
      }
      if (aiCall.cost) {
        estimatedCostUsd += aiCall.cost.estimatedCostUsd;
      }
      parsed = safeExtractJSON(raw);
    }
  }

  if (!parsed) throw new Error("AI did not return valid JSON");

  if (!meetsQuestionTypePlan(parsed, typePlan)) {
    let mergedQuestions = Array.isArray(parsed?.questions) ? [...parsed.questions] : [];

    for (let i = 0; i < 2; i++) {
      const { missing, totalMissing } = buildMissingMixFromQuestions(typePlan, mergedQuestions);
      if (totalMissing <= 0) break;

      const repairInstruction = `REPAIR MODE:
Generate ONLY the missing questions to complete this exact remaining mix:
- MCQ: ${missing.mcq}
- True/False: ${missing.trueFalse}
- Fill in the Blank: ${missing.fillBlank}
- Short Answer: ${missing.shortAnswer}
- Matching: ${missing.matching}
- Essay with Rubric: ${missing.essayRubric}
- Worksheet (subject-based): ${missing.worksheet}
- Gamified: ${missing.gamified}
Total missing: ${totalMissing}
Return strict JSON with title, instructions, and questions array only.`;

      try {
        const repairCall = await callOpenRouter(fallbackModel, repairInstruction);
        const supplement = safeExtractJSON(repairCall.raw);
        if (supplement && Array.isArray(supplement.questions)) {
          mergedQuestions = [...mergedQuestions, ...supplement.questions];
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    parsed.questions = normalizeQuestionsToPlan(typePlan, mergedQuestions);
  }

  if (!meetsQuestionTypePlan(parsed, typePlan)) {
    throw new Error(
      `AI returned invalid question set. Expected ${typePlan.totalCount} questions with requested type mix.`
    );
  }

  log.info("quiz_ai_parsed_response", {
    title: parsed.title,
    questionCount: parsed.questions?.length || 0,
    hasQuestions: !!parsed.questions && parsed.questions.length > 0
  });

  return {
    quiz: parsed,
    meta: {
      retryCount,
      fallbackUsed,
      finalModel,
      finalProvider,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
    },
  };
}

export async function generateQuizAI(
  text: string,
  difficulty: string,
  adaptiveLearning: boolean,
  isProOrPremium: boolean,
  userPrompt: string = "",
  options?: {
    liteMode?: boolean;
    questionMix?: QuizQuestionMixInput | null;
    gamifiedMode?: GamifiedMode | null;
  }
) {
  const result = await generateQuizAIWithMeta(
    text,
    difficulty,
    adaptiveLearning,
    isProOrPremium,
    userPrompt,
    options
  );
  return result.quiz;
}

function parseRequestedQuestionCount(normalizedRequest: string): number {
  const numericMatch = normalizedRequest.match(
    /(\d+)\s*[- ]?\s*(items?|item|questions?|question|qs?|qns?)(\b|$)/i
  );
  if (numericMatch?.[1]) {
    const parsed = Number.parseInt(numericMatch[1], 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  const leadingNumberIntentMatch = normalizedRequest.match(
    /\b(make|create|generate|build|give|provide)\b[\s\w]{0,25}\b(\d+)\b/i
  );
  if (leadingNumberIntentMatch?.[2]) {
    const parsed = Number.parseInt(leadingNumberIntentMatch[2], 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  const wordToNumber: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    twentyone: 21,
    twentytwo: 22,
    twentythree: 23,
    twentyfour: 24,
    twentyfive: 25,
    twentysix: 26,
    twentyseven: 27,
    twentyeight: 28,
    twentynine: 29,
    thirty: 30,
    forty: 40,
    fifty: 50,
  };

  const compact = normalizedRequest.replace(/[\s-]+/g, "");
  for (const [word, value] of Object.entries(wordToNumber)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(normalizedRequest) || compact.includes(word)) {
      return value;
    }
  }

  return 10;
}

function sanitizeMixValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function buildQuestionTypePlan(
  request: string,
  explicitMix?: QuizQuestionMixInput | null
): QuestionTypePlan {
  const normalized = request.toLowerCase().replace(/[^\w\s/.-]/g, " ");
  const requestedCount = parseRequestedQuestionCount(normalized);
  const explicitMcq = sanitizeMixValue(explicitMix?.mcq);
  const explicitTrueFalse = sanitizeMixValue(explicitMix?.trueFalse);
  const explicitFillBlank = sanitizeMixValue(explicitMix?.fillBlank);
  const explicitShortAnswer = sanitizeMixValue(explicitMix?.shortAnswer);
  const explicitMatching = sanitizeMixValue(explicitMix?.matching);
  const explicitEssayRubric = sanitizeMixValue(explicitMix?.essayRubric);
  const explicitWorksheet = sanitizeMixValue(
    explicitMix?.worksheet ?? (explicitMix as { worksheetMath?: number } | null)?.worksheetMath
  );
  const explicitGamified = sanitizeMixValue(explicitMix?.gamified);
  const explicitTotal =
    explicitMcq +
    explicitTrueFalse +
    explicitFillBlank +
    explicitShortAnswer +
    explicitMatching +
    explicitEssayRubric +
    explicitWorksheet +
    explicitGamified;
  const hasExplicitMix = explicitTotal > 0;
  const totalCount = Math.min(Math.max(requestedCount || 10, 1), 50);

  if (hasExplicitMix) {
    const cappedTotal = Math.min(explicitTotal, 50);
    let remaining = cappedTotal;
    const allocate = (v: number) => {
      const value = Math.min(Math.max(v, 0), remaining);
      remaining -= value;
      return value;
    };
    const mcqTarget = allocate(explicitMcq);
    const trueFalseTarget = allocate(explicitTrueFalse);
    const fillBlankTarget = allocate(explicitFillBlank);
    const shortAnswerTarget = allocate(explicitShortAnswer);
    const matchingTarget = allocate(explicitMatching);
    const essayRubricTarget = allocate(explicitEssayRubric);
    const worksheetTarget = allocate(explicitWorksheet);
    const gamifiedTarget = allocate(explicitGamified);
    const distributed =
      mcqTarget +
      trueFalseTarget +
      fillBlankTarget +
      shortAnswerTarget +
      matchingTarget +
      essayRubricTarget +
      worksheetTarget +
      gamifiedTarget;
    return {
      totalCount: distributed,
      includeMCQ: mcqTarget > 0,
      includeTrueFalse: trueFalseTarget > 0,
      includeFillBlank: fillBlankTarget > 0,
      includeShortAnswer: shortAnswerTarget > 0,
      includeMatching: matchingTarget > 0,
      includeEssayRubric: essayRubricTarget > 0,
      includeWorksheet: worksheetTarget > 0,
      includeGamified: gamifiedTarget > 0,
      mcqTarget,
      trueFalseTarget,
      fillBlankTarget,
      shortAnswerTarget,
      matchingTarget,
      essayRubricTarget,
      worksheetTarget,
      gamifiedTarget,
    };
  }

  const includeTrueFalse =
    /true\s*\/\s*false|true\s*or\s*false|\bt\/f\b|\btrue false\b|\btruefalse\b|\btf\b/i.test(normalized);
  const includeFillBlank =
    /fill\s*in\s*the\s*blank|fill[-\s]*in[-\s]*the[-\s]*blanks|\bfib\b|blanks?|identification|identify|completion|complete the sentence|short answer/i.test(normalized);
  const includeShortAnswer =
    /\bshort answer\b|open[-\s]*ended|long answer|explain why/i.test(
      normalized
    );
  const includeMatching = /\bmatching\b|match the following|pair the/i.test(normalized);
  const includeEssayRubric = /\bessay\b|rubric|in your own words|justify/i.test(normalized);
  const includeWorksheet =
    /\bworksheet\b|solve|calculate|compute|balance equation|scientific method|experiment|hypothesis|lab/i.test(
      normalized
    );
  const includeGamified = /\bgamified\b|bingo|sudoku|puzzle|game[-\s]*based/i.test(normalized);
  const requestedMixed =
    /\bmixed\b|\bmix\b|\bvaried\b|\bcombination\b|\ball types\b|\bdifferent types\b/i.test(normalized);
  const wantsTrueFalse = includeTrueFalse || requestedMixed;
  const wantsFillBlank = includeFillBlank || requestedMixed;
  const wantsShortAnswer = includeShortAnswer || requestedMixed;
  const wantsMatching = includeMatching || requestedMixed;
  const wantsEssayRubric = includeEssayRubric || requestedMixed;
  const wantsWorksheet = includeWorksheet || requestedMixed;
  const wantsGamified = includeGamified || requestedMixed;
  const includeMCQ =
    /multiple\s*choice|\bmcq\b|objective type|choose the best answer|single answer/i.test(normalized) ||
    requestedMixed ||
    (!wantsTrueFalse &&
      !wantsFillBlank &&
      !wantsShortAnswer &&
      !wantsMatching &&
      !wantsEssayRubric &&
      !wantsWorksheet &&
      !wantsGamified);

  const requestedTypeCount = [
    includeMCQ,
    wantsTrueFalse,
    wantsFillBlank,
    wantsShortAnswer,
    wantsMatching,
    wantsEssayRubric,
    wantsWorksheet,
    wantsGamified,
  ].filter(Boolean).length;
  const activeTypeCount = Math.max(requestedTypeCount, 1);
  const base = Math.floor(totalCount / activeTypeCount);
  let remainder = totalCount - base * activeTypeCount;

  const allocate = () => {
    const value = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return value;
  };

  const mcqTarget = includeMCQ ? allocate() : 0;
  const trueFalseTarget = wantsTrueFalse ? allocate() : 0;
  const fillBlankTarget = wantsFillBlank ? allocate() : 0;
  const shortAnswerTarget = wantsShortAnswer ? allocate() : 0;
  const matchingTarget = wantsMatching ? allocate() : 0;
  const essayRubricTarget = wantsEssayRubric ? allocate() : 0;
  const worksheetTarget = wantsWorksheet ? allocate() : 0;
  const gamifiedTarget = wantsGamified ? allocate() : 0;

  // Ensure exact total count (guard against rounding drift)
  const assigned =
    mcqTarget +
    trueFalseTarget +
    fillBlankTarget +
    shortAnswerTarget +
    matchingTarget +
    essayRubricTarget +
    worksheetTarget +
    gamifiedTarget;
  const drift = totalCount - assigned;
  const adjustedMcqTarget = mcqTarget + drift;

  return {
    totalCount,
    includeMCQ:
      includeMCQ ||
      (!wantsTrueFalse &&
        !wantsFillBlank &&
        !wantsShortAnswer &&
        !wantsMatching &&
        !wantsEssayRubric &&
        !wantsWorksheet &&
        !wantsGamified),
    includeTrueFalse: wantsTrueFalse,
    includeFillBlank: wantsFillBlank,
    includeShortAnswer: wantsShortAnswer,
    includeMatching: wantsMatching,
    includeEssayRubric: wantsEssayRubric,
    includeWorksheet: wantsWorksheet,
    includeGamified: wantsGamified,
    mcqTarget: Math.max(0, adjustedMcqTarget),
    trueFalseTarget,
    fillBlankTarget,
    shortAnswerTarget,
    matchingTarget,
    essayRubricTarget,
    worksheetTarget,
    gamifiedTarget,
  };
}

function isTrueFalseQuestion(question: any): boolean {
  if (!question || !Array.isArray(question.options)) return false;
  if (question.options.length !== 2) return false;
  const normalized = question.options.map((opt: string) =>
    String(opt || "").trim().toLowerCase()
  );
  const hasTrueFalseOptions =
    normalized.includes("true") && normalized.includes("false");
  const answer = String(question.answer || "").trim().toLowerCase();
  return hasTrueFalseOptions && (answer === "true" || answer === "false");
}

function isFillBlankQuestion(question: any): boolean {
  const questionText = String(question?.question || "");
  const hasBlank = questionText.includes("____");
  const options = Array.isArray(question?.options) ? question.options : null;
  const hasNoOptions = Array.isArray(options) && options.length === 0;
  const answer = String(question?.answer || "").trim();
  return hasBlank && hasNoOptions && answer.length > 0;
}

function isShortAnswerQuestion(question: any): boolean {
  const questionText = String(question?.question || "");
  if (!questionText.trim()) return false;
  const hasBlank = questionText.includes("____");
  if (hasBlank) return false;
  const options = Array.isArray(question?.options) ? question.options : null;
  const hasNoOptions = Array.isArray(options) && options.length === 0;
  const answer = String(question?.answer || "").trim();
  return hasNoOptions && answer.length > 0;
}

function isMatchingQuestion(question: any): boolean {
  const questionText = String(question?.question || "").toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  const answer = String(question?.answer || "").trim();
  return (
    options.length === 0 &&
    answer.length > 0 &&
    /matching|match the following|pair/.test(questionText)
  );
}

function isEssayRubricQuestion(question: any): boolean {
  const questionText = String(question?.question || "").toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  const answer = String(question?.answer || "").trim();
  return (
    options.length === 0 &&
    answer.length > 0 &&
    (/essay|in your own words|justify|reflect|explain/.test(questionText) ||
      /rubric|criteria/.test(answer.toLowerCase()))
  );
}

function isWorksheetQuestion(question: any): boolean {
  const questionText = String(question?.question || "").toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  const answer = String(question?.answer || "").trim();
  return (
    options.length === 0 &&
    answer.length > 0 &&
    (/solve|calculate|simplify|balance|equation|algebra|math|chem/.test(questionText) ||
      /[0-9]\s*[\+\-\*\/\^]\s*[0-9]/.test(questionText))
  );
}

function isGamifiedQuestion(question: any): boolean {
  const questionText = String(question?.question || "").toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  const answer = String(question?.answer || "").trim();
  if (!answer) return false;
  const hasGameSignal = /bingo|sudoku|puzzle|riddle|game|gamified/.test(questionText);
  if (!hasGameSignal) return false;
  return options.length === 0 || options.length === 4;
}

function meetsQuestionTypePlan(parsed: any, plan: QuestionTypePlan): boolean {
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (questions.length !== plan.totalCount) return false;

  let trueFalseCount = 0;
  let mcqCount = 0;
  let fillBlankCount = 0;
  let shortAnswerCount = 0;
  let matchingCount = 0;
  let essayRubricCount = 0;
  let worksheetCount = 0;
  let gamifiedCount = 0;
  for (const q of questions) {
    if (isTrueFalseQuestion(q)) {
      trueFalseCount += 1;
    } else if (isFillBlankQuestion(q)) {
      fillBlankCount += 1;
    } else if (isMatchingQuestion(q)) {
      matchingCount += 1;
    } else if (isEssayRubricQuestion(q)) {
      essayRubricCount += 1;
    } else if (isWorksheetQuestion(q)) {
      worksheetCount += 1;
    } else if (isGamifiedQuestion(q)) {
      gamifiedCount += 1;
    } else if (isShortAnswerQuestion(q)) {
      shortAnswerCount += 1;
    } else if (Array.isArray(q?.options) && q.options.length === 4) {
      mcqCount += 1;
    }
  }

  return (
    trueFalseCount === plan.trueFalseTarget &&
    mcqCount === plan.mcqTarget &&
    fillBlankCount === plan.fillBlankTarget &&
    shortAnswerCount === plan.shortAnswerTarget &&
    matchingCount === plan.matchingTarget &&
    essayRubricCount === plan.essayRubricTarget &&
    worksheetCount === plan.worksheetTarget &&
    gamifiedCount === plan.gamifiedTarget
  );
}

type PlanTypeKey =
  | "mcq"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  | "matching"
  | "essay_rubric"
  | "worksheet"
  | "gamified";

function detectPlanType(question: any): PlanTypeKey {
  if (isTrueFalseQuestion(question)) return "true_false";
  if (isFillBlankQuestion(question)) return "fill_blank";
  if (isMatchingQuestion(question)) return "matching";
  if (isEssayRubricQuestion(question)) return "essay_rubric";
  if (isWorksheetQuestion(question)) return "worksheet";
  if (isGamifiedQuestion(question)) return "gamified";
  if (isShortAnswerQuestion(question)) return "short_answer";
  return "mcq";
}

function getTargetForType(plan: QuestionTypePlan, type: PlanTypeKey): number {
  switch (type) {
    case "mcq":
      return plan.mcqTarget;
    case "true_false":
      return plan.trueFalseTarget;
    case "fill_blank":
      return plan.fillBlankTarget;
    case "short_answer":
      return plan.shortAnswerTarget;
    case "matching":
      return plan.matchingTarget;
    case "essay_rubric":
      return plan.essayRubricTarget;
    case "worksheet":
      return plan.worksheetTarget;
    case "gamified":
      return plan.gamifiedTarget;
    default:
      return 0;
  }
}

function buildMissingMixFromQuestions(plan: QuestionTypePlan, questions: any[]) {
  const counts: Record<PlanTypeKey, number> = {
    mcq: 0,
    true_false: 0,
    fill_blank: 0,
    short_answer: 0,
    matching: 0,
    essay_rubric: 0,
    worksheet: 0,
    gamified: 0,
  };
  for (const q of questions) {
    counts[detectPlanType(q)] += 1;
  }

  const missing = {
    mcq: Math.max(plan.mcqTarget - counts.mcq, 0),
    trueFalse: Math.max(plan.trueFalseTarget - counts.true_false, 0),
    fillBlank: Math.max(plan.fillBlankTarget - counts.fill_blank, 0),
    shortAnswer: Math.max(plan.shortAnswerTarget - counts.short_answer, 0),
    matching: Math.max(plan.matchingTarget - counts.matching, 0),
    essayRubric: Math.max(plan.essayRubricTarget - counts.essay_rubric, 0),
    worksheet: Math.max(plan.worksheetTarget - counts.worksheet, 0),
    gamified: Math.max(plan.gamifiedTarget - counts.gamified, 0),
  };
  const totalMissing =
    missing.mcq +
    missing.trueFalse +
    missing.fillBlank +
    missing.shortAnswer +
    missing.matching +
    missing.essayRubric +
    missing.worksheet +
    missing.gamified;

  return { missing, totalMissing };
}

function normalizeQuestionsToPlan(plan: QuestionTypePlan, questions: any[]) {
  const buckets: Record<PlanTypeKey, any[]> = {
    mcq: [],
    true_false: [],
    fill_blank: [],
    short_answer: [],
    matching: [],
    essay_rubric: [],
    worksheet: [],
    gamified: [],
  };
  for (const q of questions) {
    buckets[detectPlanType(q)].push(q);
  }

  const ordered: PlanTypeKey[] = [
    "mcq",
    "true_false",
    "fill_blank",
    "short_answer",
    "matching",
    "essay_rubric",
    "worksheet",
    "gamified",
  ];
  const out: any[] = [];
  for (const key of ordered) {
    const needed = getTargetForType(plan, key);
    if (needed <= 0) continue;
    out.push(...buckets[key].slice(0, needed));
  }
  return out;
}

function safeExtractJSON(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/\u0000/g, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          return attemptJSONRepair(jsonMatch[0]);
        }
      }
    } catch (innerErr) {
      log.warn("quiz_ai_json_extract_failed");
    }
    throw new Error("No valid JSON found in response");
  }
}

function attemptJSONRepair(jsonString: string) {
  let repaired = jsonString;
  repaired = repaired.replace(/,\s*([\]}])/g, "$1");
  repaired = repaired.replace(/[“”]/g, '"');
  repaired = repaired.replace(/[‘’]/g, "'");
  repaired = repaired.replace(/\\n/g, "\n");
  repaired = repaired.replace(/\r\n/g, "\n");
  // If quotes are unbalanced, truncate trailing partial string
  const quoteCount = (repaired.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) {
    const lastQuote = repaired.lastIndexOf('"');
    if (lastQuote > -1) {
      repaired = repaired.slice(0, lastQuote + 1);
    }
  }
  // Balance braces/brackets if the model was cut off
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  if (closeBraces < openBraces) {
    repaired += "}".repeat(openBraces - closeBraces);
  }
  if (closeBrackets < openBrackets) {
    repaired += "]".repeat(openBrackets - closeBrackets);
  }
  try {
    return JSON.parse(repaired);
  } catch {
    throw new Error("No valid JSON found in response");
  }
}
