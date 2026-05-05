import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildOwnedOrWritableWhere,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; studentId: string }> },
) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, studentId } = await context.params;
  const student = await prisma.classStudent.findFirst({
    where: {
      id: studentId,
      classId: id,
      class: buildOwnedOrWritableWhere(user),
    },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await prisma.classStudent.delete({
    where: { id: student.id },
  });

  return NextResponse.json({ success: true });
}
