import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildOwnedOrMemberWhere,
  canWriteToOrganization,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";

export async function GET() {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classes = await prisma.class.findMany({
    where: buildOwnedOrMemberWhere(user),
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
  const user = await getCurrentUserAccessContext();
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
        organizationId?: string;
      }
    | null;

  const name = String(body?.name || "").trim();
  const organizationId = String(body?.organizationId || "").trim() || null;
  if (!name) {
    return NextResponse.json({ error: "Class name is required" }, { status: 400 });
  }
  if (!canWriteToOrganization(user, organizationId)) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const createdClass = await prisma.class.create({
    data: {
      userId: user.id,
      organizationId,
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
