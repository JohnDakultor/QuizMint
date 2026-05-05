import mammoth from "mammoth";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { JWT } from "google-auth-library";
import pptxTextParser from "pptx-text-parser";
import { parseOffice } from "officeparser";
import JSZip from "jszip";
import { parse as parseHtml } from "node-html-parser";
import {
  buildFileExtractionCacheKey,
  deleteCachedFileExtraction,
  deleteCachedPdfDetailedExtraction,
  getCachedFileExtraction,
  getCachedPdfDetailedExtraction,
} from "@/lib/source-extraction-cache";

export const SUPPORTED_TEXT_EXTRACTION_EXTENSIONS = new Set([
  "txt",
  "docx",
  "pdf",
  "epub",
  "ppt",
  "pptx",
  "xlsx",
  "csv",
  "md",
]);

export type PdfExtractionMethod =
  | "pdf-parse"
  | "pdfjs"
  | "binary-fallback"
  | "ocr"
  | "none";

export type UploadedExtractionMethod =
  | PdfExtractionMethod
  | "text"
  | "docx"
  | "xlsx"
  | "pptx"
  | "epub";

const PDF_OCR_MIN_WORDS_TO_SKIP = Math.max(
  800,
  Number(process.env.FILE_TEXT_EXTRACTION_PDF_OCR_SKIP_WORDS || 2500),
);
const PDF_OCR_MIN_CHARS_TO_SKIP = Math.max(
  5000,
  Number(process.env.FILE_TEXT_EXTRACTION_PDF_OCR_SKIP_CHARS || 18000),
);
const PDF_OCR_MAX_PAGES = Math.max(
  1,
  Number(process.env.FILE_TEXT_EXTRACTION_PDF_OCR_MAX_PAGES || 60),
);
const GOOGLE_DRIVE_OCR_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_CLOUD_VISION_SCOPE =
  "https://www.googleapis.com/auth/cloud-platform";
const GOOGLE_DRIVE_MULTIPART_MAX_BYTES = 5 * 1024 * 1024;
const GOOGLE_CLOUD_VISION_BATCH_PAGES = 5;
const GOOGLE_CLOUD_VISION_MAX_PAGES = Math.max(
  1,
  Number(process.env.FILE_TEXT_EXTRACTION_GOOGLE_VISION_MAX_PAGES || 25),
);

let cachedGoogleDriveAccessToken: {
  token: string;
  expiresAt: number;
} | null = null;
let cachedGoogleVisionAccessToken: {
  token: string;
  expiresAt: number;
} | null = null;

export function normalizeExtractedText(text: string): string {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

async function loadGoogleServiceAccountRecord(): Promise<
  Record<string, unknown>
> {
  const filePath =
    process.env.GOOGLE_TTS_SERVICE_ACCOUNT_FILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (filePath) {
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents) as Record<string, unknown>;
  }

  const raw =
    process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!raw) {
    throw new Error("Google service account credentials are not configured.");
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return JSON.parse(raw.replace(/\r?\n/g, "")) as Record<string, unknown>;
  }
}

async function getGoogleDriveAccessToken() {
  if (
    cachedGoogleDriveAccessToken &&
    cachedGoogleDriveAccessToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedGoogleDriveAccessToken.token;
  }

  const parsed = await loadGoogleServiceAccountRecord();
  const clientEmail =
    typeof parsed.client_email === "string" ? parsed.client_email : "";
  const privateKey =
    typeof parsed.private_key === "string" ? parsed.private_key : "";
  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google service account credentials must include client_email and private_key.",
    );
  }

  const client = new JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: [GOOGLE_DRIVE_OCR_SCOPE],
  });

  const { access_token: accessToken, expiry_date: expiryDate } =
    await client.authorize();
  if (!accessToken) {
    throw new Error("Failed to obtain Google Drive access token.");
  }

  cachedGoogleDriveAccessToken = {
    token: accessToken,
    expiresAt:
      typeof expiryDate === "number" ? expiryDate : Date.now() + 45 * 60 * 1000,
  };

  return accessToken;
}

