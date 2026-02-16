import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { chromium } from "playwright";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { subscriptionPlan: true },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    if (user.subscriptionPlan !== "premium") {
      return new Response(
        JSON.stringify({
          error: "Premium required",
          message: "PDF downloads are available on the Premium plan.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const html = body?.html as string | undefined;
    const title = (body?.title as string | undefined) || "lesson_plan";
    const pageWidth = Number(body?.pageWidth) || 1024;
    const pageHeight = Number(body?.pageHeight) || 1400;

    if (!html) {
      return new Response("Missing HTML", { status: 400 });
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "screen" });

    const pdfBuffer = await page.pdf({
      width: `${pageWidth}px`,
      height: `${pageHeight}px`,
      printBackground: true,
      margin: {
        top: "24px",
        bottom: "24px",
        left: "24px",
        right: "24px",
      },
      preferCSSPageSize: true,
    });

    await page.close();
    await browser.close();

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Lesson plan PDF render error:", err);
    return new Response(`Failed to generate PDF: ${err.message}`, { status: 500 });
  }
}
