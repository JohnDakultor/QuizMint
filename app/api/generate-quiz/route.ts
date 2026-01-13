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
// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-option";
// import { prisma } from "@/lib/prisma";
// import { stripe } from "@/lib/stripe";
// import { Stripe } from "stripe";

// const COOLDOWN_HOURS = 3;
// const FREE_QUIZ_LIMIT = 3;

// export async function POST(req: NextRequest) {
//   try {
//     // 1️⃣ Session check
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // 2️⃣ Get user
//     const user = await prisma.user.findUnique({
//       where: { email: session.user.email },
//     });

//     if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

//     const now = new Date();
//     const subscriptionPlan = user.subscriptionPlan || "free";
//     const subscriptionStatus = user.subscriptionStatus || "active";
//     const isFree = subscriptionPlan === "free" || subscriptionStatus === "cancelled";

//     // 3️⃣ Free tier rule FIX — cooldown applies ONLY after limit is reached
//     if (isFree) {
//       // If user used all 3 free quizzes → cooldown applies
//       if (user.quizUsage >= FREE_QUIZ_LIMIT) {
//         if (user.lastQuizAt) {
//           const diffHours =
//             (now.getTime() - new Date(user.lastQuizAt).getTime()) /
//             1000 /
//             60 /
//             60;

//           if (diffHours < COOLDOWN_HOURS) {
//             const nextFreeAt = new Date(
//               new Date(user.lastQuizAt).getTime() +
//                 COOLDOWN_HOURS * 60 * 60 * 1000
//             );

//             return NextResponse.json(
//               {
//                 error: `Free limit reached. Come back later.`,
//                 nextFreeAt,
//                 quizUsage: user.quizUsage,
//               },
//               { status: 403 }
//             );
//           }

//           // Cooldown finished → reset usage
//           await prisma.user.update({
//             where: { id: user.id },
//             data: { quizUsage: 0 },
//           });

//           user.quizUsage = 0; // update in runtime
//         }
//       }
//     }

//     // 4️⃣ Stripe check (unchanged)
//     let isProOrPremium = false;
//     if (user.stripeCustomerId) {
//       const customer = (await stripe.customers.retrieve(
//         user.stripeCustomerId
//       )) as Stripe.Customer;

//       if (customer.subscriptions?.data?.length) {
//         const subscription = customer.subscriptions.data[0];
//         if (subscription?.status === "active") {
//           isProOrPremium = subscription.items.data.some(
//             (item) =>
//               item.price.id === process.env.STRIPE_PRO_PRICE_ID ||
//               item.price.id === process.env.STRIPE_PREMIUM_PRICE_ID
//           );
//         }
//       }
//     }

//     // 5️⃣ Read user input
//     const { text } = await req.json();
//     if (!text || text.trim() === "") {
//       return NextResponse.json({ error: "No text provided" }, { status: 400 });
//     }

//     // 6️⃣ AI QUIZ GENERATION
//     const quiz = await generateQuizAI(text);

//     // 7️⃣ Save quiz
//     const savedQuiz = await prisma.quiz.create({
//       data: {
//         title: quiz.title,
//         instructions: quiz.instructions,
//         userId: user.id,
//         questions: {
//           create: quiz.questions.map((q: any) => ({
//             question: q.question,
//             options: q.options,
//             answer: q.answer,
//           })),
//         },
//       },
//       include: { questions: true },
//     });

//     // 8️⃣ Update usage ONLY for free tier
//     if (isFree) {
//       await prisma.user.update({
//         where: { id: user.id },
//         data: {
//           quizUsage: user.quizUsage + 1,
//           lastQuizAt: now,
//         },
//       });
//     }

//     return NextResponse.json({
//       quiz: savedQuiz,
//       quizUsage: user.quizUsage + 1,
//       remaining: FREE_QUIZ_LIMIT - (user.quizUsage + 1),
//     });
//   } catch (err: any) {
//     console.error("Server error:", err);
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // ---- AI Generation Helper ----
// async function generateQuizAI(text: string) {
//   const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//       "HTTP-Referer": "https://quizmint.ai",
//       "X-Title": "QuizMint AI",
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "deepseek/deepseek-chat-v3.1:free",
//       messages: [
//         {
//           role: "system",
//           content:
//             "Return strict JSON only. Example:\n" +
//             "{ \"title\": \"string\", \"instructions\": \"string\", \"questions\": [ { \"question\": \"string\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": \"string\" } ] }"
//         },
//         { role: "user", content: text },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     const errorData = await response.text();