async function getGoogleVisionAccessToken() {
  if (
    cachedGoogleVisionAccessToken &&
    cachedGoogleVisionAccessToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedGoogleVisionAccessToken.token;
  }

  const parsed = await loadGoogleServiceAccountRecord();
  const clientEmail =
    typeof parsed.client_email === "string" ? parsed.client_email : "";
  const privateKey =
    typeof parsed.private_key === "string" ? parsed.private_key : "";
  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google service account credentials must include client_email and private_key.",
    );
  }

  const client = new JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: [GOOGLE_CLOUD_VISION_SCOPE],
  });

  const { access_token: accessToken, expiry_date: expiryDate } =
    await client.authorize();
  if (!accessToken) {
    throw new Error("Failed to obtain Google Cloud Vision access token.");
  }

  cachedGoogleVisionAccessToken = {
    token: accessToken,
    expiresAt:
      typeof expiryDate === "number" ? expiryDate : Date.now() + 45 * 60 * 1000,
  };

  return accessToken;
}

function scoreNarrationReadiness(text: string): number {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return 0;

  const words = normalized.match(/\S+/g) || [];
  const alphaCharacters = (normalized.match(/[A-Za-z]/g) || []).length;
  const totalCharacters = normalized.length || 1;
  const alphaRatio = alphaCharacters / totalCharacters;
  const paragraphCount = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean).length;
  const sentenceCount = (normalized.match(/[.!?](?:\s|$)/g) || []).length;
  const lowercaseToUppercaseJumps = (normalized.match(/[a-z][A-Z]/g) || [])
    .length;
  const smashedPunctuation = (
    normalized.match(/[a-zA-Z0-9][:/-][A-Z][a-z]/g) || []
  ).length;

  let score = 0;
  score += Math.min(words.length / 120, 12);
  score += Math.min(sentenceCount / 15, 8);
  score += Math.min(paragraphCount / 8, 6);
  score += alphaRatio * 10;
  score -= Math.min(lowercaseToUppercaseJumps / 6, 6);
  score -= Math.min(smashedPunctuation / 8, 4);

  return score;
}

function looksLikePdfArtifactText(text: string): boolean {
  const sample = String(text || "").slice(0, 6000);
  if (!sample) return false;

  const suspiciousPatterns = [
    /%PDF-\d\.\d/i,
    /\bendobj\b/i,
    /\bstream\b/i,
    /\bendstream\b/i,
    /\b\/Type\s*\/Page\b/i,
    /\b\/Subtype\s*\/Image\b/i,
    /\bxref\b/i,
    /\btrailer\b/i,
    /\bstartxref\b/i,
    /\bFontDescriptor\b/i,
  ];

  const hits = suspiciousPatterns.reduce(
    (count, pattern) => count + (pattern.test(sample) ? 1 : 0),
    0,
  );

  const slashDirectiveCount = (sample.match(/\/[A-Za-z][A-Za-z0-9]+/g) || [])
    .length;
  const objCount = (sample.match(/\b\d+\s+\d+\s+obj\b/g) || []).length;

  return hits >= 3 || slashDirectiveCount >= 25 || objCount >= 3;
}

function looksLikeUsablePdfText(text: string): boolean {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return false;

  const words = normalized.match(/\S+/g) || [];
  if (words.length >= 120) return true;

  const alphaCharacters = (normalized.match(/[A-Za-z]/g) || []).length;
  const totalCharacters = normalized.length || 1;
  const alphaRatio = alphaCharacters / totalCharacters;

  return words.length >= 40 && alphaRatio >= 0.45;
}

