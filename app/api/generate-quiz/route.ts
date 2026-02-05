

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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });


    console.log("User found:", {
      id: user.id,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      aiDifficulty: user.aiDifficulty,
      adaptiveLearning: user.adaptiveLearning,
      quizUsage: user.quizUsage
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
            videoId = urlObj.pathname.split("/").pop()?.split("?")[0];
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

    // Generate quiz with safe parameters
    const quiz = await generateQuizAI(
      content,
      safeDifficulty,
      safeAdaptive,
      isProOrPremium,
      ""
    );

    // Sanitize questions
    const safeQuestions = quiz.questions.map((q: any) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: safeAdaptive ? q.explanation ?? null : null,
      hint: safeAdaptive ? q.hint ?? null : null,
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