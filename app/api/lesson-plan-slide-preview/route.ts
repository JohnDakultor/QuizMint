import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

const MODEL =
  process.env.OPENROUTER_MODEL_PRO ||
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-4o-mini";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { subscriptionPlan: true },
    });

    if (!user || user.subscriptionPlan !== "premium") {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    const body = await req.json();
    const { deckTitle, deckSubtitle, slide } = body || {};

    if (!slide || typeof slide !== "object") {
      return NextResponse.json({ error: "Missing slide payload" }, { status: 400 });
    }

    const systemPrompt = `You generate ONE polished presentation slide as JSON.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "body": "string",
  "bullets": ["string"],
  "imagePrompts": ["string"]
}

Rules:
- Keep title concise and presentation-ready.
- Body should be 1-2 sentences max.
- Bullets should be concise, specific, and presentation-friendly.
- Generate 3 to 6 bullets unless the topic obviously needs fewer.
- imagePrompts should be short visual concepts, one prompt per image card.
- No markdown, no prose outside JSON.`;

    const userPrompt = `Deck title: ${deckTitle || ""}
Deck subtitle: ${deckSubtitle || ""}

Current slide draft:
Title: ${slide.title || ""}
Body: ${slide.body || ""}
Bullets:
${Array.isArray(slide.bullets) ? slide.bullets.map((b: string, i: number) => `${i + 1}. ${b}`).join("\n") : ""}
Image prompt text:
${slide.imagePrompt || ""}

Improve this single slide so it is clearer, more presentation-ready, and more useful for a teacher editing live.
Return only JSON.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "QuizMintAI Slide Preview",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `AI response failed: ${res.status} ${text.slice(0, 240)}` },
        { status: 500 }
      );
    }

    const wrapper = JSON.parse(text);
    const raw = wrapper?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      title: typeof parsed?.title === "string" ? parsed.title : slide.title || "",
      body: typeof parsed?.body === "string" ? parsed.body : slide.body || "",
      bullets: Array.isArray(parsed?.bullets) ? parsed.bullets.filter(Boolean).slice(0, 8) : slide.bullets || [],
      imagePrompts: Array.isArray(parsed?.imagePrompts)
        ? parsed.imagePrompts.filter(Boolean).slice(0, 6)
        : [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate slide preview." },
      { status: 500 }
    );
  }
}