//     console.error("OpenRouter Error:", errorData);
//     throw new Error("AI response failed" + errorData);
//   }

//   const data = await response.json();
//   const raw = data?.choices?.[0]?.message?.content || "";

//   // Remove code fences
//   let cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

//   // Extract only the JSON part
//   const first = cleaned.indexOf("{");
//   const last = cleaned.lastIndexOf("}");

//   if (first === -1 || last === -1) {
//     throw new Error("AI did not return valid JSON");
//   }

//   const jsonString = cleaned.substring(first, last + 1);

//   try {
//     return JSON.parse(jsonString);
//   } catch (err) {
//     console.log("Invalid JSON from AI:", cleaned);
//     throw new Error("Invalid JSON from AI");
//   }
// }

// app/api/generate-quiz/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-option";
// import { prisma } from "@/lib/prisma";
// import { stripe } from "@/lib/stripe";
// import { Stripe } from "stripe";

// const COOLDOWN_HOURS = 3;
// const FREE_QUIZ_LIMIT = 3;

// export async function POST(req: NextRequest) {
//   try {
//     // 1️⃣ Get user session
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // 2️⃣ Fetch user
//     const user = await prisma.user.findUnique({
//       where: { email: session.user.email },
//     });
//     if (!user)
//       return NextResponse.json({ error: "User not found" }, { status: 404 });

//     const now = new Date();
//     const subscriptionPlan = user.subscriptionPlan || "free";
//     const subscriptionStatus = user.subscriptionStatus || "active";
//     const isFree =
//       subscriptionPlan === "free" || subscriptionStatus === "cancelled";

//     // 3️⃣ Free tier cooldown check
//     if (isFree && user.quizUsage >= FREE_QUIZ_LIMIT) {
//       if (user.lastQuizAt) {
//         const hoursSinceLastQuiz =
//           (now.getTime() - new Date(user.lastQuizAt).getTime()) /
//           1000 /
//           60 /
//           60;
//         if (hoursSinceLastQuiz < COOLDOWN_HOURS) {
//           const nextFreeAt = new Date(
//             new Date(user.lastQuizAt).getTime() +
//               COOLDOWN_HOURS * 60 * 60 * 1000
//           );
//           return NextResponse.json(
//             {
//               error: "Free limit reached. Come back later.",
//               nextFreeAt,
//               quizUsage: user.quizUsage,
//             },
//             { status: 403 }
//           );
//         }

//         // Reset usage after cooldown
//         await prisma.user.update({
//           where: { id: user.id },
//           data: { quizUsage: 0 },
//         });
//         user.quizUsage = 0;
//       }
//     }

//     // 4️⃣ Stripe subscription check
//     let isProOrPremium = false;
//     if (user.stripeCustomerId) {
//       const customer = (await stripe.customers.retrieve(
//         user.stripeCustomerId
//       )) as Stripe.Customer;
//       if (customer.subscriptions?.data?.length) {
//         const subscription = customer.subscriptions.data[0];
//         if (subscription?.status === "active") {
//           isProOrPremium = subscription.items.data.some(
//             (item) =>
//               item.price.id === process.env.STRIPE_PRICE_PRO ||
//               item.price.id === process.env.STRIPE_PRICE_PREMIUM
//           );
//         }
//       }
//     }

//     // 5️⃣ Read user input
//     const { text, difficulty, adaptiveLearning } = await req.json();

//     // 6️⃣ Save settings to DB (persistency)
//     const safeDifficulty = isProOrPremium ? difficulty : "easy";
//     const safeAdaptive =
//       isProOrPremium && subscriptionPlan === "premium"
//         ? adaptiveLearning
//         : false;

//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         aiDifficulty: safeDifficulty,
//         adaptiveLearning: safeAdaptive,
//       },
//     });

//     // 7️⃣ Generate quiz only if text provided
//     let savedQuiz = null;
//     if (text && text.trim() !== "") {
//       const quiz = await generateQuizAI(text, safeDifficulty, safeAdaptive);

