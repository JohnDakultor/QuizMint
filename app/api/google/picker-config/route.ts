import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId =
    process.env.GOOGLE_PICKER_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_PICKER_CLIENT_ID ||
    "";
  const apiKey =
    process.env.GOOGLE_PICKER_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY ||
    "";

  return NextResponse.json(
    {
      enabled: Boolean(clientId && apiKey),
      clientId,
      apiKey,
      scope: "https://www.googleapis.com/auth/drive.file",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
