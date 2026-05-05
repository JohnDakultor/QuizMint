import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { createRequestId } from "@/lib/api-error";

export const runtime = "nodejs";

function buildGoogleFileLink(fileId: string, mimeType?: string | null) {
  if (!fileId) return "";
  if (mimeType === "application/vnd.google-apps.document") {
    return `https://docs.google.com/document/d/${fileId}/edit`;
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
  }
  if (mimeType === "application/vnd.google-apps.presentation") {
    return `https://docs.google.com/presentation/d/${fileId}/edit`;
  }
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized", requestId },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const fileId = String(body?.fileId || "").trim();
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : null;
  const sourceUrl = typeof body?.url === "string" ? body.url : "";

  if (!fileId && !sourceUrl) {
    return NextResponse.json(
      { error: "Missing file reference", requestId },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  const url = sourceUrl || buildGoogleFileLink(fileId, mimeType);
  return NextResponse.json(
    { ok: true, url, requestId },
    { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
  );
}