//       savedQuiz = await prisma.quiz.create({
//         data: {
//           title: quiz.title,
//           instructions: quiz.instructions,
//           userId: user.id,
//           questions: {
//             create: quiz.questions.map((q: any) => ({
//               question: q.question,
//               options: q.options,
//               answer: q.answer,
//             })),
//           },
//         },
//         include: { questions: true },
//       });
//     }

//     // 8️⃣ Update free tier usage
//     if (isFree && text && text.trim() !== "") {
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { quizUsage: user.quizUsage + 1, lastQuizAt: now },
//       });
//     }

//     return NextResponse.json({
//       message: "Settings updated successfully",
//       quiz: savedQuiz,
//       quizUsage: isFree ? user.quizUsage + 1 : null,
//       remaining: isFree ? FREE_QUIZ_LIMIT - (user.quizUsage + 1) : null,
//     });
//   } catch (err: any) {
//     console.error("Server error:", err);
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // ---- AI Generation Helper ----
// async function generateQuizAI(
//   text: string,
//   difficulty: string,
//   adaptiveLearning: boolean
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

//   const finalPrompt = `Generate a quiz based on the following content. ${difficultyPrompt} ${adaptivePrompt}`;

//   const response = await fetch(
//     "https://openrouter.ai/api/v1/chat/completions",
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//         "HTTP-Referer": "https://quizmint.ai",
//         "X-Title": "QuizMint AI",
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "x-ai/grok-4.1-fast:free",
//         messages: [
//           {
//             role: "system",
//             content:
//               "Return strict JSON only. Format:\n" +
//               '{ "title": "string", "instructions": "string", "questions": [ { "question": "string", "options": ["A", "B", "C", "D"], "answer": "string" } ] }',
//           },
//           { role: "user", content: finalPrompt + "\n\nContent:\n" + text },
//         ],
//       }),
//     }
//   );

//   if (!response.ok) {
//     const errorData = await response.text();
//     console.error("OpenRouter Error:", errorData);
//     throw new Error("AI response failed: " + errorData);
//   }

//   if (response.status === 429) {
//     throw new Error(
//       "Rate limit exceeded. Please wait a minute before trying again."
//     );
//   }

//   const data = await response.json();
//   const raw = data?.choices?.[0]?.message?.content || "";

//   // Clean JSON
//   let cleaned = raw
//     .replace(/```json/g, "")
//     .replace(/```/g, "")
//     .trim();
//   const first = cleaned.indexOf("{");
//   const last = cleaned.lastIndexOf("}");
//   if (first === -1 || last === -1)
//     throw new Error("AI did not return valid JSON");

//   const jsonString = cleaned.substring(first, last + 1);

//   try {
//     return JSON.parse(jsonString);
//   } catch (err) {
//     console.error("Invalid JSON from AI:", cleaned);
//     throw new Error("Invalid JSON from AI");
//   }
// }

// app/api/generate-quiz/route.ts

// app/api/generate-quiz/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-option";
// import { prisma } from "@/lib/prisma";
// import { stripe } from "@/lib/stripe";
// import { Stripe } from "stripe";

// const COOLDOWN_HOURS = 3;
// const FREE_QUIZ_LIMIT = 3;

// export async function POST(req: NextRequest) {
//   try {
//     // 1️⃣ Get user session
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // 2️⃣ Fetch user
//     const user = await prisma.user.findUnique({
//       where: { email: session.user.email },
//     });
//     if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

//     const now = new Date();
//     const subscriptionPlan = user.subscriptionPlan || "free";
//     const subscriptionStatus = user.subscriptionStatus || "active";
//     const isFree = subscriptionPlan === "free" || subscriptionStatus === "cancelled";

//     // 3️⃣ Free tier cooldown check
//     if (isFree && user.quizUsage >= FREE_QUIZ_LIMIT) {
//       if (user.lastQuizAt) {
//         const hoursSinceLastQuiz =
//           (now.getTime() - new Date(user.lastQuizAt).getTime()) / 1000 / 60 / 60;
//         if (hoursSinceLastQuiz < COOLDOWN_HOURS) {
//           const nextFreeAt = new Date(
//             new Date(user.lastQuizAt).getTime() + COOLDOWN_HOURS * 60 * 60 * 1000
//           );
//           return NextResponse.json(
//             {
//               error: "Free limit reached. Come back later.",
//               nextFreeAt,
//               quizUsage: user.quizUsage,
//             },
//             { status: 403 }
//           );
//         }

