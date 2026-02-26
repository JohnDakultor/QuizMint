import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWinbackUnsubscribeToken } from "@/lib/winback";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const userId = verifyWinbackUnsubscribeToken(token);

  if (!userId) {
    return new NextResponse(
      "<html><body style='font-family:Arial,sans-serif;padding:24px;'><h2>Invalid unsubscribe link</h2><p>This link is invalid or expired.</p></body></html>",
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      marketingOptIn: false,
      marketingUnsubscribedAt: new Date(),
    },
  });

  return new NextResponse(
    "<html><body style='font-family:Arial,sans-serif;padding:24px;'><h2>You're unsubscribed</h2><p>You will no longer receive win-back emails from QuizMintAI.</p></body></html>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
