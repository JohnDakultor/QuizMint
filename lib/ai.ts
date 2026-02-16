
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


interface OpenRouterResponse {
  choices: { message: { content: string } }[];
}


export async function generateQuizAI(
  text: string,
  difficulty: string,
  adaptiveLearning: boolean,
  isProOrPremium: boolean,
  userPrompt: string = "" 
) {
  const difficultyPrompt =
    difficulty === "easy"
      ? "Make the questions easy and straightforward."
      : difficulty === "medium"
      ? "Make the questions moderately challenging."
      : "Make the questions difficult and thought-provoking.";

  const adaptivePrompt = adaptiveLearning
    ? "Include adaptive learning hints and explanations for each question."
    : "";

  // Check if the text looks like a prompt/instruction vs actual content
  const isPromptLike = text.length < 500 && 
    (text.includes("create") || 
     text.includes("generate") || 
     text.includes("make") || 
     text.includes("quiz about") ||
     text.split(' ').length < 100); // Short text is likely a prompt

  const systemPrompt = `
You are Quizmints AI, a quiz generator.

${isPromptLike ? 
  // When user gives a prompt (e.g., "create me a quiz about plants")
  `The user has provided a topic or prompt. Generate a quiz about: "${text}"
  - Use general knowledge about this topic
  - Create relevant and educational questions
  - Ensure questions are factual and accurate` : 
  // When user provides actual content
  `Use ONLY the following content to create a quiz. DO NOT invent content.
  - Questions must be directly based on the provided content
  - Do not add external knowledge not in the content`}

RULES:
- Generate exactly 10 questions unless otherwise specified
- Each question must have exactly 4 options
- Only ONE option must be correct
- Options must be clear and distinct
- Ensure the answer exists in the options
- Strictly follow the user's directions about topic and question types.
- If the user specifies question types (e.g., multiple choice, true/false, fill in the blanks), include all requested types.
- If the user specifies a number of items, match it exactly.

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
      "options": ["string", "string", "string", "string"],
      "answer": "string",
      "explanation": "string",
      "hint": "string"
    }
  ]
}
`;

  const finalUserPrompt = isPromptLike 
    ? `Generate a quiz about: ${text}
       Difficulty: ${difficultyPrompt}
       ${adaptivePrompt}
       ${userPrompt ? `User Instructions (must follow): ${userPrompt}` : ''}`
    : `Content to base quiz on:
       ${text}
       
       Difficulty: ${difficultyPrompt}
       Adaptive: ${adaptivePrompt}
       ${userPrompt ? `User Instructions (must follow): ${userPrompt}` : ''}`;

  const modelToUse = isProOrPremium
    ? process.env.OPENROUTER_MODEL_PRO ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera"
    : process.env.OPENROUTER_MODEL_FREE ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera";

  const fallbackModel =
    process.env.OPENROUTER_FALLBACK_MODEL || "openai/gpt-4o-mini";

  const callOpenRouter = async (model: string) => {
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
            { role: "user", content: finalUserPrompt },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
      }
    );

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error("AI response failed: " + responseText);
    }

    let data: OpenRouterResponse | null = null;
    try {
      data = JSON.parse(responseText) as OpenRouterResponse;
    } catch (err) {
      throw new Error("AI response not JSON: " + responseText.slice(0, 300));
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!raw) {
      throw new Error(
        "AI returned empty content: " + responseText.slice(0, 300)
      );
    }
    return raw;
  };

  let raw = await callOpenRouter(modelToUse);

  console.log("🤖 AI Raw Response:", raw.substring(0, 500)); // Add logging

  let parsed: any | null = null;
  try {
    parsed = safeExtractJSON(raw);
  } catch {
    // Retry once with a more reliable model for JSON outputs
    raw = await callOpenRouter(fallbackModel);
    console.log("🤖 AI Raw Response (fallback):", raw.substring(0, 500));
    parsed = safeExtractJSON(raw);
  }

  if (!parsed) throw new Error("AI did not return valid JSON");

  console.log("🤖 AI Parsed Response:", {
    title: parsed.title,
    questionCount: parsed.questions?.length || 0,
    hasQuestions: !!parsed.questions && parsed.questions.length > 0
  });

  return parsed;
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
      console.error("Failed to extract JSON from AI response");
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
