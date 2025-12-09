// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth-option";
// import { getUserSubscription } from "@/lib/getSubscriptions";

// export async function GET() {
//   const session = await getServerSession(authOptions);

//   if (!session?.user?.id) {
//     return NextResponse.json({ isPro: false });
//   }

//   const sub = await getUserSubscription(Number(session.user.id));

//   return NextResponse.json(sub);
// }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { getUserSubscription } from "@/lib/getSubscriptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({
      isPro: false,
      isPremium: false,
      plan: null,
      active: false
    });
  }

  const sub = await getUserSubscription(Number(session.user.id));

  return NextResponse.json(sub);
}
