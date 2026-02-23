import { NextResponse } from "next/server";

const OR_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL ||
  "google/gemini-2.5-flash-image-preview";

const HF_MODEL =
  process.env.HF_IMAGE_MODEL ||
  "stabilityai/stable-diffusion-xl-base-1.0";

function toDataUrlFromBase64(base64: string) {
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
    return toDataUrlFromBase64(base64);
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
        return toDataUrlFromBase64(partBase64);
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
    const dataUrlMatch = content.match(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUrlMatch?.[0]) return dataUrlMatch[0];
    const markdownUrlMatch = content.match(/\((https?:\/\/[^)\s]+)\)/);
    if (markdownUrlMatch?.[1]) return toDataUrlFromRemoteUrl(markdownUrlMatch[1]);
  }

  return null;
}

async function toDataUrlFromRemoteUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch generated image URL");
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return toDataUrlFromBase64(base64);
}

async function generateWithOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "QuizMintAI",
    },
    body: JSON.stringify({
      model: OR_MODEL,
      modalities: ["image", "text"],
      messages: [
        {
          role: "user",
          content:
            `Generate exactly one educational image. No markdown. No explanation text.\n` +
            `Topic prompt: ${prompt}`,
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `OpenRouter image error: ${response.status} ${JSON.stringify(data)}`
    );
  }

  const parsedImage = await extractOpenRouterImageDataUrl(data);
  if (parsedImage) return parsedImage;

  throw new Error("OpenRouter image response did not include image data");
}

async function generateWithHuggingFace(prompt: string): Promise<string> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) throw new Error("Missing HF_API_KEY");

  const negativePrompt =
    "blurry, low quality, distorted, watermark, text, logo";

  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { negative_prompt: negativePrompt },
        options: { wait_for_model: true },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face error: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return toDataUrlFromBase64(base64);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (process.env.OPENROUTER_API_KEY) {
      const image = await generateWithOpenRouter(prompt);
      return NextResponse.json({ image, provider: "openrouter", model: OR_MODEL });
    }

    const image = await generateWithHuggingFace(prompt);
    return NextResponse.json({ image, provider: "huggingface", model: HF_MODEL });
  } catch (err: any) {
    console.error("generate-image error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
