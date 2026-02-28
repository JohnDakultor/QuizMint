import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { difficulty, adaptiveLearning, liteMode } = await req.json();

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      aiDifficulty: difficulty,
      adaptiveLearning,
      liteMode: Boolean(liteMode),
    },
  });

  return NextResponse.json({ message: "Settings saved" });
}
