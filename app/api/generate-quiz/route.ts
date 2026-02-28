

// // // app/api/generate-quiz/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-option";
// import { prisma } from "@/lib/prisma";
// import { stripe } from "@/lib/stripe";
// import { Stripe } from "stripe";
// import fetch from "node-fetch";
// import * as cheerio from "cheerio";
// import { getSubtitles } from "youtube-captions-scraper";

// import ytdl from "ytdl-core";
// import axios from "axios";
// import { XMLParser } from "fast-xml-parser";
// import { generateQuizAI } from "@/lib/ai";

// import { fetchTranscript } from "@/lib/youtube-transcript";

// interface YouTubeSnippet {
//   title: string;
//   description: string;
// }

// interface YouTubeAPIResponse {
//   items?: { snippet?: YouTubeSnippet }[];
// }

// const COOLDOWN_HOURS = 3;
// const FREE_QUIZ_LIMIT = 3;

// // Helper to check if input is URL
// function isURL(str: string) {
//   try {
//     new URL(str);
//     return true;
//   } catch {
//     return false;
//   }
// }

// // Extract text from a web page
// async function extractTextFromURL(url: string) {
//   try {
//     const res = await fetch(url);
//     const html = await res.text();
//     const $ = cheerio.load(html);
//     return $("p")
//       .map((i: number, el: cheerio.Element) => $(el).text())
//       .get()
//       .join("\n\n");
//   } catch (err) {
//     console.error("❌ Failed to fetch page content:", err);
//     return "";
//   }
// }

// // Transform Youtube Data
// async function transformYoutubeData(data: any[]) {
//   let text = "";

//   data.forEach((item: any) => {
//     text += item.text + "\n";
//   });
//   return {
//     data: data,
//     text: text.trim(),
//   };
// }

// // Extract YouTube transcript
// // Extract YouTube transcript
// async function extractYouTubeTranscript(videoId: string) {
//   try {
//     const transcript = await fetchTranscript(videoId);

//     // 🔹 DEBUG LOGS
//     console.log("✅ Raw transcript array:", transcript); // full array
//     transcript.forEach((line, i) => {});

//     // Transform to text string for AI
//     const transformData = await transformYoutubeData(transcript);
//     console.log("✅ Transformed text for AI:", transformData.text);

//     return transformData.text;
//   } catch (err) {
//     console.error("❌ Failed to extract YouTube transcript:", err);
//     return "";
//   }
// }



// async function fetchYouTubeMetadata(videoId: string) {
//   const res = await fetch(
//     `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YT_API_KEY}`
//   );

//   if (!res.ok) {
//     throw new Error(`YouTube API error: ${res.status}`);
//   }

//   // Cast the unknown JSON to our interface
//   const data = (await res.json()) as YouTubeAPIResponse;

//   const snippet = data.items?.[0]?.snippet;

//   return {
//     title: snippet?.title || "",
//     description: snippet?.description || "",
//   };
// }

