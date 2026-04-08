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

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; studentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, studentId } = await context.params;
  const student = await prisma.classStudent.findFirst({
    where: {
      id: studentId,
      classId: id,
      class: {
        userId: user.id,
      },
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
