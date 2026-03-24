// lib/generate-lesson-plan-pptx.ts
import pptxgen from "pptxgenjs";
import type { PptDeck, PptSlide } from "@/lib/lesson-plan-ppt-ai";
import { buildSlideRenderModel, getBlockTextStyle, getPreferredSlideImage } from "@/lib/pptx";

const OR_IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL ||
  "google/gemini-2.5-flash-image-preview";
const HF_IMAGE_MODEL =
  process.env.HF_IMAGE_MODEL || "stabilityai/stable-diffusion-xl-base-1.0";

const imageCache = new Map<string, string>();

async function toDataUrlFromRemoteUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch generated image URL");
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}

async function extractOpenRouterImageDataUrl(data: any): Promise<string | null> {
  const message = data?.choices?.[0]?.message;
  if (!message) return null;

  const imageNode = message?.images?.[0];
  const base64 =
    imageNode?.image_base64 ||
    imageNode?.b64_json ||
    imageNode?.base64 ||
    imageNode?.data;
  const remoteUrl =
    imageNode?.image_url?.url || imageNode?.image_url || imageNode?.url;
  if (typeof base64 === "string" && base64.length > 0) {
    return `data:image/png;base64,${base64}`;
  }
  if (typeof remoteUrl === "string" && remoteUrl.length > 0) {
    return toDataUrlFromRemoteUrl(remoteUrl);
  }

  const content = message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const partBase64 =
        part?.image_base64 || part?.b64_json || part?.base64 || part?.data;
      if (typeof partBase64 === "string" && partBase64.length > 0) {
        return `data:image/png;base64,${partBase64}`;
      }
      const partUrl =
        part?.image_url?.url || part?.image_url || part?.url || part?.href;
      if (typeof partUrl === "string" && partUrl.startsWith("data:image/")) {
        return partUrl;
      }
      if (typeof partUrl === "string" && /^https?:\/\//.test(partUrl)) {
        return toDataUrlFromRemoteUrl(partUrl);
      }
    }
  }

  if (typeof content === "string") {
    const dataUrlMatch = content.match(
      /data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/
    );
    if (dataUrlMatch?.[0]) return dataUrlMatch[0];
    const markdownUrlMatch = content.match(/\((https?:\/\/[^)\s]+)\)/);
    if (markdownUrlMatch?.[1]) return toDataUrlFromRemoteUrl(markdownUrlMatch[1]);
  }

  return null;
}