// export async function POST(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email)
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const user = await prisma.user.findUnique({
//       where: { email: session.user.email },
//     });
//     if (!user)
//       return NextResponse.json({ error: "User not found" }, { status: 404 });

//     const now = new Date();
//     const subscriptionPlan = user.subscriptionPlan || "free";
//     const isFree = subscriptionPlan === "free";
//     const isProOrPremium =
//       user.subscriptionPlan === "pro" || user.subscriptionPlan === "premium";

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

//     // Parse body
//     const body = await req.json();
//     const requestedDifficulty = typeof body.difficulty === "string" ? body.difficulty.toLowerCase() : undefined;
//     const requestedAdaptive = typeof body.adaptiveLearning === "boolean" ? body.adaptiveLearning : undefined;
//     let text = body.text?.trim();
//     if (!text)
//       return NextResponse.json({ error: "No input provided" }, { status: 400 });

//     // Determine content source
//     let content = text;

//     if (isURL(content)) {
//       if (content.includes("youtube.com") || content.includes("youtu.be")) {
//         // Premium check
//         if (isFree) {
//           return NextResponse.json(
//             { error: "YouTube link generation is premium only" },
//             { status: 403 }
//           );
//         }

//         // Extract video ID correctly
//         let videoId: string | undefined;
//         try {
//           const urlObj = new URL(content);
//           if (urlObj.hostname.includes("youtu.be")) {
//             videoId = urlObj.pathname.split("/").pop()?.split("?")[0]; // remove query string
//           } else {
//             videoId = urlObj.searchParams.get("v") || undefined;
//           }
//         } catch (err) {
//           return NextResponse.json(
//             { error: "Invalid YouTube URL" },
//             { status: 400 }
//           );
//         }

//         if (!videoId) {
//           return NextResponse.json(
//             { error: "Could not extract video ID" },
//             { status: 400 }
//           );
//         }

//         // Try fetching transcript
//         let extractedText = await extractYouTubeTranscript(videoId);

//         // Fallback: use video title + description if transcript is empty
//         if (!extractedText?.trim()) {
//           try {
//             const { title, description } = await fetchYouTubeMetadata(videoId);
//             extractedText = `${title}\n\n${description}`;
//           } catch (err) {
//             console.warn("Fallback metadata fetch failed:", err);
//             extractedText = `⚠️ Limited content: only video ID ${videoId} available.`;
//           }
//         }

//         content = extractedText;
//       } else {
//         content = await extractTextFromURL(content);
//       }
//     }

//     if (!content?.trim())
//       return NextResponse.json(
//         { error: "Content Not Available" },
//         { status: 400 }
//       );

//     if (content.length > 8000) content = content.slice(0, 8000);

//     const validDifficulties = new Set(["easy", "medium", "hard"]);
//     const chosenDifficulty =
//       isProOrPremium && requestedDifficulty && validDifficulties.has(requestedDifficulty)
//         ? requestedDifficulty
//         : user.aiDifficulty || "easy";
//     const safeDifficulty = isFree ? "easy" : chosenDifficulty;

//     const canUseAdaptive = user.subscriptionPlan === "premium";
//     const chosenAdaptive =
//       canUseAdaptive && typeof requestedAdaptive === "boolean"
//         ? requestedAdaptive
//         : user.adaptiveLearning ?? false;
//     const safeAdaptive = canUseAdaptive ? chosenAdaptive : false;

//     if (isProOrPremium && (requestedDifficulty || typeof requestedAdaptive === "boolean")) {
//       await prisma.user.update({
//         where: { id: user.id },
//         data: {
//           aiDifficulty: safeDifficulty,
//           adaptiveLearning: safeAdaptive,
//         },
//       });
//     }

//     const quiz = await generateQuizAI(
//       content,
//       safeDifficulty,
//       safeAdaptive,
//       isProOrPremium,
//       ""
//     );

//     // Sanitize questions
//     const safeQuestions = quiz.questions.map((q: any) => ({
//       question: q.question,
//       options: q.options,
//       answer: q.answer,
//       explanation: safeAdaptive ? q.explanation ?? null : null,
//       hint: safeAdaptive ? q.hint ?? null : null,
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
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
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
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getSubtitles } from "youtube-captions-scraper";

import ytdl from "ytdl-core";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { generateQuizAIWithMeta } from "@/lib/ai";
import { enhancePromptWithRAG } from "@/lib/rag/pipeLine";
import { semanticCacheStore } from "@/lib/rag/semanticCache";
import { ingestWebSourcesForQuery } from "@/lib/rag/web";
import { embed, normalizeForEmbedding } from "@/lib/rag/embed";
import { extractProviderErrorDetails, trackGenerationEvent } from "@/lib/generation-events";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

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

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function chunkText(text: string, chunkSize = 1200, overlap = 200) {
  const cleaned = normalizeForEmbedding(text);
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = Math.max(end - overlap, 0);
  }
  return chunks;
}

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
async function extractYouTubeTranscript(videoId: string) {
  try {
    const transcript = await fetchTranscript(videoId);

    // 🔹 DEBUG LOGS
    console.log("✅ Raw transcript array:", transcript); // full array

    // Transform to text string for AI
    const transformData = await transformYoutubeData(transcript);
    console.log("✅ Transformed text for AI:", transformData.text);

    return transformData.text;
  } catch (err) {
    console.error("❌ Failed to extract YouTube transcript:", err);
    return "";
  }
}

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
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  const requestId = createRequestId();
  const stageMs = {
    contentPrep: 0,
    ingest: 0,
    rag: 0,
    ai: 0,
    cacheWrite: 0,
    dbWrite: 0,
  };
  try {
    const ensureNotAborted = () => {
      if (req.signal.aborted) {
        const abortedError = new Error("REQUEST_ABORTED");
        (abortedError as Error & { name: string }).name = "AbortError";
        throw abortedError;
      }
    };

    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user)
      return apiError(404, "User not found", requestId);
    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";
    const liteMode = Boolean((user as any).liteMode);


    console.log("User found:", {
      id: user.id,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      aiDifficulty: user.aiDifficulty,
      adaptiveLearning: user.adaptiveLearning,
      quizUsage: user.quizUsage,
      liteMode,
    });

    const now = new Date();
    const subscriptionPlan = user.subscriptionPlan || "free";
    const isFree = subscriptionPlan === "free";
    const isProOrPremium =
      user.subscriptionPlan === "pro" || user.subscriptionPlan === "premium";

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
          const adCooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
          const windowStart = user.quizAdResetWindowAt
            ? new Date(user.quizAdResetWindowAt)
            : null;
          const resetCount = user.quizAdResetCount ?? 0;
          const windowExpired =
            !windowStart || now.getTime() - windowStart.getTime() >= adCooldownMs;
          const remainingResets = windowExpired ? 5 : Math.max(5 - resetCount, 0);
          const adResetAvailable = remainingResets > 0;
          const nextAdResetAt = adResetAvailable
            ? null
            : new Date(
                (windowStart ? windowStart.getTime() : now.getTime()) + adCooldownMs
              ).toISOString();
          return NextResponse.json(
            {
              error: "Free limit reached. Come back later.",
              nextFreeAt,
              quizUsage: user.quizUsage,
              adResetAvailable,
              nextAdResetAt,
              adResetsRemaining: remainingResets,
              requestId,
            },
            {
              status: 403,
              headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
            }
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
    
    // Safely get requested values with defaults
    const requestedDifficulty = body.difficulty && typeof body.difficulty === "string" 
      ? body.difficulty.toLowerCase().trim() 
      : undefined;
    
    const requestedAdaptive = typeof body.adaptiveLearning === "boolean" 
      ? body.adaptiveLearning 
      : (typeof body.adaptiveLearning === "string"
        ? body.adaptiveLearning.toLowerCase() === "true"
        : undefined);
    
    let text = body.text?.trim();
    if (!text)
      return apiError(400, "No input provided", requestId);

    // Determine content source
    let content = text;
    let sourceTitle = "";

    const contentPrepStartedAt = Date.now();
    if (isURL(content)) {
      if (content.includes("youtube.com") || content.includes("youtu.be")) {
        // Premium check
        if (isFree) {
          return apiError(403, "YouTube link generation is premium only", requestId);
        }

        // Extract video ID correctly
        let videoId: string | undefined;
        try {
          const urlObj = new URL(content);
          if (urlObj.hostname.includes("youtu.be")) {
            videoId = urlObj.pathname.split("/").pop()?.split("?")[0];
          } else {
            videoId = urlObj.searchParams.get("v") || undefined;
          }
        } catch (err) {
          return apiError(400, "Invalid YouTube URL", requestId);
        }

        if (!videoId) {
          return apiError(400, "Could not extract video ID", requestId);
        }

        // Try fetching transcript
        let extractedText = await extractYouTubeTranscript(videoId);

        // Fallback: use video title + description if transcript is empty
        if (!extractedText?.trim()) {
          try {
            const { title, description } = await fetchYouTubeMetadata(videoId);
            sourceTitle = title;
            extractedText = `${title}\n\n${description}`;
          } catch (err) {
            console.warn("Fallback metadata fetch failed:", err);
            extractedText = `⚠️ Limited content: only video ID ${videoId} available.`;
          }
        } else {
          try {
            const { title } = await fetchYouTubeMetadata(videoId);
            sourceTitle = title;
          } catch {
            sourceTitle = "";
          }
        }

        content = extractedText;
      } else {
        content = await extractTextFromURL(content);
      }
    }

    stageMs.contentPrep = Date.now() - contentPrepStartedAt;

    if (!content?.trim())
      return apiError(400, "Content Not Available", requestId);

    if (content.length > 8000) content = content.slice(0, 8000);

    // Validate and set difficulty
    const validDifficulties = new Set(["easy", "medium", "hard"]);
    const userDifficulty = user.aiDifficulty || "easy";
    
    // Only use requested difficulty if user is pro/premium AND it's valid
    let chosenDifficulty = userDifficulty;
    if (isProOrPremium && requestedDifficulty && validDifficulties.has(requestedDifficulty)) {
      chosenDifficulty = requestedDifficulty;
    }
    
    // Free users always get "easy"
    const safeDifficulty = isFree ? "easy" : chosenDifficulty;

    // Validate and set adaptive learning
    const canUseAdaptive = user.subscriptionPlan === "premium";
    const userAdaptive = user.adaptiveLearning ?? false;
    
    // Only use requested adaptive if user is premium
    let chosenAdaptive = userAdaptive;
    if (canUseAdaptive && typeof requestedAdaptive === "boolean") {
      chosenAdaptive = requestedAdaptive;
    }
    
    const safeAdaptive = canUseAdaptive ? chosenAdaptive : false;

    // Update user preferences only if they're different
    if (isProOrPremium) {
      const updateData: any = {};
      let needsUpdate = false;
      
      if (requestedDifficulty && validDifficulties.has(requestedDifficulty) && requestedDifficulty !== user.aiDifficulty) {
        updateData.aiDifficulty = safeDifficulty;
        needsUpdate = true;
      }
      
      if (typeof requestedAdaptive === "boolean" && requestedAdaptive !== user.adaptiveLearning) {
        updateData.adaptiveLearning = safeAdaptive;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    console.log("Request body received:", {
      text: body.text?.substring(0, 100) + "...",
      difficulty: body.difficulty,
      adaptiveLearning: body.adaptiveLearning
    });

    const isPromptOnly = !isURL(text);
    const isUrlInput = isURL(text);
    const baseNamespace = `quiz:${user.id}`;
    const webNamespace = `web:${user.id}:${hashString(text)}`;
    const urlNamespace = `url:${user.id}:${hashString(text)}`;
    const namespace = isPromptOnly ? webNamespace : isUrlInput ? urlNamespace : baseNamespace;

    let webDebug: any = null;
    if (liteMode) {
      // Lite mode: skip heavy web/url ingestion and semantic retrieval for faster low-bandwidth flow.
      stageMs.ingest = 0;
      stageMs.rag = 0;
    } else if (isPromptOnly) {
      const docCountRows = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM "Document" WHERE namespace = ${namespace}
      `;
      const hasDocs = (docCountRows[0]?.count ?? 0) > 0;

      if (!hasDocs) {
        try {
          const ingestStartedAt = Date.now();
          ensureNotAborted();
          const webResult = await ingestWebSourcesForQuery({
            query: text,
            namespace,
          });
          ensureNotAborted();
          stageMs.ingest = Date.now() - ingestStartedAt;
          webDebug = webResult.debug;
        } catch (webErr) {
          console.warn("Web RAG ingestion failed:", webErr);
        }
      }
    } else if (isUrlInput) {
      const docCountRows = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM "Document" WHERE namespace = ${namespace}
      `;
      const hasDocs = (docCountRows[0]?.count ?? 0) > 0;

      if (!hasDocs) {
        const ingestStartedAt = Date.now();
        const chunks = chunkText(content);
        for (let i = 0; i < chunks.length; i++) {
          ensureNotAborted();
          const chunk = chunks[i];
          const embedding = await embed(chunk);
          await prisma.$executeRaw`
            INSERT INTO "Document" (
              id, namespace, "sourceUrl", title, "sourceType",
              "chunkIndex", content, embedding, "createdAt", "updatedAt"
            )
            VALUES (
              gen_random_uuid(), ${namespace}, ${text}, ${sourceTitle || null}, ${"url"},
              ${i}, ${chunk}, ${embedding}::vector, now(), now()
            )
          `;
        }
        stageMs.ingest = Date.now() - ingestStartedAt;
      }
    }

    ensureNotAborted();

    let enhancedPrompt = content;
    let cachedResponse: string | null = null;
    let sources: any[] = [];
    let ragMeta: {
      promptForCache: string;
      embedding: number[];
      namespace: string;
    } | null = null;
    let hasContext = false;
    let sourceMode: string | null = null;
    if (!liteMode) {
      const ragStartedAt = Date.now();
      const ragResult = await enhancePromptWithRAG({
        finalPrompt: content,
        namespace,
        topK: isPromptOnly ? 5 : 5,
      });
      enhancedPrompt = ragResult.enhancedPrompt;
      cachedResponse = ragResult.cachedResponse ?? null;
      sources = ragResult.sources ?? [];
      ragMeta = ragResult.ragMeta ?? null;
      hasContext = ragResult.hasContext ?? false;
      sourceMode = ragResult.sourceMode ?? "none";
      stageMs.rag = Date.now() - ragStartedAt;
    }

    // Generate quiz with safe parameters
    ensureNotAborted();

    const aiStartedAt = Date.now();
    const aiResult = cachedResponse
      ? null
      : await generateQuizAIWithMeta(
          isPromptOnly && !hasContext ? text : enhancedPrompt,
          safeDifficulty,
          safeAdaptive,
          isProOrPremium,
          text,
          { liteMode }
        );
    const quiz = cachedResponse ? JSON.parse(cachedResponse) : aiResult!.quiz;
    if (!cachedResponse) {
      stageMs.ai = Date.now() - aiStartedAt;
    }

    let cacheStored = false;
    if (!liteMode && ragMeta && !cachedResponse) {
      try {
        const cacheStoreStartedAt = Date.now();
        ensureNotAborted();
        await semanticCacheStore(
          ragMeta.promptForCache,
          ragMeta.embedding,
          JSON.stringify(quiz),
          ragMeta.namespace
        );
        stageMs.cacheWrite = Date.now() - cacheStoreStartedAt;
        cacheStored = true;
      } catch (cacheErr: any) {
        if (
          cacheErr?.name === "AbortError" ||
          cacheErr?.message === "REQUEST_ABORTED"
        ) {
          throw cacheErr;
        }
        console.warn("Semantic cache store failed:", cacheErr);
      }
    }

    // Sanitize questions
    const safeQuestions = quiz.questions.map((q: any) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: safeAdaptive ? q.explanation ?? null : null,
      hint: safeAdaptive ? q.hint ?? null : null,
    }));

    ensureNotAborted();

    const dbWriteStartedAt = Date.now();
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
      ensureNotAborted();
      await prisma.user.update({
        where: { id: user.id },
        data: { quizUsage: user.quizUsage + 1, lastQuizAt: now, lastActiveAt: now },
      });
    } else {
      ensureNotAborted();
      await prisma.user.update({
        where: { id: user.id },
        data: { lastQuizAt: now, lastActiveAt: now },
      });
    }
    stageMs.dbWrite = Date.now() - dbWriteStartedAt;

    await trackGenerationEvent({
      userId: user.id,
      eventType: "quiz_generated",
      feature: "quiz",
      status: "success",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: aiResult?.meta.estimatedCostUsd ?? 0,
      metadata: {
        liteMode,
        sourceMode: sourceMode ?? "none",
        sourceCount: (sources ?? []).length,
        cacheHit: Boolean(cachedResponse),
        retryCount: aiResult?.meta.retryCount ?? 0,
        fallbackUsed: aiResult?.meta.fallbackUsed ?? false,
        finalModel: aiResult?.meta.finalModel ?? null,
        finalProvider: aiResult?.meta.finalProvider ?? null,
        promptTokens: aiResult?.meta.promptTokens ?? 0,
        completionTokens: aiResult?.meta.completionTokens ?? 0,
        totalTokens: aiResult?.meta.totalTokens ?? 0,
        costUsd: aiResult?.meta.estimatedCostUsd ?? 0,
        stageMs,
      },
    });

    return NextResponse.json({
      message: "Quiz generated successfully",
      quiz: savedQuiz,
      ...(liteMode
        ? {}
        : {
            sources: sources ?? [],
            webDebug,
            sourceTrace: {
              mode: sourceMode ?? "none",
              fromCache: Boolean(cachedResponse),
              sourceCount: (sources ?? []).length,
            },
          }),
      quizUsage: isFree ? user.quizUsage + 1 : null,
      remaining: isFree ? FREE_QUIZ_LIMIT - (user.quizUsage + 1) : null,
      cache: {
        hit: Boolean(cachedResponse),
        stored: cacheStored,
        hasRagMeta: Boolean(ragMeta),
      },
    });
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.message === "REQUEST_ABORTED") {
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "pause_clicked",
        feature: "quiz",
        status: "aborted",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: 0,
        metadata: { stageMs },
      });
      return NextResponse.json(
        { error: "Generation paused by user", requestId },
        {
          status: 499,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    const message = String(err?.message || "");
    const isProviderQuotaIssue =
      message.includes("AI response failed:") &&
      (message.includes("Quota exceeded") ||
        message.includes('"code":402') ||
        message.includes("Provider returned error"));

    if (isProviderQuotaIssue) {
      const providerError = extractProviderErrorDetails(err);
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "quiz_generated",
        feature: "quiz",
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: 0,
        metadata: {
          providerIssue: true,
          provider: providerError.provider ?? "unknown",
          providerCode: providerError.code,
          stageMs,
        },
      });
      return NextResponse.json(
        { error: "Server issue - we're fixing it. Please try again in a few minutes.", requestId },
        {
          status: 503,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    await trackGenerationEvent({
      userId: eventUserId,
      eventType: "quiz_generated",
      feature: "quiz",
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      costUsd: 0,
      metadata: { message: String(err?.message || "unknown_error"), stageMs },
    });
    logApiError(requestId, "generate-quiz", err);
    return apiError(500, err.message || "Internal server error", requestId);
  }
}
  
