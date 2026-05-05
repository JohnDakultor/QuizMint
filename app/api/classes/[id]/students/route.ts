import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import {
  buildOwnedOrMemberWhere,
  buildOwnedOrWritableWhere,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";

type StudentDraft = {
  studentName: string;
  studentEmail?: string | null;
  studentNumber?: string | null;
  notes?: string | null;
};

function parseBulkStudents(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [studentName, studentEmail, studentNumber] = line.split(",").map((part) => part.trim());
      return {
        studentName,
        studentEmail: studentEmail || null,
        studentNumber: studentNumber || null,
      };
    })
    .filter((student) => student.studentName);
}

function normalizeStudentDrafts(drafts: StudentDraft[]) {
  return drafts
    .map((student) => ({
      studentName: String(student.studentName || "").trim(),
      studentEmail: String(student.studentEmail || "").trim().toLowerCase() || null,
      studentNumber: String(student.studentNumber || "").trim() || null,
      notes: String(student.notes || "").trim() || null,
    }))
    .filter((student) => student.studentName);
}

async function parseRosterFile(file: File) {
  const name = String(file.name || "").trim();
  const ext = name.split(".").pop()?.toLowerCase() || "";

  if (ext === "csv" || ext === "txt") {
    const text = await file.text();
    return normalizeStudentDrafts(parseBulkStudents(text));
  }

  if (ext === "xlsx") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const rows: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      rows.push(XLSX.utils.sheet_to_csv(sheet));
    }
    return normalizeStudentDrafts(parseBulkStudents(rows.join("\n")));
  }

  throw new Error("Unsupported roster file type. Use csv, txt, or xlsx.");
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const classRecord = await prisma.class.findFirst({
    where: { id, ...buildOwnedOrMemberWhere(user) },
    select: { id: true },
  });

  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const students = await prisma.classStudent.findMany({
    where: { classId: classRecord.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ students });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const classRecord = await prisma.class.findFirst({
    where: { id, ...buildOwnedOrWritableWhere(user) },
    select: { id: true },
  });

  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const drafts: StudentDraft[] = [];
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const rosterFile = formData.get("rosterFile");
    if (!(rosterFile instanceof File)) {
      return NextResponse.json({ error: "Roster file is required" }, { status: 400 });
    }
    drafts.push(...(await parseRosterFile(rosterFile)));
  } else {
    const body = (await req.json().catch(() => null)) as
      | {
          studentName?: string;
          studentEmail?: string;
          studentNumber?: string;
          notes?: string;
          bulkText?: string;
        }
      | null;

    const bulkText = String(body?.bulkText || "").trim();
    if (bulkText) {
      drafts.push(...parseBulkStudents(bulkText));
    } else {
      const studentName = String(body?.studentName || "").trim();
      if (!studentName) {
        return NextResponse.json({ error: "Student name is required" }, { status: 400 });
      }
      drafts.push({
        studentName,
        studentEmail: String(body?.studentEmail || "").trim() || null,
        studentNumber: String(body?.studentNumber || "").trim() || null,
        notes: String(body?.notes || "").trim() || null,
      });
    }
  }

  const normalizedDrafts = normalizeStudentDrafts(drafts);

  if (!normalizedDrafts.length) {
    return NextResponse.json({ error: "Add at least one student" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    normalizedDrafts.map((student) =>
      prisma.classStudent.create({
        data: {
          classId: classRecord.id,
          studentName: student.studentName,
          studentEmail: student.studentEmail || null,
          studentNumber: student.studentNumber || null,
          notes: student.notes || null,
        },
      }),
    ),
  );

  return NextResponse.json({ students: created }, { status: 201 });
}
