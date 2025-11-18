// import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   try {
//     const { text } = await req.json();

//     if (!text) {
//       return NextResponse.json({ error: "No text provided" }, { status: 400 });
//     }

//     const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
//         "HTTP-Referer": "https://quizmint.ai", // optional — replace with your site URL
//         "X-Title": "QuizMint AI",
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "deepseek/deepseek-chat-v3.1:free", // ✅ Free DeepSeek model
//         messages: [
//           {
//             role: "system",
//              content:
//         "You are an AI that generates quizzes from text. Always return output strictly in JSON format, never in paragraphs. Format:\n" +
//         "{ \"title\": string, \"instructions\": string, \"questions\": [ { \"question\": string, \"options\": [string], \"answer\": string } ] }",
//           },
//           {
//             role: "user",
//             content: text,
//           },
//         ],
//       }),
//     });

//     if (!response.ok) {
//       const errorData = await response.json();
//       console.error("Error response from OpenRouter:", errorData);
//       return NextResponse.json(
//         { error: errorData.error?.message || "Failed to generate quiz" },
//         { status: response.status }
//       );
//     }

//     const data = await response.json();
//  const quizContent = data?.choices?.[0]?.message?.content;

// let parsedQuiz: any;

// try {
//   if (!quizContent) throw new Error("Empty AI response");

//   // Remove ```json fences if present
//   const cleaned = quizContent
//     .trim()
//     .replace(/^```json\s*/, "")
//     .replace(/```$/, "")
//     .trim();

//   // Extract only JSON part before any extra text
//   const firstBraceIndex = cleaned.indexOf("{");
//   const lastBraceIndex = cleaned.lastIndexOf("}");

//   if (firstBraceIndex === -1 || lastBraceIndex === -1) {
//     throw new Error("No JSON found in AI response");
//   }

//   const jsonOnly = cleaned.slice(firstBraceIndex, lastBraceIndex + 1);

//   parsedQuiz = JSON.parse(jsonOnly);

//   if (
//     !parsedQuiz.title ||
//     !parsedQuiz.instructions ||
//     !Array.isArray(parsedQuiz.questions)
//   ) {
//     throw new Error("AI returned incomplete quiz structure");
//   }
// } catch (err) {
//   console.error("Parsing error:", err, quizContent);
//   return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
// }

// return NextResponse.json({ quiz: parsedQuiz });

//   } catch (error: any) {
//     console.error("Server error:", error);
//     return NextResponse.json(
//       { error: error.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "✅ defined" : "❌ undefined");

// app/api/generate-quiz/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-option";
// import { prisma } from "@/lib/prisma";

