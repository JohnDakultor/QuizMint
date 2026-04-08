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
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { subscriptionPlan: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const premiumInterventionAccess = (user.subscriptionPlan || "free") === "premium";

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      aiDifficulty: difficulty,
      adaptiveLearning: premiumInterventionAccess ? Boolean(adaptiveLearning) : false,
      liteMode: Boolean(liteMode),
    },
  });

  return NextResponse.json({ message: "Settings saved" });
}