function hasSubstantialRecoverablePdfText(text: string): boolean {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return false;

  const words = normalized.match(/\S+/g) || [];
  const alphaCharacters = (normalized.match(/[A-Za-z]/g) || []).length;
  const totalCharacters = normalized.length || 1;
  const alphaRatio = alphaCharacters / totalCharacters;
  const digitCharacters = (normalized.match(/\d/g) || []).length;
  const digitRatio = digitCharacters / totalCharacters;

  if (words.length >= 180 && alphaRatio >= 0.22) return true;
  if (normalized.length >= 1200 && alphaRatio >= 0.18 && digitRatio <= 0.45)
    return true;
  if (scoreNarrationReadiness(normalized) >= 7.5 && words.length >= 90)
    return true;

  return false;
}

function shouldTryOcrForPdfText(
  text: string,
  context?: { pageCount?: number; method?: PdfExtractionMethod },
): boolean {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return true;
  if (looksLikePdfArtifactText(normalized)) return true;

  const words = normalized.match(/\S+/g) || [];
  if (words.length >= PDF_OCR_MIN_WORDS_TO_SKIP) return false;
  if (normalized.length >= PDF_OCR_MIN_CHARS_TO_SKIP) return false;

  const sentenceCount = (normalized.match(/[.!?](?:\s|$)/g) || []).length;
  const paragraphCount = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean).length;
  const readinessScore = scoreNarrationReadiness(normalized);
  const pageCountExceeded =
    Number(context?.pageCount || 0) > PDF_OCR_MAX_PAGES &&
    (context?.method === "pdf-parse" || context?.method === "pdfjs");

  if (pageCountExceeded) {
    if (words.length < 250) return true;
    if (sentenceCount < 8) return true;
    if (paragraphCount <= 2) return true;
    return readinessScore < 13;
  }

  if (words.length < 120) return true;
  if (sentenceCount < 4) return true;
  if (paragraphCount <= 1 && words.length > 500) return true;

  return readinessScore < 11;
}

function chooseBetterPdfExtraction(
  primary: { text: string; method: PdfExtractionMethod },
  secondary: { text: string; method: PdfExtractionMethod },
) {
  const primaryNormalized = normalizeExtractedText(primary.text);
  const secondaryNormalized = normalizeExtractedText(secondary.text);

  if (!primaryNormalized) {
    return { text: secondaryNormalized, method: secondary.method };
  }
  if (!secondaryNormalized) {
    return { text: primaryNormalized, method: primary.method };
  }

  const primaryScore = scoreNarrationReadiness(primaryNormalized);
  const secondaryScore = scoreNarrationReadiness(secondaryNormalized);

  if (secondaryScore >= primaryScore + 1.5) {
    return { text: secondaryNormalized, method: secondary.method };
  }

  if (
    secondaryNormalized.length > primaryNormalized.length * 1.3 &&
    secondaryScore >= primaryScore
  ) {
    return { text: secondaryNormalized, method: secondary.method };
  }

  return { text: primaryNormalized, method: primary.method };
}

