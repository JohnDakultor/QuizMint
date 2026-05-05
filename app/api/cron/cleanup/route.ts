// app/api/cron/cleanup/route.ts
import { NextResponse } from "next/server";
import { cleanupOldPublicUsage } from "@/lib/cleanUpPublicUsage";

function isAuthorized(req: Request) {
  const configured = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (configured && token === configured) return true;
  if (!configured && req.headers.get("x-vercel-cron")) return true;

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    const misconfigured = !(process.env.CRON_SECRET || "");
    return NextResponse.json(
      { error: misconfigured ? "CRON_SECRET not configured" : "Unauthorized" },
      { status: misconfigured ? 500 : 401 },
    );
  }

  const result = await cleanupOldPublicUsage();
  return NextResponse.json({ ok: true, ...result });
}