//         // Reset usage after cooldown
//         await prisma.user.update({
//           where: { id: user.id },
//           data: { quizUsage: 0 },
//         });
//         user.quizUsage = 0;
//       }
//     }

//     // 4️⃣ Stripe subscription check
//     let isProOrPremium = false;
//     if (user.stripeCustomerId) {
//       const customer = (await stripe.customers.retrieve(user.stripeCustomerId)) as Stripe.Customer;
//       if (customer.subscriptions?.data?.length) {
//         const subscription = customer.subscriptions.data[0];
//         if (subscription?.status === "active") {
//           isProOrPremium = subscription.items.data.some(
//             (item) =>
//               item.price.id === process.env.STRIPE_PRICE_PRO ||
//               item.price.id === process.env.STRIPE_PRICE_PREMIUM
//           );
//         }
//       }
//     }

//     // 5️⃣ Read user input
//     const { text, adaptiveLearning } = await req.json();

//     // 6️⃣ Determine difficulty to use
//     const difficultyFromDB = user.aiDifficulty || "easy";
//     const safeDifficulty = isFree ? "easy" : difficultyFromDB;

//     // Use safeAdaptive only
//     const safeAdaptive = user.adaptiveLearning ?? false;

//     // 7️⃣ Generate quiz if text is provided
//     let savedQuiz = null;
//     if (text && text.trim() !== "") {
//       const quiz = await generateQuizAI(text, safeDifficulty, safeAdaptive, isProOrPremium);

//       // Only save hints/explanations if safeAdaptive is true
//       const safeQuestions = quiz.questions.map((q: any) => ({
//         question: q.question,
//         options: q.options,
//         answer: q.answer,
//         explanation: safeAdaptive ? q.explanation ?? null : null,
//         hint: safeAdaptive ? q.hint ?? null : null,
//       }));

//       savedQuiz = await prisma.quiz.create({
//         data: {
//           title: quiz.title,
//           instructions: quiz.instructions,
//           userId: user.id,
//           questions: { create: safeQuestions },
//         },
//         include: { questions: true },
//       });
//     }

//     // 8️⃣ Update free tier usage
//     if (isFree && text && text.trim() !== "") {
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { quizUsage: user.quizUsage + 1, lastQuizAt: now },
//       });
//     }

//     return NextResponse.json({
//       message: "Quiz generated successfully",
//       quiz: savedQuiz,
//       quizUsage: isFree ? user.quizUsage + 1 : null,
//       remaining: isFree ? FREE_QUIZ_LIMIT - (user.quizUsage + 1) : null,
//     });
//   } catch (err: any) {
//     console.error("Server error:", err);
//     return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
//   }
// }

// // ---- AI Generation Helper ----
// async function generateQuizAI(
//   text: string,
//   difficulty: string,
//   adaptiveLearning: boolean,
//   isProOrPremium: boolean
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

//   const finalPrompt = `Generate a quiz based on the following content. ${difficultyPrompt} ${adaptivePrompt}`;

//   const modelToUse = isProOrPremium ? "x-ai/grok-4.1" : "tngtech/deepseek-r1t-chimera:free";

//   const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//       "HTTP-Referer": "https://quizmint.ai",
//       "X-Title": "QuizMint AI",
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: modelToUse,
//       messages: [
//         {
//           role: "system",
//           content:
//             "Return strict JSON only. Format:\n" +
//             '{ "title": "string", "instructions": "string", "questions": [ { "question": "string", "options": ["A", "B", "C", "D"], "answer": "string", "explanation": "string", "hint": "string" } ] }',
//         },
//         { role: "user", content: finalPrompt + "\n\nContent:\n" + text },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     const errorData = await response.text();
//     console.error("OpenRouter Error:", errorData);
//     throw new Error("AI response failed: " + errorData);
//   }

//   const data = await response.json();
//   const raw = data?.choices?.[0]?.message?.content || "";

//   // Clean JSON
//   let cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
//   const first = cleaned.indexOf("{");
//   const last = cleaned.lastIndexOf("}");
//   if (first === -1 || last === -1) throw new Error("AI did not return valid JSON");

//   const jsonString = cleaned.substring(first, last + 1);

//   try {
//     return JSON.parse(jsonString);
//   } catch (err) {
//     console.error("Invalid JSON from AI:", cleaned);
//     throw new Error("Invalid JSON from AI");
//   }
// }

