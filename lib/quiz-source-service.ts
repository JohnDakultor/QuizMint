import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { fetchTranscript } from "@/lib/youtube-transcript";
import { normalizeForEmbedding } from "@/lib/rag/embed";
import { log } from "@/lib/logger";

interface YouTubeSnippet {
  title: string;
  description: string;
}

interface YouTubeAPIResponse {
  items?: { snippet?: YouTubeSnippet }[];
}

export function chunkText(text: string, chunkSize = 1200, overlap = 200) {
  const cleaned = normalizeForEmbedding(text);
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = Math.max(end - overlap, 0);
  }
  return chunks;
}

export function buildBalancedContentWindow(text: string, maxChars = 8000): string {
  if (!text || text.length <= maxChars) return text;

  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;

  const part = Math.floor(maxChars / 3);
  const top = clean.slice(0, part);
  const midStart = Math.max(Math.floor(clean.length / 2) - Math.floor(part / 2), 0);
  const middle = clean.slice(midStart, midStart + part);
  const bottom = clean.slice(Math.max(clean.length - part, 0));

  return `${top}\n\n${middle}\n\n${bottom}`.slice(0, maxChars);
}

export function isURL(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function normalizeQuestionCountInput(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

export async function extractTextFromURL(
  url: string,
): Promise<{ text: string; title: string }> {
  try {
    const googleExtracted = await tryExtractGoogleFileText(url);
    if (googleExtracted) {
      return googleExtracted;
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw new Error(`URL fetch failed: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, iframe, svg, nav, footer, header, aside, form").remove();

    const title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").first().text().trim() ||
      $("h1").first().text().trim() ||
      "";

    const selectors = [
      "article p",
      "main p",
      '[role="main"] p',
      ".post-content p",
      ".entry-content p",
      ".article-content p",
      ".content p",
    ];

    let text = "";
    for (const selector of selectors) {
      const candidate = $(selector)
        .map((_: number, el: cheerio.Element) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join("\n\n");
      if (candidate.length > text.length) text = candidate;
    }

    if (!text) {
      text = $("p")
        .map((_: number, el: cheerio.Element) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join("\n\n");
    }

    if (!text) {
      text = $("main, article, body")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
    }

    return { text, title };
  } catch (err) {
    log.warn("url_extract_failed", { err });
    return { text: "", title: "" };
  }
}

function extractGoogleResourceId(url: string, kind: "document" | "spreadsheets" | "presentation"): string | null {
  const byPath = url.match(new RegExp(`/${kind}/d/([a-zA-Z0-9_-]+)`));
  if (byPath?.[1]) return byPath[1];
  const parsed = new URL(url);
  const qId = parsed.searchParams.get("id");
  if (qId) return qId;
  return null;
}

function extractDriveFileId(url: string): string | null {
  const byPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath?.[1]) return byPath[1];
  const parsed = new URL(url);
  return parsed.searchParams.get("id");
}

async function fetchGoogleExportText(
  exportUrl: string,
  title: string,
): Promise<{ text: string; title: string } | null> {
  const res = await fetch(exportUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Accept: "text/plain,text/csv,text/html,application/octet-stream",
    },
    redirect: "follow",
  });
  if (!res.ok) return null;

  const contentType = String(res.headers.get("content-type") || "").toLowerCase();
  const rawText = await res.text();
  if (!rawText?.trim()) return null;

  if (contentType.includes("text/plain") || contentType.includes("text/csv")) {
    return { text: rawText, title };
  }

  // Some Google exports return HTML/login wrappers; strip to visible text.
  const $ = cheerio.load(rawText);
  $("script, style, noscript, iframe, svg, nav, footer, header, aside, form").remove();
  const htmlText = $("main, article, body")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  if (!htmlText) return null;
  return { text: htmlText, title };
}

async function tryExtractGoogleFileText(url: string): Promise<{ text: string; title: string } | null> {
  try {
    if (!url.includes("google.com")) return null;

    if (url.includes("docs.google.com/document/")) {
      const id = extractGoogleResourceId(url, "document");
      if (!id) return null;
      return await fetchGoogleExportText(
        `https://docs.google.com/document/d/${id}/export?format=txt`,
        "Google Doc",
      );
    }

    if (url.includes("docs.google.com/spreadsheets/")) {
      const id = extractGoogleResourceId(url, "spreadsheets");
      if (!id) return null;
      return await fetchGoogleExportText(
        `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`,
        "Google Sheet",
      );
    }

    if (url.includes("docs.google.com/presentation/")) {
      const id = extractGoogleResourceId(url, "presentation");
      if (!id) return null;
      // Best-effort: Slides text export is only available for shared/exportable files.
      return await fetchGoogleExportText(
        `https://docs.google.com/presentation/d/${id}/export/txt`,
        "Google Slides",
      );
    }

    if (url.includes("drive.google.com/file/") || url.includes("drive.google.com/open")) {
      const id = extractDriveFileId(url);
      if (!id) return null;
      return await fetchGoogleExportText(
        `https://drive.google.com/uc?export=download&id=${id}`,
        "Google Drive File",
      );
    }

    return null;
  } catch (err) {
    log.warn("google_file_extract_failed", { err, url });
    return null;
  }
}

async function transformYoutubeData(data: Array<{ text?: string }>) {
  let text = "";
  data.forEach((item) => {
    text += item.text + "\n";
  });
  return { data, text: text.trim() };
}

export async function extractYouTubeTranscript(videoId: string) {
  try {
    const transcript = await fetchTranscript(videoId);
    const transformData = await transformYoutubeData(transcript);
    log.debug("youtube_transcript_extracted", {
      videoId,
      segmentCount: Array.isArray(transcript) ? transcript.length : 0,
      textChars: transformData.text.length,
    });
    return transformData.text;
  } catch (err) {
    log.warn("youtube_transcript_failed", { videoId, err });
    return "";
  }
}

export async function fetchYouTubeMetadata(videoId: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YT_API_KEY}`
  );

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = (await res.json()) as YouTubeAPIResponse;
  const snippet = data.items?.[0]?.snippet;

  return {
    title: snippet?.title || "",
    description: snippet?.description || "",
  };
}
