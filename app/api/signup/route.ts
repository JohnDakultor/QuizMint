import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { verifyRecaptcha } from "@/lib/verifyRecaptcha";
import { Resend } from "resend";
import { createHash, randomInt } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(local.length - 2, 0))}@${domain}`;
}

function otpHash(otp: string) {
  const secret = process.env.SIGNUP_OTP_SECRET || process.env.NEXTAUTH_SECRET || "quizmint_otp";
  return createHash("sha256").update(`${otp}:${secret}`).digest("hex");
}

function validatePassword(password: string) {
  const errors: string[] = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("one number");
  return { valid: errors.length === 0, errors };
}

async function sendSignupOtpEmail(email: string, username: string, otp: string) {
  const from = process.env.RESEND_FROM_EMAIL || "QuizMintAI <no-reply@quizmintai.com>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.quizmintai.com";
  await resend.emails.send({
    from,
    to: email,
    subject: "Your QuizMint verification code",
    text: `Hi ${username},\n\nYour QuizMint verification code is: ${otp}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes.\n\nIf you did not request this, you can ignore this email.\n\n${appUrl}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 8px">Verify your QuizMint account</h2>
      <p>Hi ${username},</p>
      <p>Use this verification code to finish creating your account:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;display:inline-block">${otp}</div>
      <p style="margin-top:12px">This code expires in ${OTP_TTL_MINUTES} minutes.</p>
      <p style="color:#6b7280;font-size:12px">If you didn’t request this, you can ignore this email.</p>
    </div>`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body?.action || "requestOtp");

    if (action === "requestOtp") {
      const { username, email, password, recaptchaToken } = body;
      if (!recaptchaToken) {
        return NextResponse.json({ error: "Missing recaptcha token" }, { status: 400 });
      }

      const captcha = await verifyRecaptcha(recaptchaToken);
      if (!captcha.success || captcha.score < 0.5) {
        return NextResponse.json({ error: "Bot activity detected" }, { status: 403 });
      }

      if (!username || !email || !password) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }

      const normalizedEmail = normalizeEmail(email);
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return NextResponse.json(
          {
            error: `Password must contain ${passwordCheck.errors.join(", ")}`,
          },
          { status: 400 }
        );
      }

      const [existingUserByUsername, existingUserByEmail, existingOtp] = await Promise.all([
        prisma.user.findUnique({ where: { username } }),
        prisma.user.findUnique({ where: { email: normalizedEmail } }),
        prisma.signupOtp.findUnique({ where: { email: normalizedEmail } }),
      ]);

      if (existingUserByUsername) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
      if (existingUserByEmail) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }

      if (existingOtp) {
        const secondsSinceLastSend = Math.floor(
          (Date.now() - new Date(existingOtp.updatedAt).getTime()) / 1000
        );
        if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
          return NextResponse.json(
            {
              error: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend}s before requesting another code.`,
            },
            { status: 429 }
          );
        }
      }

      const hashedPassword = await hash(password, 12);
      const otp = String(randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

      await prisma.signupOtp.upsert({
        where: { email: normalizedEmail },
        update: {
          username,
          passwordHash: hashedPassword,
          otpHash: otpHash(otp),
          expiresAt,
          attempts: 0,
        },
        create: {
          email: normalizedEmail,
          username,
          passwordHash: hashedPassword,
          otpHash: otpHash(otp),
          expiresAt,
          attempts: 0,
        },
      });

      await sendSignupOtpEmail(normalizedEmail, username, otp);

      return NextResponse.json(
        {
          message: "Verification code sent",
          requiresOtp: true,
          email: maskEmail(normalizedEmail),
        },
        { status: 200 }
      );
    }

    if (action === "verifyOtp") {
      const { email, otp } = body;
      if (!email || !otp) {
        return NextResponse.json({ error: "Missing email or otp" }, { status: 400 });
      }

      const normalizedEmail = normalizeEmail(email);
      const pending = await prisma.signupOtp.findUnique({
        where: { email: normalizedEmail },
      });

      if (!pending) {
        return NextResponse.json({ error: "Verification session not found. Request a new code." }, { status: 400 });
      }

      if (pending.expiresAt.getTime() < Date.now()) {
        await prisma.signupOtp.delete({ where: { email: normalizedEmail } });
        return NextResponse.json({ error: "Code expired. Request a new code." }, { status: 400 });
      }

      if (pending.attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.signupOtp.delete({ where: { email: normalizedEmail } });
        return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
      }

      if (pending.otpHash !== otpHash(String(otp).trim())) {
        await prisma.signupOtp.update({
          where: { email: normalizedEmail },
          data: { attempts: { increment: 1 } },
        });
        return NextResponse.json({ error: "Invalid code." }, { status: 400 });
      }

      const [existingUserByUsername, existingUserByEmail] = await Promise.all([
        prisma.user.findUnique({ where: { username: pending.username } }),
        prisma.user.findUnique({ where: { email: normalizedEmail } }),
      ]);

      if (existingUserByUsername || existingUserByEmail) {
        await prisma.signupOtp.delete({ where: { email: normalizedEmail } });
        return NextResponse.json({ error: "Account already exists. Please sign in." }, { status: 400 });
      }

      const user = await prisma.user.create({
        data: {
          username: pending.username,
          email: normalizedEmail,
          subscriptionPlan: "free",
          aiDifficulty: "easy",
          password: pending.passwordHash,
        },
      });

      await prisma.signupOtp.delete({ where: { email: normalizedEmail } });
      const { password: _password, ...userWithoutPassword } = user;
      return NextResponse.json({ user: userWithoutPassword, verified: true }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Signup failed" }, { status: 500 });
  }
}
