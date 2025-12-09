import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent leaking valid emails
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: expires,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: user.email,
      subject: "Reset your password",
      html: `
  <p>Dear User,</p>

  <p>We received a request to reset the password associated with your account. If you initiated this request, please click the link below to proceed:</p>

  <p>
    <a href="${resetUrl}" style="color:#1a73e8; text-decoration:underline;">
      Reset Your Password
    </a>
  </p>

  <p>This link will remain valid for <strong>1 hour</strong>. If the link expires, you may request a new password reset from the login page.</p>

  <p>If you did not request a password reset, you may safely ignore this email. Your account will remain secure.</p>

  <p>Best regards,<br />The Support Team</p>
`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Forgot-password API crashed:", error);

    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