export function splitTextIntoParagraphChunks(
  text: string,
  maxChunkChars = 1100,
): string[] {
  const clean = normalizeExtractedText(text);
  if (!clean) return [];
  const splitOversizedParagraph = (paragraph: string): string[] => {
    if (paragraph.length <= maxChunkChars) return [paragraph];

    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length <= 1) {
      const fallbackChunks: string[] = [];
      for (let start = 0; start < paragraph.length; start += maxChunkChars) {
        fallbackChunks.push(
          paragraph.slice(start, start + maxChunkChars).trim(),
        );
      }
      return fallbackChunks.filter(Boolean);
    }

    const sentenceChunks: string[] = [];
    let currentSentenceChunk = "";
    for (const sentence of sentences) {
      if (!currentSentenceChunk) {
        currentSentenceChunk = sentence;
        continue;
      }

      const candidate = `${currentSentenceChunk} ${sentence}`.trim();
      if (candidate.length > maxChunkChars) {
        sentenceChunks.push(currentSentenceChunk.trim());
        currentSentenceChunk = sentence;
      } else {
        currentSentenceChunk = candidate;
      }
    }

    if (currentSentenceChunk) {
      sentenceChunks.push(currentSentenceChunk.trim());
    }

    return sentenceChunks.flatMap((chunk) =>
      chunk.length > maxChunkChars ? splitOversizedParagraph(chunk) : [chunk],
    );
  };

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [clean.slice(0, maxChunkChars)];

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const paragraphPieces = splitOversizedParagraph(paragraph);
    for (const piece of paragraphPieces) {
      const candidate = current ? `${current}\n\n${piece}` : piece;
      if (candidate.length > maxChunkChars) {
        if (current) chunks.push(current.trim());
        current = piece;
        continue;
      }
      current = candidate;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

export function deriveTopicFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function dirnamePosix(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(0, idx) : "";
}

function joinPosix(baseDir: string, target: string) {
  const stack = (baseDir ? baseDir.split("/") : []).filter(Boolean);
  for (const part of target.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return stack.join("/");
}

function decodeXmlText(value: string) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToReadableText(markup: string) {
  const root = parseHtml(String(markup || ""), {
    blockTextElements: {
      script: false,
      noscript: false,
      style: false,
      pre: true,
    },
  });

  root
    .querySelectorAll("script,style,noscript")
    .forEach((node) => node.remove());
  root.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  root
    .querySelectorAll("p,div,section,article,li,blockquote,h1,h2,h3,h4,h5,h6")
    .forEach((node) => {
      const existing = node.innerHTML || "";
      if (!existing.endsWith("\n")) {
        node.set_content(`${existing}\n`);
      }
    });

  return normalizeExtractedText(decodeXmlText(root.text));
}

async function extractTextFromEpub(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(Buffer.from(arrayBuffer));
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    throw new Error("Invalid EPUB: META-INF/container.xml is missing");
  }

  const containerXml = await containerFile.async("string");
  const containerMatch = containerXml.match(/full-path="([^"]+)"/i);
  const opfPath = containerMatch?.[1];
  if (!opfPath) {
    throw new Error("Invalid EPUB: package document path was not found");
  }

  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error("Invalid EPUB: package document is missing");
  }

  const opfXml = await opfFile.async("string");
  const opfDir = dirnamePosix(opfPath);

  const manifest = new Map<string, string>();
  for (const match of opfXml.matchAll(
    /<item\b[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*>/gi,
  )) {
    manifest.set(match[1], joinPosix(opfDir, match[2]));
  }

  const orderedContentPaths: string[] = [];
  for (const match of opfXml.matchAll(
    /<itemref\b[^>]*idref="([^"]+)"[^>]*\/?>/gi,
  )) {
    const resolved = manifest.get(match[1]);
    if (resolved) {
      orderedContentPaths.push(resolved);
    }
  }

  if (!orderedContentPaths.length) {
    const fallbackPaths = Object.keys(zip.files)
      .filter((name) => /\.(xhtml|html|htm)$/i.test(name))
      .sort();
    orderedContentPaths.push(...fallbackPaths);
  }

  const pageTexts: string[] = [];
  for (const contentPath of orderedContentPaths) {
    const file = zip.file(contentPath);
    if (!file) continue;
    const markup = await file.async("string");
    const text = htmlToReadableText(markup);
    if (text) {
      pageTexts.push(text);
    }
  }

  return pageTexts.join("\n\n");
}

