import { YouTubeTranscriptApi, TranscriptResponse } from "youtube-transcript-ts";


async function extractTextFromURL(url: string) {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const text = $("p")
    .map((i: number, el: cheerio.Element) => $(el).text())
    .get()
    .join("\n\n");

  return text;
}

async function extractYouTubeTranscript(url: string): Promise<string> {
  const parsedUrl = new URL(url);
  const videoId = parsedUrl.searchParams.get("v") || parsedUrl.pathname.split("/").pop();
  if (!videoId) throw new Error("Invalid YouTube URL");

  const apiTranscript = new YouTubeTranscriptApi();
  const transcriptResponse: TranscriptResponse = await apiTranscript.fetchTranscript(videoId);

  // transcriptResponse.transcripts is an array of Transcript objects
  if (!transcriptResponse?.transcripts?.length) return "";

  // Explicitly type each transcript item
  return transcriptResponse.transcripts
    .map((t) => t.text) // `t` is of type Transcript
    .join(" ");
}