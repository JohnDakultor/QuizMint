import { NextResponse } from "next/server";

const MODEL =
  process.env.HF_IMAGE_MODEL ||
  "stabilityai/stable-diffusion-xl-base-1.0";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing HF_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const negativePrompt =
      typeof body?.negativePrompt === "string"
        ? body.negativePrompt
        : "blurry, low quality, distorted, watermark, text, logo";

    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: negativePrompt,
          },
          options: { wait_for_model: true },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Hugging Face error", details: errorText },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ image: dataUrl, model: MODEL });
  } catch (err: any) {
    console.error("generate-image error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
