import { createHash } from "crypto";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

type CachedResult<T> = {
  value: T;
  cacheHit: boolean;
};

const urlExtractionCache = new Map<string, CacheRecord<{ text: string; title: string }>>();
const youtubeTranscriptCache = new Map<string, CacheRecord<string>>();
const youtubeMetadataCache = new Map<
  string,
  CacheRecord<{ title: string; description: string }>
>();
const fileExtractionCache = new Map<string, CacheRecord<string>>();
const pdfDetailedExtractionCache = new Map<
  string,
  CacheRecord<{ text: string; method: string }>
>();

const URL_TTL_MS = 6 * 60 * 60 * 1000;
const YOUTUBE_TTL_MS = 6 * 60 * 60 * 1000;
const FILE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

function getCached<T>(cache: Map<string, CacheRecord<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached<T>(
  cache: Map<string, CacheRecord<T>>,
  key: string,
  value: T,
  ttlMs: number
) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

async function getOrLoad<T>(
  cache: Map<string, CacheRecord<T>>,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<CachedResult<T>> {
  const cached = getCached(cache, key);
  if (cached !== null) {
    return { value: cached, cacheHit: true };
  }

  const value = await loader();
  setCached(cache, key, value, ttlMs);
  return { value, cacheHit: false };
}

export async function getCachedUrlExtraction(
  url: string,
  loader: () => Promise<{ text: string; title: string }>
) {
  return getOrLoad(urlExtractionCache, url.trim(), URL_TTL_MS, loader);
}

export async function getCachedYouTubeTranscript(
  videoId: string,
  loader: () => Promise<string>
) {
  return getOrLoad(youtubeTranscriptCache, videoId.trim(), YOUTUBE_TTL_MS, loader);
}

export async function getCachedYouTubeMetadata(
  videoId: string,
  loader: () => Promise<{ title: string; description: string }>
) {
  return getOrLoad(youtubeMetadataCache, videoId.trim(), YOUTUBE_TTL_MS, loader);
}

export function buildFileExtractionCacheKey(input: {
  fileName: string;
  ext: string;
  bytes: ArrayBuffer;
}) {
  const hash = createHash("sha256").update(Buffer.from(input.bytes)).digest("hex");
  const normalizedExt = input.ext.toLowerCase();
  const extractorVersion =
    normalizedExt === "pdf" ? "pdf-v3-force-reextract" : "v1";
  return `${extractorVersion}:${normalizedExt}:${input.fileName.toLowerCase()}:${hash}`;
}

export async function getCachedFileExtraction(
  key: string,
  loader: () => Promise<string>
) {
  return getOrLoad(fileExtractionCache, key, FILE_TTL_MS, loader);
}

export function deleteCachedFileExtraction(key: string) {
  fileExtractionCache.delete(key);
}

export async function getCachedPdfDetailedExtraction(
  key: string,
  loader: () => Promise<{ text: string; method: string }>
) {
  return getOrLoad(pdfDetailedExtractionCache, key, FILE_TTL_MS, loader);
}

export function deleteCachedPdfDetailedExtraction(key: string) {
  pdfDetailedExtractionCache.delete(key);
}