/////
//////   use that last one code comment it works fine without the urls documents and youtube stuff
//////
///////

// // app/api/generate-quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Stripe } from "stripe";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getSubtitles } from "youtube-captions-scraper";

import ytdl from "ytdl-core";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { generateQuizAI } from "@/lib/ai";

import { fetchTranscript } from "@/lib/youtube-transcript";

interface YouTubeSnippet {
  title: string;
  description: string;
}

interface YouTubeAPIResponse {
  items?: { snippet?: YouTubeSnippet }[];
}

const COOLDOWN_HOURS = 3;
const FREE_QUIZ_LIMIT = 3;

// Helper to check if input is URL
function isURL(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// Extract text from a web page
async function extractTextFromURL(url: string) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    return $("p")
      .map((i: number, el: cheerio.Element) => $(el).text())
      .get()
      .join("\n\n");
  } catch (err) {
    console.error("❌ Failed to fetch page content:", err);
    return "";
  }
}

// Transform Youtube Data
async function transformYoutubeData(data: any[]) {
  let text = "";

  data.forEach((item: any) => {
    text += item.text + "\n";
  });
  return {
    data: data,
    text: text.trim(),
  };
}

// Extract YouTube transcript
// Extract YouTube transcript
async function extractYouTubeTranscript(videoId: string) {
  try {
    const transcript = await fetchTranscript(videoId);

    // 🔹 DEBUG LOGS
    console.log("✅ Raw transcript array:", transcript); // full array
    transcript.forEach((line, i) => {});

    // Transform to text string for AI
    const transformData = await transformYoutubeData(transcript);
    console.log("✅ Transformed text for AI:", transformData.text);

    return transformData.text;
  } catch (err) {
    console.error("❌ Failed to extract YouTube transcript:", err);
    return "";
  }
}

// ---- POST Handler ----
// export async function POST(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const user = await prisma.user.findUnique({ where: { email: session.user.email } });
//     if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

//     const now = new Date();
//     const subscriptionPlan = user.subscriptionPlan || "free";
//     const subscriptionStatus = user.subscriptionStatus || "active";
//     const isFree = subscriptionPlan === "free" || subscriptionStatus === "cancelled";

//     // Free tier cooldown
//     if (isFree && user.quizUsage >= FREE_QUIZ_LIMIT && user.lastQuizAt) {
//       const hoursSinceLastQuiz = (now.getTime() - new Date(user.lastQuizAt).getTime()) / 1000 / 60 / 60;
//       if (hoursSinceLastQuiz < COOLDOWN_HOURS) {
//         const nextFreeAt = new Date(new Date(user.lastQuizAt).getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
//         return NextResponse.json(
//           { error: "Free limit reached. Come back later. or subscribe to a paid plan", nextFreeAt, quizUsage: user.quizUsage },
//           { status: 403 }
//         );
//       }
//       await prisma.user.update({ where: { id: user.id }, data: { quizUsage: 0 } });
//       user.quizUsage = 0;
//     }

//     // Stripe subscription check
//     let isProOrPremium = false;
//     if (user.stripeCustomerId) {
//       const customer = (await stripe.customers.retrieve(user.stripeCustomerId)) as Stripe.Customer;
//       if (customer.subscriptions?.data?.length) {
//         const subscription = customer.subscriptions.data[0];
//         if (subscription?.status === "active") {
//           isProOrPremium = subscription.items.data.some(
//             (item) =>
//               item.price.id === process.env.STRIPE_PRICE_PRO ||
//               item.price.id === process.env.STRIPE_PRICE_PREMIUM
//           );
//         }
//       }
//     }

//     // Parse request body safely
//     const body = await req.json();
//     const text = body.text?.trim();
//     const adaptiveLearning = user.adaptiveLearning ?? false;

//     if (!text) return NextResponse.json({ error: "No input provided" }, { status: 400 });

//     const safeDifficulty = isFree ? "easy" : user.aiDifficulty || "easy";

//     // Determine content source
//     let content = text;
//     if (isURL(content)) {
//   if (content.includes("youtube.com") || content.includes("youtu.be")) {
//     const urlObj = new URL(content);
//     const videoId = urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
//     if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

//     let extractedText = await extractYouTubeTranscript(content);

