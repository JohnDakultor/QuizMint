// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { v4 as uuidv4 } from "uuid";

// const FREE_LIMIT = 3;
// const COOLDOWN_HOURS = 3;

// export async function GET(req: NextRequest) {
//   try {
//     // Get or create session ID
//     let sessionId = req.cookies.get("publicSessionId")?.value;
//     if (!sessionId) sessionId = uuidv4();

//     const now = new Date();

//     // Fetch usage
//     let usage = await prisma.publicUsage.findUnique({ where: { id: sessionId } });

//     // If no record, create it
//     if (!usage) {
//       usage = await prisma.publicUsage.create({
//         data: { id: sessionId, count: 0, resetAt: null },
//       });
//     }

//     // Reset count if cooldown has passed
//     if (usage.resetAt && usage.resetAt <= now) {
//       usage = await prisma.publicUsage.update({
//         where: { id: sessionId },
//         data: { count: 0, resetAt: null },
//       });
//     }

//     // Return usage info
//     const res = NextResponse.json({
//       count: usage.count,
//       remaining: Math.max(0, FREE_LIMIT - usage.count),
//       nextFreeAt: usage.resetAt,
//     });

//     // Set cookie if missing
//     res.cookies.set("publicSessionId", sessionId, {
//       httpOnly: true,
//       maxAge: 60 * 60 * 24 * 30,
//       path: "/",
//     });

//     return res;
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     // Get or create session ID
//     let sessionId = req.cookies.get("publicSessionId")?.value;
//     if (!sessionId) sessionId = uuidv4();

//     const now = new Date();

//     // Fetch usage
//     let usage = await prisma.publicUsage.findUnique({ where: { id: sessionId } });

//     if (!usage) {
//       usage = await prisma.publicUsage.create({
//         data: { id: sessionId, count: 0, resetAt: null },
//       });
//     }

//     // Reset count if cooldown passed
//     if (usage.resetAt && usage.resetAt <= now) {
//       usage = await prisma.publicUsage.update({
//         where: { id: sessionId },
//         data: { count: 0, resetAt: null },
//       });
//       usage.count = 0;
//       usage.resetAt = null;
//     }

//     // Check free limit
//     if (usage.count >= FREE_LIMIT) {
//       const newReset = new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
//       await prisma.publicUsage.update({
//         where: { id: sessionId },
//         data: { resetAt: newReset },
//       });

//       return NextResponse.json(
//         {
//           error: "You reached your free quiz limit.",
//           count: usage.count,
//           remaining: 0,
//           nextFreeAt: newReset,
//         },
//         { status: 403 }
//       );
//     }

//     // Get input text
//     const { text } = await req.json();
//     if (!text || text.trim() === "") {
//       return NextResponse.json({ error: "No text provided" }, { status: 400 });
//     }

//     // Call AI API
//     const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//         "HTTP-Referer": "https://quizmint.ai",
//         "X-Title": "QuizMint AI",
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "deepseek/deepseek-chat-v3.1:free",
//         messages: [
//           {
//             role: "system",
//             content:
//               "You are an AI that generates quizzes from text. Always return output strictly in JSON format, never in paragraphs. Format:\n" +
//               '{ "title": string, "instructions": string, "questions": [ { "question": string, "options": [string], "answer": string } ] }',
//           },
//           { role: "user", content: text },
//         ],
//       }),
//     });

//     const data = await aiResponse.json();
//     let quiz = null;
// try {
//   const raw = data?.choices?.[0]?.message?.content ?? null;
//   if (raw) {
//     // Extract JSON object from AI string
//     const match = raw.match(/\{[\s\S]*\}/);
//     if (match) {
//       quiz = JSON.parse(match[0]);
//     } else {
//       console.error("No JSON found in AI response");
//     }
//   }
// } catch (err) {
//   console.error("Failed to parse AI quiz JSON:", err);
// }

//     // Increment usage
//     const newCount = usage.count + 1;
//     const updatedUsage = await prisma.publicUsage.update({
//       where: { id: sessionId },
//       data: {
//         count: newCount,
//         resetAt: newCount >= FREE_LIMIT ? new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000) : null,
//       },
//     });

//     const res = NextResponse.json({
//       quiz,
//       usage: {
//         count: updatedUsage.count,
//         remaining: Math.max(0, FREE_LIMIT - updatedUsage.count),
//         nextFreeAt: updatedUsage.resetAt,
//       },
//     });

//     res.cookies.set("publicSessionId", sessionId, {
//       httpOnly: true,
//       maxAge: 60 * 60 * 24 * 30,
//       path: "/",
//     });

//     return res;
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { publicQuizRateLimit } from "@/lib/ratelimit";
import { verifyRecaptcha } from "@/lib/verifyRecaptcha";

const FREE_LIMIT = 3;
const COOLDOWN_HOURS = 3;

async function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim(); // take first IP
  }
  return "unknown";
}