// export async function POST(req: NextRequest) {
//   try {
//     // 1️⃣ Get logged-in user session
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const user = await prisma.user.findUnique({
//       where: { email: session.user.email },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     // 2️⃣ Enforce 3-hour cooldown for free quiz
//     const now = new Date();
//     if (user.lastQuizAt) {
//   const diffMs = now.getTime() - new Date(user.lastQuizAt).getTime();
//   const hoursDiff = diffMs / 1000 / 60 / 60;

//   if (hoursDiff < 3) {
//     // Return nextFreeAt instead of minutes
//     const nextFreeAt = new Date(new Date(user.lastQuizAt).getTime() + 3 * 60 * 60 * 1000);
//     return NextResponse.json(
//       {
//         error: "You must wait for the next free quiz.",
//         nextFreeAt, // pass the actual timestamp
//         lastQuizAt: user.lastQuizAt,
//       },
//       { status: 403 }
//     );
//   }
// }


//     // 3️⃣ Get text input
//     const { text } = await req.json();
//     if (!text) {
//       return NextResponse.json({ error: "No text provided" }, { status: 400 });
//     }

//     // 4️⃣ Call OpenRouter AI
//     const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

//     if (!response.ok) {
//       const errorData = await response.json();
//       console.error("OpenRouter Error:", errorData);
//       return NextResponse.json(
//         { error: errorData.error?.message || "Failed to generate quiz" },
//         { status: response.status }
//       );
//     }

//     const data = await response.json();
//     const quizContent = data?.choices?.[0]?.message?.content;

//     // 5️⃣ Parse AI response safely
//     let parsedQuiz: any;
//     try {
//       if (!quizContent) throw new Error("Empty AI response");

//       const cleaned = quizContent
//         .trim()
//         .replace(/^```json\s*/, "")
//         .replace(/```$/, "")
//         .trim();

//       const firstBraceIndex = cleaned.indexOf("{");
//       const lastBraceIndex = cleaned.lastIndexOf("}");
//       if (firstBraceIndex === -1 || lastBraceIndex === -1) {
//         throw new Error("No JSON found in AI response");
//       }

//       parsedQuiz = JSON.parse(cleaned.slice(firstBraceIndex, lastBraceIndex + 1));

//       if (!parsedQuiz.title || !parsedQuiz.instructions || !Array.isArray(parsedQuiz.questions)) {
//         throw new Error("AI returned incomplete quiz structure");
//       }
//     } catch (err) {
//       console.error("Parsing error:", err, quizContent);
//       return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
//     }

//     // 6️⃣ Save Quiz + Questions to database
//     const savedQuiz = await prisma.quiz.create({
//       data: {
//         title: parsedQuiz.title,
//         instructions: parsedQuiz.instructions,
//         userId: user.id,
//         questions: {
//           create: parsedQuiz.questions.map((q: any) => ({
//             question: q.question,
//             options: q.options,
//             answer: q.answer,
//           })),
//         },
//       },
//       include: { questions: true },
//     });

//     // 7️⃣ Update lastQuizAt timestamp
//     const updatedUser = await prisma.user.update({
//       where: { id: user.id },
//       data: { lastQuizAt: now },
//     });

//     // 8️⃣ Return saved quiz + time until next free quiz
//     return NextResponse.json({
//       quiz: savedQuiz,
//       nextFreeInHours: 3,
//       lastQuizAt: updatedUser.lastQuizAt,
//     });

//   } catch (error: any) {
//     console.error("Server error:", error);
//     return NextResponse.json(
//       { error: error.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/generate-quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Stripe } from "stripe";

const COOLDOWN_HOURS = 3;
const FREE_QUIZ_LIMIT = 3;

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Session check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const now = new Date();
    const subscriptionPlan = user.subscriptionPlan || "free";
    const subscriptionStatus = user.subscriptionStatus || "active";
    const isFree = subscriptionPlan === "free" || subscriptionStatus === "cancelled";

    // 3️⃣ Free tier rule FIX — cooldown applies ONLY after limit is reached
    if (isFree) {
      // If user used all 3 free quizzes → cooldown applies
      if (user.quizUsage >= FREE_QUIZ_LIMIT) {
        if (user.lastQuizAt) {
          const diffHours =
            (now.getTime() - new Date(user.lastQuizAt).getTime()) /
            1000 /
            60 /
            60;

          if (diffHours < COOLDOWN_HOURS) {
            const nextFreeAt = new Date(
              new Date(user.lastQuizAt).getTime() +
                COOLDOWN_HOURS * 60 * 60 * 1000
            );

            return NextResponse.json(
              {
                error: `Free limit reached. Come back later.`,
                nextFreeAt,
                quizUsage: user.quizUsage,
              },
              { status: 403 }
            );
          }

          // Cooldown finished → reset usage
          await prisma.user.update({
            where: { id: user.id },
            data: { quizUsage: 0 },
          });

          user.quizUsage = 0; // update in runtime
        }
      }
    }

    // 4️⃣ Stripe check (unchanged)
    let isProOrPremium = false;
    if (user.stripeCustomerId) {
      const customer = (await stripe.customers.retrieve(
        user.stripeCustomerId
      )) as Stripe.Customer;

      if (customer.subscriptions?.data?.length) {
        const subscription = customer.subscriptions.data[0];
        if (subscription?.status === "active") {
          isProOrPremium = subscription.items.data.some(
            (item) =>
              item.price.id === process.env.STRIPE_PRO_PRICE_ID ||
              item.price.id === process.env.STRIPE_PREMIUM_PRICE_ID
          );
        }
      }
    }

    // 5️⃣ Read user input
    const { text } = await req.json();
    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // 6️⃣ AI QUIZ GENERATION
    const quiz = await generateQuizAI(text);

    // 7️⃣ Save quiz
    const savedQuiz = await prisma.quiz.create({
      data: {
        title: quiz.title,
        instructions: quiz.instructions,
        userId: user.id,
        questions: {
          create: quiz.questions.map((q: any) => ({
            question: q.question,
            options: q.options,
            answer: q.answer,
          })),
        },
      },
      include: { questions: true },
    });

    // 8️⃣ Update usage ONLY for free tier
    if (isFree) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          quizUsage: user.quizUsage + 1,
          lastQuizAt: now,
        },
      });
    }

    return NextResponse.json({
      quiz: savedQuiz,
      quizUsage: user.quizUsage + 1,
      remaining: FREE_QUIZ_LIMIT - (user.quizUsage + 1),
    });
  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ---- AI Generation Helper ----
async function generateQuizAI(text: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://quizmint.ai",
      "X-Title": "QuizMint AI",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat-v3.1:free",
      messages: [
        {
          role: "system",
          content:
            "Return strict JSON only. Example:\n" +
            "{ \"title\": \"string\", \"instructions\": \"string\", \"questions\": [ { \"question\": \"string\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": \"string\" } ] }"
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();

    console.error("OpenRouter Error:", errorData);
    throw new Error("AI response failed" + errorData);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || "";

  // Remove code fences
  let cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

  // Extract only the JSON part
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first === -1 || last === -1) {
    throw new Error("AI did not return valid JSON");
  }

  const jsonString = cleaned.substring(first, last + 1);

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.log("Invalid JSON from AI:", cleaned);
    throw new Error("Invalid JSON from AI");
  }
}