//     // Fallback to title + description if no transcript
//     // if (!extractedText?.trim()) {
//     //   extractedText = await fetchYouTubeMetadata(videoId);
//     // }

//     // if (!extractedText?.trim()) {
//     //   extractedText = `⚠️ Limited content: only video ID ${videoId} is available.`;
//     // }

//     content = extractedText;
//   } else {
//     content = await extractTextFromURL(content);
//   }
// }

//     if (!content?.trim()) return NextResponse.json({ error: "Content Not Available" }, { status: 400 });

//     // Truncate for AI
//     if (content.length > 8000) content = content.slice(0, 8000);

//     // Generate quiz
//     const quiz = await generateQuizAI(content, safeDifficulty, adaptiveLearning, isProOrPremium, "");

//     // sanitize questions according to adaptiveLearning
// const safeQuestions = quiz.questions.map((q: any) => ({
//   question: q.question,
//   options: q.options,
//   answer: q.answer,
//   explanation: adaptiveLearning ? q.explanation ?? null : null,
//   hint: adaptiveLearning ? q.hint ?? null : null,
// }));

//     const savedQuiz = await prisma.quiz.create({
//       data: {
//         title: quiz.title,
//         instructions: quiz.instructions,
//         userId: user.id,
//         questions: { create: safeQuestions },
//       },
//       include: { questions: true },
//     });

//     if (isFree) {
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { quizUsage: user.quizUsage + 1, lastQuizAt: now },
//       });
//     }

//     return NextResponse.json({
//       message: "Quiz generated successfully",
//       quiz: savedQuiz,
//       quizUsage: isFree ? user.quizUsage + 1 : null,
//       remaining: isFree ? FREE_QUIZ_LIMIT - (user.quizUsage + 1) : null,
//     });
//   } catch (err: any) {
//     console.error("Server error:", err);
//     return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
//   }
// }

