export class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`);
  }
}

/**
 * This function DOES NOT fetch real captions.
 * It fetches YouTube title + description using the official API.
 * This is the ONLY stable approach without OAuth.
 */
export async function fetchTranscript(
  videoId: string
): Promise<
  {
    text: string;
    offset: number;
    duration: number;
  }[]
> {
  try {
    console.log("🎬 Fetching YouTube metadata for video:", videoId);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YT_API_KEY}`
    );

    if (!res.ok) {
      throw new YoutubeTranscriptError(
        `YouTube API error: ${res.status}`
      );
    }

    const data = (await res.json()) as {
      items?: {
        snippet?: {
          title?: string;
          description?: string;
        };
      }[];
    };

    const snippet = data.items?.[0]?.snippet;

    if (!snippet) {
      throw new YoutubeTranscriptError("No snippet data found");
    }

    const title = snippet.title ?? "";
    const description = snippet.description ?? "";

    console.log("✅ YOUTUBE CONTENT FETCHED");
    console.log("📌 TITLE:", title);
    console.log("📝 DESCRIPTION:", description);

    const combinedText = `${title}\n\n${description}`.trim();

    if (!combinedText) {
      throw new YoutubeTranscriptError("Empty YouTube content");
    }

    /**
     * Return format matches your old transcript structure
     * so the rest of your app DOES NOT BREAK
     */
    return [
      {
        text: combinedText,
        offset: 0,
        duration: 0,
      },
    ];
  } catch (err: any) {
    console.error("❌ YouTube fetch failed:", err);
    throw new YoutubeTranscriptError(err.message || "Unknown error");
  }
}
