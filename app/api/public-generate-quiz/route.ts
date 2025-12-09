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
    let sessionId = req.cookies.get("publicSessionId")?.value;
    const ip = await getClientIp(req);

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
      const newReset = new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
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
    const { text } = await req.json();
    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Call AI API (your existing code)
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://quizmint.ai",
        "X-Title": "QuizMint AI",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tngtech/deepseek-r1t2-chimera:free",
        messages: [
          {
            role: "system",
            content:
              "You are an AI that generates quizzes from text. Always return output strictly in JSON format, never in paragraphs. Format:\n" +
              '{ "title": string, "instructions": string, "questions": [ { "question": string, "options": [string], "answer": string } ] }',
          },
          { role: "user", content: text },
        ],
      }),
    });

    const data = await aiResponse.json();
    let quiz = null;
    try {
      const raw = data?.choices?.[0]?.message?.content ?? null;
      if (raw) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) quiz = JSON.parse(match[0]);
        else console.error("No JSON found in AI response");
      }
    } catch (err) {
      console.error("Failed to parse AI quiz JSON:", err);
    }

    // Increment usage
    const newCount = usage.count + 1;
    const updatedUsage = await prisma.publicUsage.update({
      where: { id: usage.id },
      data: {
        count: newCount,
        resetAt: newCount >= FREE_LIMIT ? new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000) : null,
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
