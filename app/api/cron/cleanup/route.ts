// app/api/cron/cleanup/route.ts
import { NextResponse } from "next/server";
import { cleanupOldPublicUsage } from "@/lib/cleanUpPublicUsage";

export async function GET() {
  await cleanupOldPublicUsage();
  return NextResponse.json({ ok: true });
}