export async function GET(req: NextRequest) {
  try {
    let sessionId = req.cookies.get("publicSessionId")?.value;
    const ip = await getClientIp(req);

    let usage = null;

    if (sessionId) {
      usage = await prisma.publicUsage.findUnique({ where: { id: sessionId } });
    }

    // If no session cookie or record, check IP
    if (!usage) {
      usage = await prisma.publicUsage.findFirst({ where: { ip } });
    }

    // If still no record, create new session with stricter limit
    if (!usage) {
      sessionId = uuidv4();
      usage = await prisma.publicUsage.create({
        data: { id: sessionId, ip, count: 0, resetAt: null },
      });
    }

    const now = new Date();

    // Reset count if cooldown passed
    if (usage.resetAt && usage.resetAt <= now) {
      usage = await prisma.publicUsage.update({
        where: { id: usage.id },
        data: { count: 0, resetAt: null },
      });
    }

    const res = NextResponse.json({
      count: usage.count,
      remaining: Math.max(0, FREE_LIMIT - usage.count),
      nextFreeAt: usage.resetAt,
    });

    // Set cookie if missing
    res.cookies.set("publicSessionId", usage.id, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { recaptchaToken, text } = body;

  if (!recaptchaToken) {
    return NextResponse.json(
      { error: "Missing recaptcha token" },
      { status: 400 }
    );
  }

  const captcha = await verifyRecaptcha(recaptchaToken);
  

  if (!captcha.success || captcha.score < 0.5) {
    return NextResponse.json(
      { error: "Bot activity detected" },
      { status: 403 }
    );
  }

  console.log("captcha result:", captcha);

   
    const ip = await getClientIp(req);

    const { success, reset, remaining } = await publicQuizRateLimit.limit(
      `public-quiz:${ip}`
    );

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait a moment before trying again.",
          remaining,
          resetAt: new Date(reset),
        },
        { status: 429 }
      );
    }

    let sessionId = req.cookies.get("publicSessionId")?.value;
    

    let usage = null;

    if (sessionId) {
      usage = await prisma.publicUsage.findUnique({ where: { id: sessionId } });
    }

    // Fallback: check IP if no session
    if (!usage) {
      usage = await prisma.publicUsage.findFirst({ where: { ip } });
    }

    const now = new Date();

    // If no record, create new
    if (!usage) {
      sessionId = uuidv4();
      usage = await prisma.publicUsage.create({
        data: { id: sessionId, ip, count: 0, resetAt: null },
      });
    }

    // Reset count if cooldown passed
    if (usage.resetAt && usage.resetAt <= now) {
      usage = await prisma.publicUsage.update({
        where: { id: usage.id },
        data: { count: 0, resetAt: null },
      });
      usage.count = 0;
      usage.resetAt = null;
    }

    // Check free limit
    if (usage.count >= FREE_LIMIT) {
      const newReset = new Date(
        now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000
      );
      await prisma.publicUsage.update({
        where: { id: usage.id },
        data: { resetAt: newReset },
      });

      return NextResponse.json(
        {
          error: "You reached your free quiz limit.",
          count: usage.count,
          remaining: 0,
          nextFreeAt: newReset,
        },
        { status: 403 }
      );
    }

    // Get input text
    
    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const systemPrompt = `
You are Quizmints AI (Demo Mode), an AI that generates sample quizzes from text.

STRICT RULES:
- Use ONLY the content provided by the user.
- DO NOT add, infer, or expand beyond the content.
- Keep output concise and suitable for a public demo.
- This is a preview experience, not a full quiz generator.

QUESTION COUNT:
- If the user specifies a number (N): Generate exactly N questions.
- If the user does NOT specify a number: Generate exactly 5 questions.
- Maximum allowed questions: 50.
- Minimum allowed questions: 1.
- If N exceeds 50, generate exactly 50 questions.

QUESTION TYPE:
- ONLY "multiple_choice" questions are allowed.
- Each question must have EXACTLY 4 options.
- Only ONE option may be correct.

OUTPUT FORMAT:
- Return ONLY valid JSON.
- No markdown, paragraphs, explanations, or extra text.
- Do NOT wrap the JSON in code blocks.

JSON SCHEMA (MUST MATCH EXACTLY):
{
  "title": "string",
  "instructions": "string",
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": "string"
    }
  ]
}

FIELD RULES:
- title: Short and simple summary derived ONLY from the content.
- instructions: One short sentence for quiz takers.
- question: Clear and beginner-friendly.
- options: Derived ONLY from the content.
- answer: Must exactly match one option.

VALIDATION:
- Ensure valid JSON.
- Ensure the number of questions matches the requested count (or capped at 50).
- Ensure each question has exactly 4 options.
- Ensure the answer exists in the options.
`;


    
    const model =
      process.env.OPENROUTER_MODEL_PUBLIC ||
      process.env.OPENROUTER_MODEL_FREE ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera";

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://quizmint.ai",
          "X-Title": "QuizMint AI",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
               systemPrompt
            },
            { role: "user", content: text },
          ],
        }),
      }
    );

    const data = await aiResponse.json();
    let quiz = null;
    try {
      const raw = data?.choices?.[0]?.message?.content ?? null;
      if (raw) {
        const parsed = safeExtractJSON(raw);
        if (parsed) quiz = parsed;
        else console.error("No JSON found in AI response");
      }
    } catch (err) {
      console.error("Failed to parse AI quiz JSON:", err);
    }

    if (!quiz) {
      return NextResponse.json(
        { error: "AI returned invalid quiz format." },
        { status: 502 }
      );
    }

    // Increment usage
    const newCount = usage.count + 1;
    const updatedUsage = await prisma.publicUsage.update({
      where: { id: usage.id },
      data: {
        count: newCount,
        resetAt:
          newCount >= FREE_LIMIT
            ? new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000)
            : null,
        ip, // update IP in case it changed
      },
    });

    const res = NextResponse.json({
      quiz,
      usage: {
        count: updatedUsage.count,
        remaining: Math.max(0, FREE_LIMIT - updatedUsage.count),
        nextFreeAt: updatedUsage.resetAt,
      },
    });

    res.cookies.set("publicSessionId", updatedUsage.id, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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

function attemptJSONRepair(jsonString: string) {
  let repaired = jsonString;
  repaired = repaired.replace(/,\s*([\]}])/g, "$1");
  repaired = repaired.replace(/[“”]/g, '"');
  repaired = repaired.replace(/\/\/.*$/gm, "");
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}
