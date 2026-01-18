
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

  const systemPrompt = `
You are a strict quiz generator. ONLY use the content provided.
Do NOT add any information not in the content.
Always generate 10 questions with 4 options each if the user did not specify.
Be able to generate maximum of 50 questions with 4 options each if user specify.
Return ONLY JSON in this format:
{
  "title": "string",
  "instructions": "string",
  "questions": [
    {
      "question": "string",
      "options": ["A","B","C","D"],
      "answer": "string",
      "explanation": "string",
      "hint": "string"
    }
  ]
}
`;

  const finalUserPrompt = `
Use ONLY the following content to create a quiz. DO NOT invent content.
Difficulty: ${difficultyPrompt}
Adaptive: ${adaptivePrompt}
User Instructions: ${userPrompt}

Content:
${text}
`;

  const modelToUse = isProOrPremium
    ? "tngtech/deepseek-r1t2-chimera:free"
    : "tngtech/deepseek-r1t-chimera:free";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelToUse,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalUserPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error("AI response failed: " + errorData);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const raw = data?.choices?.[0]?.message?.content || "";

  const parsed = safeExtractJSON(raw);
  if (!parsed) throw new Error("AI did not return valid JSON");

  return parsed;
}

// Safely extract JSON even if AI adds garbage
function safeExtractJSON(raw: string) {
  const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  const jsonString = cleaned.substring(first, last + 1);
  try {
    return JSON.parse(jsonString);
  } catch {
    return attemptJSONRepair(jsonString);
  }
}

// Automatic JSON repair
function attemptJSONRepair(jsonString: string) {
  let repaired = jsonString;
  repaired = repaired.replace(/,\s*([\]}])/g, "$1"); // remove trailing commas
  repaired = repaired.replace(/[“”]/g, '"'); // fix smart quotes
  repaired = repaired.replace(/\/\/.*$/gm, ""); // remove comments
  try {
    return JSON.parse(repaired);
  } catch {
    throw new Error("AI returned irreparable JSON");
  }
}
