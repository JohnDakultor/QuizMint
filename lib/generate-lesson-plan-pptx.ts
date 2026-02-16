// lib/generate-lesson-plan-pptx.ts
import pptxgen from "pptxgenjs";
import type { PptDeck } from "@/lib/lesson-plan-ppt-ai";

const IMAGE_MODEL =
  process.env.HF_IMAGE_MODEL ||
  "stabilityai/stable-diffusion-xl-base-1.0";

const imageCache = new Map<string, string>();

async function generateSlideImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return null;
  const cached = imageCache.get(prompt);
  if (cached) return cached;

  const logPrefix = "[pptx-image]";
  const endpoint = `https://router.huggingface.co/hf-inference/models/${IMAGE_MODEL}`;
  const payload = {
    inputs: prompt,
    parameters: {
      negative_prompt: "blurry, low quality, watermark, text, logo, distorted",
    },
    options: { wait_for_model: true },
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type") || "";
    console.log(
      `${logPrefix} status=${res.status} content-type=${contentType} model=${IMAGE_MODEL}`
    );

    if (!res.ok) {
      if (res.status === 503 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      try {
        const text = await res.text();
        console.warn(`${logPrefix} error body:`, text.slice(0, 200));
      } catch {
        // ignore
      }
      return null;
    }

    if (!contentType.startsWith("image/")) {
      try {
        const text = await res.text();
        console.warn(`${logPrefix} non-image body:`, text.slice(0, 200));
      } catch {
        // ignore
      }
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    imageCache.set(prompt, dataUrl);
    return dataUrl;
  }

  return null;
}

function addTitleSlide(pptx: pptxgen, title: string, subtitle?: string) {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.7,
    y: 1.2,
    w: 12.0,
    h: 1.0,
    fontSize: 40,
    bold: true,
    color: "1E40AF",
    fontFace: "Aptos",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.7,
      y: 2.2,
      w: 12.0,
      h: 0.6,
      fontSize: 20,
      color: "4B5563",
      fontFace: "Aptos",
    });
  }
}

function addBulletedSlide(
  pptx: pptxgen,
  title: string,
  bullets: string[],
  notes?: string,
  body?: string,
  imageData?: string
) {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.6,
    y: 0.4,
    w: 12.2,
    h: 0.6,
    fontSize: 30,
    bold: true,
    color: "111827",
    fontFace: "Aptos",
  });

  const cleanBullets = bullets
    .map((b) => (b || "").trim())
    .filter((b) => b.length > 0)
    .map((b) => (b.length > 160 ? b.slice(0, 159) + "…" : b));
  const bodyText = (body || "").trim();
  const showBullets = cleanBullets.length > 0;

  const textW = imageData ? 6.4 : 12.0;
  const textX = imageData ? 0.7 : 0.9;
  if (bodyText) {
    slide.addText(bodyText, {
      x: textX,
      y: 1.2,
      w: textW,
      h: showBullets ? 2.0 : 4.8,
      fontSize: 18,
      color: "1F2937",
      fontFace: "Aptos",
      valign: "top",
    });
  }

  const content = showBullets ? cleanBullets : ["See lesson plan for details."];
  const runs = content.map((text) => ({
    text,
    options: { bullet: { indent: 22 }, hanging: 6 },
  }));

  slide.addText(runs, {
    x: textX,
    y: bodyText ? 3.3 : 1.6,
    w: textW,
    h: bodyText ? 3.4 : 5.4,
    fontSize: 18,
    color: "1F2937",
    fontFace: "Aptos",
    valign: "top",
  });

  if (notes) {
    slide.addNotes(notes);
  }

  if (imageData) {
    slide.addImage({
      data: imageData,
      x: 7.2,
      y: 1.3,
      w: 5.5,
      h: 4.6,
    });
  }
}

export async function generateLessonPlanPptx(deck: PptDeck): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Quizmints AI";
  pptx.company = "Quizmints";
  pptx.subject = "Lesson Plan Slides";
  pptx.title = deck.title || "Lesson Plan";

  addTitleSlide(pptx, deck.title || "Lesson Plan", deck.subtitle);

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    let imageData: string | null = null;
    if (i < 5) {
      const promptParts =
        slide.imagePrompt ||
        [deck.title, slide.title, slide.body].filter(Boolean).join(" - ").slice(0, 300);
      if (promptParts) {
        imageData = await generateSlideImage(
          `Educational illustration about ${promptParts}`
        );
      }
    }
    addBulletedSlide(
      pptx,
      slide.title,
      slide.bullets || [],
      slide.notes,
      slide.body,
      imageData || undefined
    );
  }

  const buffer = await pptx.write({
  outputType: "nodebuffer"
}) as Buffer;
  return buffer;
}
