import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.NODE_ENV !== "test") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: "test-user-id",
      email: "test@quizmint.ai",
      role: "FREE"
    }
  });
}
