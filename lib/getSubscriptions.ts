import {prisma} from "@/lib/prisma";

export async function getUserSubscription(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionEnd: true,
    },
  });

  if (!user) return { isPro: false };

  const isActive =
    user.subscriptionStatus === "active" &&
    (!user.subscriptionEnd || new Date() < user.subscriptionEnd);

  return {
    isPro: user.subscriptionPlan === "pro" && isActive,
  };
}