function extractTextFromPdfBytesFallback(arrayBuffer: ArrayBuffer): string {
  const buffer = Buffer.from(arrayBuffer);
  const raw = buffer.toString("latin1");
  const matches = raw.match(/[A-Za-z0-9][A-Za-z0-9\s,.;:()'"%\-_/]{6,}/g) || [];
  const cleaned = matches
    .map((m) => m.replace(/\s+/g, " ").trim())
    .filter((m) => m.length > 8);
  const combined = cleaned.join("\n");
  return looksLikePdfArtifactText(combined) ? "" : combined;
}

function decodePdfLiteralString(value: string) {
  return value
    .replace(/\\([\\()])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(parseInt(octal, 8)),
    );
}

function extractTextFromPdfLiteralStrings(arrayBuffer: ArrayBuffer): string {
  const raw = Buffer.from(arrayBuffer).toString("latin1");
  const literalMatches = raw.match(/\((?:\\.|[^()]){2,}\)/g) || [];
  const extracted = literalMatches
    .map((entry) => decodePdfLiteralString(entry.slice(1, -1)))
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter((entry) => entry.length >= 3);

  const joined = normalizeExtractedText(extracted.join("\n"));
  if (!joined) return "";
  return hasSubstantialRecoverablePdfText(joined) ? joined : "";
}

function estimatePdfPageCount(arrayBuffer: ArrayBuffer): number {
  const raw = Buffer.from(arrayBuffer).toString("latin1");

  const countMatches = Array.from(raw.matchAll(/\/Count\s+(\d{1,5})\b/g))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 5000);
  const explicitMax = countMatches.length ? Math.max(...countMatches) : 0;

  const pageMarkers = raw.match(/\/Type\s*\/Page\b/g) || [];
  const pageMarkerCount = pageMarkers.length;

  return Math.max(explicitMax, pageMarkerCount, 0);
}

async function extractTextFromPdfWithOcrFallback(
  arrayBuffer: ArrayBuffer,
): Promise<string> {
  try {
    const ast = await parseOffice(Buffer.from(arrayBuffer), {
      extractAttachments: true,
      ocr: true,
      ocrLanguage: process.env.FILE_TEXT_EXTRACTION_OCR_LANGUAGE || "eng",
      outputErrorToConsole: false,
      includeRawContent: false,
    });
    const extracted = normalizeExtractedText(ast.toText());
    if (!extracted || looksLikePdfArtifactText(extracted)) {
      return "";
    }
    return extracted;
  } catch {
    return "";
  }
}

async function extractTextFromPdfWithGoogleDriveOcrFallback(
  arrayBuffer: ArrayBuffer,
): Promise<string> {
  const enabled = String(
    process.env.FILE_TEXT_EXTRACTION_GOOGLE_DRIVE_OCR_ENABLED || "true",
  )
    .trim()
    .toLowerCase();
  if (["0", "false", "no", "off"].includes(enabled)) return "";

  let createdFileId = "";
  try {
    const accessToken = await getGoogleDriveAccessToken();
    const metadata = {
      name: `uploaded-material-${Date.now()}.pdf`,
      mimeType: "application/vnd.google-apps.document",
    };
    const pdfBytes = Buffer.from(arrayBuffer);
    const uploadResponse =
      pdfBytes.byteLength <= GOOGLE_DRIVE_MULTIPART_MAX_BYTES
        ? await (async () => {
            const form = new FormData();
            form.append(
              "metadata",
              new Blob([JSON.stringify(metadata)], {
                type: "application/json; charset=UTF-8",
              }),
            );
            form.append(
              "file",
              new Blob([pdfBytes], { type: "application/pdf" }),
              metadata.name,
            );

            return fetch(
              "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&ocrLanguage=en",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                body: form,
              },
            );
          })()
        : await (async () => {
            const sessionResponse = await fetch(
              "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id&ocrLanguage=en",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json; charset=UTF-8",
                  "X-Upload-Content-Type": "application/pdf",
                  "X-Upload-Content-Length": String(pdfBytes.byteLength),
                },
                body: JSON.stringify(metadata),
              },
            );

            if (!sessionResponse.ok) {
              return sessionResponse;
            }

            const resumableUrl = String(
              sessionResponse.headers.get("location") || "",
            ).trim();
            if (!resumableUrl) {
              return new Response(null, {
                status: 500,
                statusText: "Missing resumable upload URL",
              });
            }

            return fetch(resumableUrl, {
              method: "PUT",
              headers: {
                "Content-Type": "application/pdf",
                "Content-Length": String(pdfBytes.byteLength),
              },
              body: pdfBytes,
            });
          })();

    if (!uploadResponse.ok) {
      return "";
    }

    const uploadJson = (await uploadResponse.json().catch(() => ({}))) as {
      id?: string;
    };
    createdFileId = String(uploadJson.id || "").trim();
    if (!createdFileId) return "";

    const exportResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(createdFileId)}/export?mimeType=text/plain`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );
    if (!exportResponse.ok) {
      return "";
    }

    const extracted = normalizeExtractedText(await exportResponse.text());
    if (!extracted || looksLikePdfArtifactText(extracted)) {
      return "";
    }

    return extracted;
  } catch {
    return "";
  } finally {
    if (createdFileId) {
      try {
        const accessToken = await getGoogleDriveAccessToken();
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(createdFileId)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ).catch(() => null);
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

async function extractTextFromPdfWithGoogleCloudVisionFallback(
  arrayBuffer: ArrayBuffer,
  pageCount?: number,
): Promise<string> {
  const enabled = String(
    process.env.FILE_TEXT_EXTRACTION_GOOGLE_VISION_ENABLED || "true",
  )
    .trim()
    .toLowerCase();
  if (["0", "false", "no", "off"].includes(enabled)) return "";

  try {
    const accessToken = await getGoogleVisionAccessToken();
    const parsed = await loadGoogleServiceAccountRecord();
    const quotaProject =
      typeof parsed.project_id === "string" ? parsed.project_id : "";
    const estimatedPageCount = estimatePdfPageCount(arrayBuffer);
    const resolvedPageCount = Math.max(
      pageCount && Number.isFinite(pageCount) ? pageCount : 0,
      estimatedPageCount,
    );
    const totalPages =
      resolvedPageCount > 0
        ? Math.min(resolvedPageCount, GOOGLE_CLOUD_VISION_MAX_PAGES)
        : GOOGLE_CLOUD_VISION_MAX_PAGES;
    const pageNumbers = Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
    const base64Content = Buffer.from(arrayBuffer).toString("base64");
    const extractedPages: string[] = [];

    for (
      let start = 0;
      start < pageNumbers.length;
      start += GOOGLE_CLOUD_VISION_BATCH_PAGES
    ) {
      const pages = pageNumbers.slice(
        start,
        start + GOOGLE_CLOUD_VISION_BATCH_PAGES,
      );
      const response = await fetch(
        "https://vision.googleapis.com/v1/files:annotate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=utf-8",
            ...(quotaProject ? { "x-goog-user-project": quotaProject } : {}),
          },
          body: JSON.stringify({
            requests: [
              {
                inputConfig: {
                  content: base64Content,
                  mimeType: "application/pdf",
                },
                features: [
                  {
                    type: "DOCUMENT_TEXT_DETECTION",
                  },
                ],
                pages,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        return "";
      }

      const payload = (await response.json().catch(() => ({}))) as {
        responses?: Array<{
          responses?: Array<{
            fullTextAnnotation?: {
              text?: string;
            };
          }>;
        }>;
      };

      const batchText = (payload.responses?.[0]?.responses || [])
        .map((entry) =>
          normalizeExtractedText(String(entry?.fullTextAnnotation?.text || "")),
        )
        .filter(Boolean)
        .join("\n\n");

      if (batchText.trim()) {
        extractedPages.push(batchText.trim());
      }
    }

    const extracted = normalizeExtractedText(extractedPages.join("\n\n"));
    if (!extracted || looksLikePdfArtifactText(extracted)) {
      return "";
    }

    return extracted;
  } catch {
    return "";
  }
}

export async function extractTextFromPdfDetailed(
  arrayBuffer: ArrayBuffer,
): Promise<{ text: string; method: PdfExtractionMethod }> {
  let bestCandidate: { text: string; method: PdfExtractionMethod } = {
    text: "",
    method: "none",
  };
  let detectedPageCount = estimatePdfPageCount(arrayBuffer);

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({
      data: Buffer.from(arrayBuffer),
    } as any);
    try {
      const result = await parser.getText();
      const extracted = normalizeExtractedText(String(result?.text || ""));
      if (extracted.length >= 120) {
        if (
          !looksLikePdfArtifactText(extracted) ||
          looksLikeUsablePdfText(extracted) ||
          hasSubstantialRecoverablePdfText(extracted)
        ) {
          bestCandidate = {
            text: extracted,
            method: "pdf-parse",
          };
        }
      }
    } finally {
      if (
        typeof (parser as { destroy?: () => Promise<void> | void }).destroy ===
        "function"
      ) {
        await (parser as { destroy: () => Promise<void> | void }).destroy();
      }
    }
  } catch {
    // fall back below
  }

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const typedArray = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjs.getDocument({
      data: typedArray,
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
    } as any);
    const pdf = await loadingTask.promise;
    detectedPageCount = Math.max(detectedPageCount, Number(pdf.numPages) || 0);
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const text = await page.getTextContent();
      const pageText = text.items
        .map((item: any) => String(item?.str || ""))
        .join(" ")
        .trim();
      if (pageText) pages.push(pageText);
    }

    const extracted = normalizeExtractedText(pages.join("\n\n"));
    if (extracted.length >= 120) {
      if (
        !looksLikePdfArtifactText(extracted) ||
        looksLikeUsablePdfText(extracted) ||
        hasSubstantialRecoverablePdfText(extracted)
      ) {
        bestCandidate = chooseBetterPdfExtraction(bestCandidate, {
          text: extracted,
          method: "pdfjs",
        });
      }
    }
  } catch {
    // fall back below
  }

  const binaryFallback = extractTextFromPdfBytesFallback(arrayBuffer);
  if (binaryFallback.length >= 120) {
    bestCandidate = chooseBetterPdfExtraction(bestCandidate, {
      text: binaryFallback,
      method: "binary-fallback",
    });
  }

  if (
    !bestCandidate.text ||
    shouldTryOcrForPdfText(bestCandidate.text, {
      pageCount: detectedPageCount,
      method: bestCandidate.method,
    })
  ) {
    const ocrFallback = await extractTextFromPdfWithOcrFallback(arrayBuffer);
    if (ocrFallback.length >= 40) {
      bestCandidate = chooseBetterPdfExtraction(bestCandidate, {
        text: ocrFallback,
        method: "ocr",
      });
    }
  }

  if (
    !bestCandidate.text ||
    !hasSubstantialRecoverablePdfText(bestCandidate.text)
  ) {
    const googleVisionFallback =
      await extractTextFromPdfWithGoogleCloudVisionFallback(
        arrayBuffer,
        detectedPageCount,
      );
    if (googleVisionFallback.length >= 40) {
      bestCandidate = chooseBetterPdfExtraction(bestCandidate, {
        text: googleVisionFallback,
        method: "ocr",
      });
    }
  }

  if (
    !bestCandidate.text ||
    !hasSubstantialRecoverablePdfText(bestCandidate.text)
  ) {
    const googleDriveOcrFallback =
      await extractTextFromPdfWithGoogleDriveOcrFallback(arrayBuffer);
    if (googleDriveOcrFallback.length >= 40) {
      bestCandidate = chooseBetterPdfExtraction(bestCandidate, {
        text: googleDriveOcrFallback,
        method: "ocr",
      });
    }
  }

  if (
    !bestCandidate.text ||
    !hasSubstantialRecoverablePdfText(bestCandidate.text)
  ) {
    const literalStringFallback = extractTextFromPdfLiteralStrings(arrayBuffer);
    if (literalStringFallback.length >= 120) {
      bestCandidate = chooseBetterPdfExtraction(bestCandidate, {
        text: literalStringFallback,
        method: "binary-fallback",
      });
    }
  }

  return bestCandidate;
}

export async function extractTextFromPdf(
  arrayBuffer: ArrayBuffer,
): Promise<string> {
  const result = await extractTextFromPdfDetailed(arrayBuffer);
  return result.text;
}

export function choosePreferredPdfPersistenceText(input: {
  rawText?: string | null;
  readableText?: string | null;
}) {
  const rawNormalized = normalizeExtractedText(String(input.rawText || ""));
  const readableNormalized = normalizeExtractedText(
    String(input.readableText || ""),
  );

  if (!rawNormalized) return readableNormalized;
  if (!readableNormalized) {
    if (
      looksLikePdfArtifactText(rawNormalized) &&
      !hasSubstantialRecoverablePdfText(rawNormalized)
    ) {
      return "";
    }
    return rawNormalized;
  }

  if (
    looksLikePdfArtifactText(rawNormalized) &&
    !looksLikePdfArtifactText(readableNormalized)
  ) {
    return readableNormalized;
  }

  const rawScore = scoreNarrationReadiness(rawNormalized);
  const readableScore = scoreNarrationReadiness(readableNormalized);

  if (readableScore >= rawScore + 1) return readableNormalized;
  if (
    readableScore > rawScore &&
    readableNormalized.length >= rawNormalized.length * 0.55
  ) {
    return readableNormalized;
  }
  if (rawScore < 10 && readableScore >= rawScore) return readableNormalized;
  if (
    hasSubstantialRecoverablePdfText(rawNormalized) &&
    readableNormalized.length < 180
  ) {
    return rawNormalized;
  }

  return rawNormalized;
}

export async function extractFileTextFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  ext: string,
  fileName: string,
): Promise<string> {
  if (ext === "txt" || ext === "md" || ext === "csv") {
    return new TextDecoder().decode(arrayBuffer);
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(arrayBuffer),
    });
    return result.value;
  }

  if (ext === "xlsx") {
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    const rows: string[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      rows.push(XLSX.utils.sheet_to_csv(sheet));
    });
    return rows.join("\n");
  }

  if (ext === "pptx" || ext === "ppt") {
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);
    try {
      await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
      const text = await pptxTextParser(tempFilePath, "text");
      return text;
    } finally {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }

  if (ext === "pdf") {
    return extractTextFromPdf(arrayBuffer);
  }

  if (ext === "epub") {
    return extractTextFromEpub(arrayBuffer);
  }

  throw new Error("Unsupported file type");
}

export async function extractUploadedFileText(input: {
  fileName: string;
  ext: string;
  arrayBuffer: ArrayBuffer;
  bypassCache?: boolean;
}) {
  const cacheKey = buildFileExtractionCacheKey({
    fileName: input.fileName,
    ext: input.ext,
    bytes: input.arrayBuffer,
  });

  if (input.ext === "pdf") {
    const result = input.bypassCache
      ? {
          value: await extractTextFromPdfDetailed(input.arrayBuffer),
          cacheHit: false,
        }
      : await getCachedPdfDetailedExtraction(cacheKey, async () => {
          const detailed = await extractTextFromPdfDetailed(input.arrayBuffer);
          return {
            text: detailed.text,
            method: detailed.method,
          };
        });

    if (!String(result.value.text || "").trim()) {
      deleteCachedFileExtraction(cacheKey);
      deleteCachedPdfDetailedExtraction(cacheKey);
    }

    return {
      text: result.value.text,
      cacheHit: result.cacheHit,
      cacheKey,
      extractionMethod: result.value.method as UploadedExtractionMethod,
    };
  }
  const result = input.bypassCache
    ? {
        value: await extractFileTextFromArrayBuffer(
          input.arrayBuffer,
          input.ext,
          input.fileName,
        ),
        cacheHit: false,
      }
    : await getCachedFileExtraction(cacheKey, async () =>
        extractFileTextFromArrayBuffer(
          input.arrayBuffer,
          input.ext,
          input.fileName,
        ),
      );

  if (input.ext === "pdf" && !String(result.value || "").trim()) {
    deleteCachedFileExtraction(cacheKey);
  }

  return {
    text: result.value,
    cacheHit: result.cacheHit,
    cacheKey,
    extractionMethod:
      input.ext === "txt" || input.ext === "md" || input.ext === "csv"
        ? "text"
        : input.ext === "docx"
          ? "docx"
          : input.ext === "xlsx"
            ? "xlsx"
            : input.ext === "pptx" || input.ext === "ppt"
              ? "pptx"
              : input.ext === "epub"
                ? "epub"
                : "none",
  };
}
