import { NextResponse } from "next/server";
import { processWinbackEmails } from "@/lib/winback";

function isAuthorized(req: Request) {
  const configured = process.env.CRON_SECRET || "";
  if (!configured) return false;

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("key") || "";

  return token === configured || queryToken === configured;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    const misconfigured = !(process.env.CRON_SECRET || "");
    return NextResponse.json(
      { error: misconfigured ? "CRON_SECRET not configured" : "Unauthorized" },
      { status: misconfigured ? 500 : 401 }
    );
  }

  const result = await processWinbackEmails(300);
  return NextResponse.json({ ok: true, ...result });
}
