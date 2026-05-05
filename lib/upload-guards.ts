import { quoteUntrustedReference } from "@/lib/rag/rag-guards";

const MAX_FILE_COUNT = 6;
const MAX_SINGLE_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 24 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "txt",
  "docx",
  "pdf",
  "ppt",
  "pptx",
  "xlsx",
  "csv",
  "md",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

function startsWithBytes(bytes: Uint8Array, expected: number[]) {
  if (bytes.length < expected.length) return false;
  return expected.every((value, index) => bytes[index] === value);
}

function hasZipSignature(bytes: Uint8Array) {
  return startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04]);
}

function hasJpegSignature(bytes: Uint8Array) {
  return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
}

function hasPngSignature(bytes: Uint8Array) {
  return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47]);
}

function hasPdfSignature(bytes: Uint8Array) {
  return startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46]);
}

function hasWebpSignature(bytes: Uint8Array) {
  if (bytes.length < 12) return false;
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  return riff === "RIFF" && webp === "WEBP";
}

function hasTextLikeContent(bytes: Uint8Array) {
  const sample = bytes.slice(0, Math.min(bytes.length, 512));
  let suspicious = 0;
  for (const byte of sample) {
    const printable =
      byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126);
    if (!printable) suspicious += 1;
  }
  return suspicious <= Math.max(8, Math.floor(sample.length * 0.08));
}

function sanitizeUploadName(name: string) {
  return String(name || "").trim();
}

export function buildReferenceOnlyContext(label: string, content: string) {
  return quoteUntrustedReference(label, content);
}

export async function validateUploadedFiles(files: File[]) {
  if (!files.length) {
    throw new Error("No file uploaded.");
  }
  if (files.length > MAX_FILE_COUNT) {
    throw new Error(`You can upload up to ${MAX_FILE_COUNT} files at once.`);
  }

  let totalBytes = 0;

  for (const file of files) {
    const safeName = sanitizeUploadName(file.name);
    if (!safeName) {
      throw new Error("Uploaded file must have a valid name.");
    }
    if (safeName.length > 180) {
      throw new Error(`File name is too long: ${safeName}`);
    }
    if (
      safeName.includes("/") ||
      safeName.includes("\\") ||
      safeName.includes("\0") ||
      /[\r\n\t]/.test(safeName)
    ) {
      throw new Error(`Suspicious file name rejected: ${safeName}`);
    }

    const ext = safeName.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file type: ${safeName}`);
    }
    if (ext === "svg") {
      throw new Error("SVG uploads are not allowed.");
    }

    if (file.size <= 0) {
      throw new Error(`File is empty: ${safeName}`);
    }
    if (file.size > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`File is too large: ${safeName}`);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_FILE_BYTES) {
      throw new Error("Combined upload size is too large.");
    }

    const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());

    const signatureOk =
      ext === "png"
        ? hasPngSignature(bytes)
        : ext === "jpg" || ext === "jpeg"
        ? hasJpegSignature(bytes)
        : ext === "webp"
        ? hasWebpSignature(bytes)
        : ext === "pdf"
        ? hasPdfSignature(bytes)
        : ext === "docx" || ext === "xlsx" || ext === "pptx"
        ? hasZipSignature(bytes)
        : ext === "txt" || ext === "csv" || ext === "md"
        ? hasTextLikeContent(bytes)
        : ext === "ppt"
        ? true
        : false;

    if (!signatureOk) {
      throw new Error(`File signature did not match its extension: ${safeName}`);
    }
  }
}
