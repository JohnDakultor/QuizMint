import { YoutubeTranscript } from "youtube-transcript";

export class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`);
  }
}

export function extractYouTubeVideoId(urlOrId: string): string | null {
  const input = String(urlOrId || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/").filter(Boolean)[1] || null;
    }
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean)[1] || null;
    }
    return url.searchParams.get("v");
  } catch {
    return null;
  }
}

function cleanTranscriptText(value: string) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchTranscript(
  videoIdOrUrl: string
): Promise<
  {
    text: string;
    offset: number;
    duration: number;
  }[]
> {
  const videoId = extractYouTubeVideoId(videoIdOrUrl);
  if (!videoId) {
    throw new YoutubeTranscriptError("Could not extract YouTube video ID");
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
    const cleaned = transcript
      .map((item) => ({
        text: cleanTranscriptText(item.text),
        offset: item.offset,
        duration: item.duration,
      }))
      .filter((item) => item.text);

    if (!cleaned.length) {
      throw new YoutubeTranscriptError("No captions found for this video");
    }

    return cleaned;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown transcript error";
    throw new YoutubeTranscriptError(message);
  }
}
