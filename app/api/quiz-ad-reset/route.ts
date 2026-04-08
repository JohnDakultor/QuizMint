import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Ad reset disabled",
      message: "Ad-based usage resets are not available in production.",
    },
    { status: 410 }
  );
}
