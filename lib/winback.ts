import { createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINBACK_MILESTONES = [3, 10, 21] as const;
const WINBACK_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 365;

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.quizmintai.com"
  ).replace(/\/$/, "");
}

function getWinbackSecret() {
  return (
    process.env.WINBACK_UNSUBSCRIBE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

function signPayload(payload: string) {
  const secret = getWinbackSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createWinbackUnsubscribeToken(userId: string) {
  const exp = Date.now() + WINBACK_TOKEN_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = signPayload(payload);
  if (!sig) return "";
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyWinbackUnsubscribeToken(token: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const secondLastDot = decoded.lastIndexOf(".", lastDot - 1);
    if (secondLastDot === -1) return null;

    const userId = decoded.slice(0, secondLastDot);
    const expRaw = decoded.slice(secondLastDot + 1, lastDot);
    const sig = decoded.slice(lastDot + 1);

    if (!userId || !expRaw || !sig) return null;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || exp < Date.now()) return null;

    const expected = signPayload(`${userId}.${exp}`);
    if (!expected) return null;

    const isValid = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    return isValid ? userId : null;
  } catch {
    return null;
  }
}

function getInactiveDays(lastActiveAt: Date | null, createdAt: Date, now: Date) {
  const baseline = lastActiveAt || createdAt;
  const diffMs = Math.max(now.getTime() - baseline.getTime(), 0);
  return Math.floor(diffMs / DAY_MS);
}

function chooseMilestone(inactiveDays: number, sentSet: Set<number>) {
  for (const milestone of WINBACK_MILESTONES) {
    if (inactiveDays >= milestone && !sentSet.has(milestone)) {
      return milestone;
    }
  }
  return null;
}

function getEmailCopy(milestoneDay: number) {
  if (milestoneDay === 3) {
    return {
      subject: "Still planning lessons? QuizMintAI is ready",
      headline: "Pick up where you left off",
      body: "Create a quiz or lesson plan in minutes. Your workflow and saved outputs are waiting.",
      cta: "Return to QuizMintAI",
    };
  }
  if (milestoneDay === 10) {
    return {
      subject: "Need faster prep this week?",
      headline: "Generate quizzes and lesson plans faster",
      body: "Use one prompt to build assessments and lesson materials with export-ready outputs.",
      cta: "Generate Now",
    };
  }
  return {
    subject: "Final reminder from QuizMintAI",
    headline: "One last nudge to save prep time",
    body: "If you're still teaching this term, QuizMintAI can help you generate quizzes, plans, and slides quickly.",
    cta: "Open QuizMintAI",
  };
}

async function sendWinbackEmail(params: {
  to: string;
  userId: string;
  milestoneDay: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const baseUrl = getBaseUrl();
  const token = createWinbackUnsubscribeToken(params.userId);
  const unsubscribeUrl = `${baseUrl}/api/winback/unsubscribe?token=${encodeURIComponent(token)}`;
  const appUrl = `${baseUrl}/home`;
  const from = process.env.RESEND_FROM_EMAIL || "QuizMintAI <no-reply@quizmintai.com>";
  const logoUrl = `${baseUrl}/favicon.ico`;

  const copy = getEmailCopy(params.milestoneDay);

  await resend.emails.send({
    from,
    to: [params.to],
    subject: copy.subject,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
    },
    text: `${copy.headline}\n\n${copy.body}\n\nOpen QuizMintAI: ${appUrl}\nUnsubscribe: ${unsubscribeUrl}`,
    html: `
      <div style="margin:0;padding:24px;background:#f3f6fb;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe3f3;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#0ea5e9);padding:18px 20px;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="QuizMintAI" width="36" height="36" style="display:block;border-radius:8px;background:#ffffff;padding:3px;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <div style="font-size:18px;font-weight:700;color:#ffffff;">QuizMintAI</div>
                    <div style="font-size:12px;color:#dbeafe;">AI tools for quizzes and lesson plans</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 22px 12px;">
              <h2 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0f172a;">${copy.headline}</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${copy.body}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#475569;">
                Continue creating:
              </p>
              <ul style="margin:0 0 20px;padding-left:20px;color:#334155;font-size:14px;line-height:1.7;">
                <li>Curriculum-aligned quizzes with answer keys</li>
                <li>Lesson plans with downloadable PDF/DOCX/PPTX</li>
                <li>Reusable templates for faster prep</li>
              </ul>
              <a href="${appUrl}" style="background:#2563eb;color:#ffffff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">
                ${copy.cta}
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 22px 22px;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;">
                You received this because you signed up for QuizMintAI.
              </p>
              <p style="margin:0;font-size:12px;color:#64748b;">
                If you no longer want these reminders, <a href="${unsubscribeUrl}" style="color:#2563eb;">unsubscribe here</a>.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
}

export async function processWinbackEmails(limit = 200) {
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      marketingOptIn: true,
      email: { not: "" },
      marketingUnsubscribedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      lastActiveAt: true,
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  const userIds = users.map((u) => u.id);
  const existingLogs = userIds.length
    ? await prisma.winbackEmailLog.findMany({
        where: {
          userId: { in: userIds },
          milestoneDay: { in: [...WINBACK_MILESTONES] },
        },
        select: {
          userId: true,
          milestoneDay: true,
        },
      })
    : [];

  const sentByUser = new Map<string, Set<number>>();
  for (const log of existingLogs) {
    if (!sentByUser.has(log.userId)) sentByUser.set(log.userId, new Set<number>());
    sentByUser.get(log.userId)!.add(log.milestoneDay);
  }

  let sentCount = 0;
  const skipped: string[] = [];

  for (const user of users) {
    const sentSet = sentByUser.get(user.id) || new Set<number>();
    const inactiveDays = getInactiveDays(user.lastActiveAt ?? null, user.createdAt, now);
    const milestone = chooseMilestone(inactiveDays, sentSet);
    if (!milestone) continue;

    try {
      await sendWinbackEmail({
        to: user.email,
        userId: user.id,
        milestoneDay: milestone,
      });

      await prisma.winbackEmailLog.create({
        data: {
          userId: user.id,
          milestoneDay: milestone,
          sentAt: now,
        },
      });
      sentCount += 1;
    } catch (err) {
      console.error("Winback email send failed", { userId: user.id, milestone, err });
      skipped.push(user.id);
    }
  }

  return {
    scanned: users.length,
    sent: sentCount,
    skipped,
  };
}
