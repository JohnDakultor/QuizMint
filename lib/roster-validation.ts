import { prisma } from "@/lib/prisma";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function validateAssignmentRosterEmail(params: {
  classId: string;
  studentEmail: string;
}) {
  const rosterStudents = await prisma.classStudent.findMany({
    where: {
      classId: params.classId,
      studentEmail: {
        not: null,
      },
    },
    select: {
      id: true,
      studentEmail: true,
      studentName: true,
    },
  });

  const rosterEmails = rosterStudents
    .map((student) => normalizeEmail(student.studentEmail || ""))
    .filter(Boolean);

  if (rosterEmails.length === 0) {
    return {
      ok: true as const,
      enforced: false,
      matchedStudentId: null,
    };
  }

  const normalizedStudentEmail = normalizeEmail(params.studentEmail);
  const matchedStudent =
    rosterStudents.find(
      (student) => normalizeEmail(student.studentEmail || "") === normalizedStudentEmail,
    ) || null;

  if (!matchedStudent) {
    return {
      ok: false as const,
      enforced: true,
      matchedStudentId: null,
      message:
        "Use the same email address your teacher added to the class roster for this assignment.",
    };
  }

  return {
    ok: true as const,
    enforced: true,
    matchedStudentId: matchedStudent.id,
  };
}
