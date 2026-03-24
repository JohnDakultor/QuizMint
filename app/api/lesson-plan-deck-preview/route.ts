import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-option";
import { generateSlideImage } from "@/lib/generate-lesson-plan-pptx";
import type { PptDeck } from "@/lib/lesson-plan-ppt-ai";
import { prisma } from "@/lib/prisma";

const MODEL =
  process.env.OPENROUTER_MODEL_PRO ||
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-4o-mini";

type DeckPreviewSlide = {
  title?: string;
  body?: string;
  bullets?: string[];
  imagePrompts?: string[];
};

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
    const deck = body?.deck as PptDeck | undefined;
    const selectedIndex = Number.isInteger(body?.selectedIndex) ? Number(body.selectedIndex) : 0;

    if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
      return NextResponse.json({ error: "Missing deck payload" }, { status: 400 });
    }

    const safeSelectedIndex = Math.max(0, Math.min(deck.slides.length - 1, selectedIndex));
    const selectedSlide = deck.slides[safeSelectedIndex];
    const selectedPrompts =
      Array.isArray(selectedSlide?.visualItems) && selectedSlide.visualItems.length > 0
        ? selectedSlide.visualItems.map((item) => item?.prompt || "").filter(Boolean)
        : String(selectedSlide?.imagePrompt || "")
            .split(/\n+/)
            .map((value) => value.trim())
            .filter(Boolean);
    const selectedBodyBlocks = Array.isArray(selectedSlide?.bodyBlocks)
      ? selectedSlide.bodyBlocks.filter((value) => String(value || "").trim().length > 0)
      : [];
    const hasBodyStructure = selectedBodyBlocks.length > 0 || Boolean(selectedSlide?.body?.trim());
    const hasBulletStructure = Array.isArray(selectedSlide?.bullets) && selectedSlide.bullets.some((value) => String(value || "").trim().length > 0);
    const imageSlotCount = selectedPrompts.length;
    const prevSlide = safeSelectedIndex > 0 ? deck.slides[safeSelectedIndex - 1] : null;
    const nextSlide = safeSelectedIndex < deck.slides.length - 1 ? deck.slides[safeSelectedIndex + 1] : null;

    const systemPrompt = `You improve ONE selected presentation slide for live preview editing.

Return ONLY valid JSON with this exact shape:
{
  "slide": {
    "title": "string",
    "body": "string",
    "bullets": ["string"],
    "imagePrompts": ["string"]
  }
}

Rules:
- Improve ONLY the selected slide.
- Respect the user's designed structure exactly.
- Keep the meaning tightly aligned to the user's current body, bullets, and notes.
- Make the output more relevant, specific, and presentation-ready than the input.
- Do not echo the input unchanged unless it is already excellent.
- Title should be concise and slide-ready.
- Only return body text if the user provided body content on this slide. Otherwise return an empty string.
- Only return bullets if the user provided bullet content on this slide. Otherwise return an empty array.
- If the user created 0 image slots, return an empty imagePrompts array.
- Do not invent bullets from body text.
- Do not invent body text from bullets.
- Do not invent image prompts when no image slots exist.
- Body should be 2-4 strong sentences when body content exists.
- Bullets should be concrete, distinct, and teacher-friendly when bullets exist.
- If the selected slide has ${imageSlotCount} image slot(s), return exactly ${imageSlotCount} imagePrompts.
- imagePrompts should be short visual concepts only.
- No markdown, no prose outside JSON.`;

    const userPrompt = `Deck title: ${deck.title || ""}
Deck subtitle: ${deck.subtitle || ""}
Selected slide index: ${safeSelectedIndex + 1} of ${deck.slides.length}

Previous slide context:
${prevSlide ? `Title: ${prevSlide.title || ""}\nBullets: ${(prevSlide.bullets || []).join(" | ") || "(none)"}` : "(none)"}

Selected slide source of truth:
Title: ${selectedSlide?.title || ""}
Body: ${selectedSlide?.body || ""}
Body blocks: ${selectedBodyBlocks.join(" | ") || "(none)"}
Body enabled: ${hasBodyStructure ? "yes" : "no"}
Bullets: ${(selectedSlide?.bullets || []).join(" | ") || "(none)"}
Bullets enabled: ${hasBulletStructure ? "yes" : "no"}
Notes: ${selectedSlide?.notes || "(none)"}
Existing image prompts: ${selectedPrompts.join(" | ") || "(none)"}
Image slot count: ${imageSlotCount}

Next slide context:
${nextSlide ? `Title: ${nextSlide.title || ""}\nBullets: ${(nextSlide.bullets || []).join(" | ") || "(none)"}` : "(none)"}

Rewrite the selected slide so the preview is immediately useful, relevant, and presentation-quality.
Return ONLY the JSON object.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "QuizMintAI Deck Preview",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 1800,
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
    const parsedSlide = (parsed?.slide || {}) as DeckPreviewSlide;
    if (!hasBodyStructure) parsedSlide.body = "";
    if (!hasBulletStructure) parsedSlide.bullets = [];
    if (imageSlotCount === 0) parsedSlide.imagePrompts = [];
    const slideImages: Record<string, string> = {};
    if (Array.isArray(parsedSlide.imagePrompts) && imageSlotCount > 0) {
      const generatedPromptList = parsedSlide.imagePrompts.filter(Boolean);
      const limitedPrompts = Array.from({ length: imageSlotCount }, (_, index) => (
        generatedPromptList[index] || selectedPrompts[index] || ""
      )).filter(Boolean);
      for (let promptIndex = 0; promptIndex < limitedPrompts.length; promptIndex += 1) {
        const prompt = limitedPrompts[promptIndex];
        const imageData = await generateSlideImage(
          `Educational lesson slide illustration: ${prompt}`,
          { liteMode: false }
        );
        if (imageData) {
          slideImages[`generated-${safeSelectedIndex + 1}-${promptIndex + 1}`] = imageData;
        }
      }
    }

    const mergedSlides = deck.slides.map((slide, index) => {
      if (index !== safeSelectedIndex) {
        const originalPrompts =
          Array.isArray(slide.visualItems) && slide.visualItems.length > 0
            ? slide.visualItems.map((item) => item?.prompt || "").filter(Boolean)
            : String(slide.imagePrompt || "")
                .split(/\n+/)
                .map((value) => value.trim())
                .filter(Boolean);
        return {
          title: slide.title || "",
          body: slide.body || "",
          bullets: slide.bullets || [],
          imagePrompts: originalPrompts.slice(0, 6),
        };
      }

      const generated = parsedSlide;
      const originalPrompts =
        Array.isArray(slide.visualItems) && slide.visualItems.length > 0
          ? slide.visualItems.map((item) => item?.prompt || "").filter(Boolean)
          : String(slide.imagePrompt || "")
              .split(/\n+/)
              .map((value) => value.trim())
              .filter(Boolean);
      const slideSlotCount = Math.max(
        0,
        Array.isArray(slide.visualItems) && slide.visualItems.length > 0
          ? slide.visualItems.filter((item) => item?.id).length
          : String(slide.imagePrompt || "")
              .split(/\n+/)
              .map((value) => value.trim())
              .filter(Boolean)
              .length
      );
      const generatedBody =
        typeof generated?.body === "string" && generated.body.trim().length > 0
          ? generated.body.trim()
          : "";
      const hasSlideBodyStructure =
        (Array.isArray((slide as any)?.bodyBlocks) && (slide as any).bodyBlocks.some((value: string) => String(value || "").trim().length > 0)) ||
        Boolean(slide.body?.trim());
      const hasSlideBulletStructure =
        Array.isArray(slide.bullets) && slide.bullets.some((value) => String(value || "").trim().length > 0);
      const generatedBullets = Array.isArray(generated?.bullets)
        ? generated.bullets.filter(Boolean)
        : [];
      const fallbackBullets =
        !hasSlideBulletStructure
          ? []
          : generatedBullets.length > 0
            ? generatedBullets
            : slide.bullets || [];
      return {
        title: typeof generated?.title === "string" ? generated.title : slide.title || "",
        body: hasSlideBodyStructure ? (generatedBody || slide.body || "") : "",
        bullets: fallbackBullets.slice(0, 10),
        imagePrompts: slideSlotCount === 0
          ? []
          : Array.isArray(generated?.imagePrompts)
          ? Array.from(
              { length: slideSlotCount || Math.min(6, generated.imagePrompts.length) },
              (_, promptIndex) => generated.imagePrompts?.[promptIndex] || originalPrompts[promptIndex] || ""
            ).filter(Boolean)
          : originalPrompts.slice(0, 6),
      };
    });

    return NextResponse.json({
      title: deck.title,
      subtitle: deck.subtitle,
      selectedIndex: safeSelectedIndex,
      slide: mergedSlides[safeSelectedIndex],
      slideImages,
      slides: mergedSlides,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate deck preview." },
      { status: 500 }
    );
  }
}