export async function generateSlideImage(
  prompt: string,
  options?: { liteMode?: boolean }
): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const hfKey = process.env.HF_API_KEY;
  if (!openRouterKey && !hfKey) return null;
  const cacheKey = `${options?.liteMode ? "lite" : "full"}:${prompt}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  const logPrefix = "[pptx-image]";
  const endpoint = openRouterKey
    ? "https://openrouter.ai/api/v1/chat/completions"
    : `https://router.huggingface.co/hf-inference/models/${HF_IMAGE_MODEL}`;
  const payload = openRouterKey
    ? {
        model: OR_IMAGE_MODEL,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content:
              `Generate exactly one educational image. No markdown. No explanation text.\n` +
              (options?.liteMode
                ? "Use simple composition and lower detail to keep it lightweight.\n"
                : "") +
              `Topic prompt: ${prompt}`,
          },
        ],
      }
    : {
        inputs: prompt,
        parameters: {
          negative_prompt: "blurry, low quality, watermark, text, logo, distorted",
        },
        options: { wait_for_model: true },
      };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey || hfKey}`,
          "Content-Type": "application/json",
          ...(openRouterKey
            ? {
                "HTTP-Referer":
                  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "QuizMintAI",
              }
            : { Accept: "image/png" }),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`${logPrefix} request failed (attempt ${attempt + 1}):`, err);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }

    const contentType = res.headers.get("content-type") || "";
    console.log(
      `${logPrefix} status=${res.status} content-type=${contentType} model=${
        openRouterKey ? OR_IMAGE_MODEL : HF_IMAGE_MODEL
      }`
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

    if (openRouterKey) {
      try {
        const data = await res.json();
        const dataUrl = await extractOpenRouterImageDataUrl(data);
        if (dataUrl) {
          imageCache.set(cacheKey, dataUrl);
          return dataUrl;
        }
        const contentPreview = JSON.stringify(
          data?.choices?.[0]?.message?.content || ""
        ).slice(0, 180);
        const messageKeys = Object.keys(data?.choices?.[0]?.message || {});
        console.warn(
          `${logPrefix} openrouter returned no image field. keys=${JSON.stringify(
            messageKeys
          )} content preview=${contentPreview}`
        );
        return null;
      } catch (err) {
        console.warn(`${logPrefix} failed to parse openrouter image body:`, err);
        return null;
      }
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

    try {
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;
      imageCache.set(cacheKey, dataUrl);
      return dataUrl;
    } catch (err) {
      console.warn(`${logPrefix} failed to read image body:`, err);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      return null;
    }
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
  slideInput: PptSlide,
  imageData?: string
) {
  const slide = pptx.addSlide();
  const renderModel = buildSlideRenderModel({
    ...slideInput,
    imageData: imageData || slideInput.imageData,
  });
  slide.background = {
    color: renderModel.backgroundColor.replace(/^#/, ""),
  };

  if (renderModel.backgroundImage) {
    slide.addImage({
      data: renderModel.backgroundImage.imageData,
      x: renderModel.backgroundImage.box.x,
      y: renderModel.backgroundImage.box.y,
      w: renderModel.backgroundImage.box.w,
      h: renderModel.backgroundImage.box.h,
      transparency: renderModel.backgroundImage.transparency,
    });
  }

  slide.addText(renderModel.title.text, {
    x: renderModel.title.box.x,
    y: renderModel.title.box.y,
    w: renderModel.title.box.w,
    h: renderModel.title.box.h,
    fontSize: renderModel.title.fontSize,
    bold: getBlockTextStyle(slideInput as any, "title").bold,
    italic: getBlockTextStyle(slideInput as any, "title").italic,
    color: renderModel.title.color,
    fontFace: renderModel.fontFace,
    align: renderModel.title.textAlign,
  });
  renderModel.bodyBlocks.forEach((block) => {
    const textStyle = getBlockTextStyle(slideInput as any, block.key);
    slide.addText(block.text, {
      x: block.box.x,
      y: block.box.y,
      w: block.box.w,
      h: block.box.h,
      fontSize: block.fontSize,
      bold: textStyle.bold,
      italic: textStyle.italic,
      color: block.color,
      fontFace: renderModel.fontFace,
      align: block.textAlign,
      margin: 0,
      valign: "top",
    });
  });

  renderModel.bullets.forEach((bullet) => {
    const textStyle = getBlockTextStyle(slideInput as any, bullet.key);
    slide.addText(`• ${bullet.text}`, {
      x: bullet.box.x,
      y: bullet.box.y,
      w: bullet.box.w,
      h: bullet.box.h,
      fontSize: bullet.fontSize,
      bold: textStyle.bold,
      italic: textStyle.italic,
      color: bullet.color,
      fontFace: renderModel.fontFace,
      align: bullet.textAlign,
      margin: 0,
      valign: "middle",
    });
  });

  renderModel.visuals.forEach((visual) => {
    if (visual.imageData) {
      const inset = visual.imageInset ?? 0;
      const imageHeight = inset === 0
        ? visual.box.h
        : Math.max(0.8, Math.min(visual.box.h, visual.box.h * (visual.imageHeightRatio ?? 0.72)));
      slide.addImage({
        data: visual.imageData,
        x: visual.box.x + inset,
        y: visual.box.y + inset,
        w: Math.max(0.4, visual.box.w - inset * 2),
        h: imageHeight,
      });
    }
  });

  if (renderModel.notes) {
    slide.addNotes(renderModel.notes);
  }
}

export async function generateLessonPlanPptx(
  deck: PptDeck,
  options?: { liteMode?: boolean }
): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Quizmints AI";
  pptx.company = "Quizmints";
  pptx.subject = "Lesson Plan Slides";
  pptx.title = deck.title || "Lesson Plan";

  addTitleSlide(pptx, deck.title || "Lesson Plan", deck.subtitle);

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    const imageData = getPreferredSlideImage(slide) || undefined;
    addBulletedSlide(pptx, slide, imageData);
  }

  const buffer = await pptx.write({
  outputType: "nodebuffer"
}) as Buffer;
  return buffer;
}

