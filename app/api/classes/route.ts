import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true },
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classes = await prisma.class.findMany({
    where: { userId: user.id },
    orderBy: [{ archived: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      subject: true,
      gradeLevel: true,
      section: true,
      schoolYear: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          students: true,
          assignments: true,
        },
      },
    },
  });

  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        subject?: string;
        gradeLevel?: string;
        section?: string;
        schoolYear?: string;
      }
    | null;

  const name = String(body?.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Class name is required" }, { status: 400 });
  }

  const createdClass = await prisma.class.create({
    data: {
      userId: user.id,
      name,
      subject: String(body?.subject || "").trim() || null,
      gradeLevel: String(body?.gradeLevel || "").trim() || null,
      section: String(body?.section || "").trim() || null,
      schoolYear: String(body?.schoolYear || "").trim() || null,
    },
    select: {
      id: true,
      name: true,
      subject: true,
      gradeLevel: true,
      section: true,
      schoolYear: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          students: true,
          assignments: true,
        },
      },
    },
  });

  return NextResponse.json({ class: createdClass }, { status: 201 });
}
