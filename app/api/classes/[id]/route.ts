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

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const classRecord = await prisma.class.findFirst({
    where: {
      id,
      userId: user.id,
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
      students: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          studentName: true,
          studentEmail: true,
          studentNumber: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          availableFrom: true,
          dueAt: true,
          closedAt: true,
          createdAt: true,
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
          lessonPlan: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              attempts: true,
            },
          },
        },
      },
      _count: {
        select: {
          students: true,
          assignments: true,
        },
      },
    },
  });

  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  return NextResponse.json({ class: classRecord });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existingClass = await prisma.class.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!existingClass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        subject?: string;
        gradeLevel?: string;
        section?: string;
        schoolYear?: string;
        archived?: boolean;
      }
    | null;

  const nextName = body?.name === undefined ? undefined : String(body.name || "").trim();
  if (nextName !== undefined && !nextName) {
    return NextResponse.json({ error: "Class name is required" }, { status: 400 });
  }

  const updatedClass = await prisma.class.update({
    where: { id: existingClass.id },
    data: {
      name: nextName,
      subject: body?.subject === undefined ? undefined : String(body.subject || "").trim() || null,
      gradeLevel:
        body?.gradeLevel === undefined ? undefined : String(body.gradeLevel || "").trim() || null,
      section: body?.section === undefined ? undefined : String(body.section || "").trim() || null,
      schoolYear:
        body?.schoolYear === undefined ? undefined : String(body.schoolYear || "").trim() || null,
      archived: typeof body?.archived === "boolean" ? body.archived : undefined,
    },
    select: {
      id: true,
      name: true,
      subject: true,
      gradeLevel: true,
      section: true,
      schoolYear: true,
      archived: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ class: updatedClass });
}