async function fetchYouTubeMetadata(videoId: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YT_API_KEY}`
  );

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  // Cast the unknown JSON to our interface
  const data = (await res.json()) as YouTubeAPIResponse;

  const snippet = data.items?.[0]?.snippet;

  return {
    title: snippet?.title || "",
    description: snippet?.description || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const now = new Date();
    const subscriptionPlan = user.subscriptionPlan || "free";
    const isFree = subscriptionPlan === "free";

    if (isFree && user.quizUsage >= FREE_QUIZ_LIMIT) {
      if (user.lastQuizAt) {
        const hoursSinceLastQuiz =
          (now.getTime() - new Date(user.lastQuizAt).getTime()) /
          1000 /
          60 /
          60;
        if (hoursSinceLastQuiz < COOLDOWN_HOURS) {
          const nextFreeAt = new Date(
            new Date(user.lastQuizAt).getTime() +
              COOLDOWN_HOURS * 60 * 60 * 1000
          );
          return NextResponse.json(
            {
              error: "Free limit reached. Come back later.",
              nextFreeAt,
              quizUsage: user.quizUsage,
            },
            { status: 403 }
          );
        }

        // Reset usage after cooldown
        await prisma.user.update({
          where: { id: user.id },
          data: { quizUsage: 0 },
        });
        user.quizUsage = 0;
      }
    }

    // Parse body
    const body = await req.json();
    let text = body.text?.trim();
    if (!text)
      return NextResponse.json({ error: "No input provided" }, { status: 400 });

    // Determine content source
    let content = text;

    if (isURL(content)) {
      if (content.includes("youtube.com") || content.includes("youtu.be")) {
        // Premium check
        if (isFree) {
          return NextResponse.json(
            { error: "YouTube link generation is premium only" },
            { status: 403 }
          );
        }

        // Extract video ID correctly
        let videoId: string | undefined;
        try {
          const urlObj = new URL(content);
          if (urlObj.hostname.includes("youtu.be")) {
            videoId = urlObj.pathname.split("/").pop()?.split("?")[0]; // remove query string
          } else {
            videoId = urlObj.searchParams.get("v") || undefined;
          }
        } catch (err) {
          return NextResponse.json(
            { error: "Invalid YouTube URL" },
            { status: 400 }
          );
        }

        if (!videoId) {
          return NextResponse.json(
            { error: "Could not extract video ID" },
            { status: 400 }
          );
        }

        // Try fetching transcript
        let extractedText = await extractYouTubeTranscript(videoId);

        // Fallback: use video title + description if transcript is empty
        if (!extractedText?.trim()) {
          try {
            const { title, description } = await fetchYouTubeMetadata(videoId);
            extractedText = `${title}\n\n${description}`;
          } catch (err) {
            console.warn("Fallback metadata fetch failed:", err);
            extractedText = `⚠️ Limited content: only video ID ${videoId} available.`;
          }
        }

        content = extractedText;
      } else {
        content = await extractTextFromURL(content);
      }
    }

    if (!content?.trim())
      return NextResponse.json(
        { error: "Content Not Available" },
        { status: 400 }
      );

    if (content.length > 8000) content = content.slice(0, 8000);

    const safeDifficulty = isFree ? "easy" : user.aiDifficulty || "easy";

    const isProOrPremium =
      user.subscriptionPlan === "pro" || user.subscriptionPlan === "premium";

    const quiz = await generateQuizAI(
      content,
      safeDifficulty,
      user.adaptiveLearning ?? false,
      isProOrPremium,
      ""
    );

    // Sanitize questions
    const safeQuestions = quiz.questions.map((q: any) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: user.adaptiveLearning ? q.explanation ?? null : null,
      hint: user.adaptiveLearning ? q.hint ?? null : null,
    }));

    const savedQuiz = await prisma.quiz.create({
      data: {
        title: quiz.title,
        instructions: quiz.instructions,
        userId: user.id,
        questions: { create: safeQuestions },
      },
      include: { questions: true },
    });

    if (isFree) {
      await prisma.user.update({
        where: { id: user.id },
        data: { quizUsage: user.quizUsage + 1, lastQuizAt: now },
      });
    }

    return NextResponse.json({
      message: "Quiz generated successfully",
      quiz: savedQuiz,
      quizUsage: isFree ? user.quizUsage + 1 : null,
      remaining: isFree ? FREE_QUIZ_LIMIT - (user.quizUsage + 1) : null,
    });
  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}









// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-option";
// import { prisma } from "@/lib/prisma";
// import { stripe } from "@/lib/stripe";
// import { Stripe } from "stripe";
// import fetch from "node-fetch";
// import * as cheerio from "cheerio";
// import { generateQuizAI } from "@/lib/ai";
// import { fetchTranscript } from "@/lib/youtube-transcript";

// const COOLDOWN_HOURS = 3;
// const FREE_QUIZ_LIMIT = 3;

// // ---------------- helpers ----------------
// function isURL(str: string) {
//   try {
//     new URL(str);
//     return true;
//   } catch {
//     return false;
//   }
// }

// interface YouTubeSnippet {
//   title: string;
//   description: string;
// }

// interface YouTubeAPIResponse {
//   items?: { snippet?: YouTubeSnippet }[];
//  }

// async function extractTextFromURL(url: string) {
//   try {
//     const res = await fetch(url);
//     const html = await res.text();
//     const $ = cheerio.load(html);
//     return $("p").map((_, el) => $(el).text()).get().join("\n\n");
//   } catch {
//     return "";
//   }
// }

// async function extractYouTubeTranscript(videoId: string) {
//   try {
//     const transcript = await fetchTranscript(videoId);
//     return transcript.map((t: any) => t.text).join(" ");
//   } catch {
//     return "";
//   }
// }

// async function fetchYouTubeMetadata(videoId: string) {
//   const res = await fetch(
//     `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YT_API_KEY}`
//   );
//   const data = (await res.json()) as YouTubeAPIResponse;
//   const snippet = data.items?.[0]?.snippet;
//   return `${snippet?.title ?? ""}\n\n${snippet?.description ?? ""}`;
// }

// // ---------------- POST ----------------
// export async function POST(req: NextRequest) {
//   try {
//     // 1️⃣ AUTH
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email)
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const user = await prisma.user.findUnique({
//       where: { email: session.user.email },
//     });
//     if (!user)
//       return NextResponse.json({ error: "User not found" }, { status: 404 });

//     const now = new Date();

//     // 2️⃣ SUBSCRIPTION RESOLUTION (RESTORED)
//     const subscriptionPlan = user.subscriptionPlan || "free";
//     const subscriptionStatus = user.subscriptionStatus || "active";

//     let isProOrPremium =
//       subscriptionPlan === "pro" || subscriptionPlan === "premium";

//     // Stripe authoritative check (OLD LOGIC)
//     if (user.stripeCustomerId) {
//       const customer = (await stripe.customers.retrieve(
//         user.stripeCustomerId
//       )) as Stripe.Customer;

//       if (customer.subscriptions?.data?.length) {
//         const sub = customer.subscriptions.data[0];
//         if (sub.status === "active") {
//           isProOrPremium = sub.items.data.some(
//             (item) =>
//               item.price.id === process.env.STRIPE_PRICE_PRO ||
//               item.price.id === process.env.STRIPE_PRICE_PREMIUM
//           );
//         }
//       }
//     }

//     const isFree = !isProOrPremium || subscriptionStatus === "cancelled";

//     // 3️⃣ FREE LIMIT (RESTORED + FIXED)
//     if (isFree && user.quizUsage >= FREE_QUIZ_LIMIT && user.lastQuizAt) {
//       const hours =
//         (now.getTime() - new Date(user.lastQuizAt).getTime()) /
//         1000 /
//         60 /
//         60;

//       if (hours < COOLDOWN_HOURS) {
//         return NextResponse.json(
//           {
//             error: "Free limit reached",
//             nextFreeAt: new Date(
//               new Date(user.lastQuizAt).getTime() +
//                 COOLDOWN_HOURS * 60 * 60 * 1000
//             ),
//           },
//           { status: 403 }
//         );
//       }

//       await prisma.user.update({
//         where: { id: user.id },
//         data: { quizUsage: 0 },
//       });
//       user.quizUsage = 0;
//     }

//     // 4️⃣ INPUT
//     const body = await req.json();
//     let content = body.text?.trim();
//     if (!content)
//       return NextResponse.json({ error: "No input provided" }, { status: 400 });

//     // 5️⃣ URL HANDLING
//     if (isURL(content)) {
//       if (
//         content.includes("youtube.com") ||
//         content.includes("youtu.be")
//       ) {
//         if (isFree) {
//           return NextResponse.json(
//             { error: "YouTube input is premium only" },
//             { status: 403 }
//           );
//         }

//         const url = new URL(content);
//         const videoId =
//           url.searchParams.get("v") ||
//           url.pathname.split("/").pop();

//         if (!videoId)
//           return NextResponse.json(
//             { error: "Invalid YouTube URL" },
//             { status: 400 }
//           );

//         content =
//           (await extractYouTubeTranscript(videoId)) ||
//           (await fetchYouTubeMetadata(videoId));
//       } else {
//         content = await extractTextFromURL(content);
//       }
//     }

//     if (!content.trim())
//       return NextResponse.json(
//         { error: "Content not available" },
//         { status: 400 }
//       );

//     if (content.length > 8000) content = content.slice(0, 8000);

//     // 6️⃣ ENFORCE PLAN LIMITS (RESTORED)
//     const difficulty = isFree ? "easy" : user.aiDifficulty || "easy";

//     if (isFree && user.adaptiveLearning) {
//       return NextResponse.json(
//         { error: "Adaptive learning is premium only" },
//         { status: 403 }
//       );
//     }

//     // 7️⃣ AI GENERATION (FIXED)
//     const quiz = await generateQuizAI(
//       content,
//       difficulty,
//       user.adaptiveLearning ?? false,
//       isProOrPremium,
//       ""
//     );

//     // 8️⃣ SANITIZE
//     const safeQuestions = quiz.questions.map((q: any) => ({
//       question: q.question,
//       options: q.options,
//       answer: q.answer,
//       explanation: isProOrPremium ? q.explanation ?? null : null,
//       hint: isProOrPremium ? q.hint ?? null : null,
//     }));

//     const savedQuiz = await prisma.quiz.create({
//       data: {
//         title: quiz.title,
//         instructions: quiz.instructions,
//         userId: user.id,
//         questions: { create: safeQuestions },
//       },
//       include: { questions: true },
//     });

//     // 9️⃣ USAGE TRACKING
//     if (isFree) {
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { quizUsage: user.quizUsage + 1, lastQuizAt: now },
//       });
//     }

//     return NextResponse.json({
//       message: "Quiz generated",
//       quiz: savedQuiz,
//       remaining: isFree
//         ? FREE_QUIZ_LIMIT - (user.quizUsage + 1)
//         : null,
//     });
//   } catch (err: any) {
//     console.error("Generate quiz error:", err);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
