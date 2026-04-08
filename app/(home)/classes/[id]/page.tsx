"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Archive,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Copy,
  FileUp,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  UsersRound,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { CopySummaryModal } from "@/components/ui/copy-summary-modal";
import { EmailConfirmModal } from "@/components/ui/email-confirm-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MasonryGrid } from "@/components/ui/masonry-grid";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { Textarea } from "@/components/ui/textarea";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import Tour from "@/components/ui/tour";
import { classDetailTourSteps } from "../../teacher-workflow-tour-steps";
import { printElementContent } from "@/lib/print-element";

type ClassStudent = {
  id: string;
  studentName: string;
  studentEmail: string | null;
  studentNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type AssignmentPreview = {
  id: string;
  title: string;
  status: string;
  availableFrom: string | null;
  dueAt: string | null;
  closedAt: string | null;
  createdAt: string;
  quiz: { id: number; title: string } | null;
  lessonPlan: { id: string; title: string } | null;
  _count: { attempts: number };
};

type ClassDetail = {
  id: string;
  name: string;
  subject: string | null;
  gradeLevel: string | null;
  section: string | null;
  schoolYear: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  students: ClassStudent[];
  assignments: AssignmentPreview[];
  _count: {
    students: number;
    assignments: number;
  };
};

type OverviewAssignment = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  submissionCount: number;
  averageScore: number;
  missingCount: number;
};

type ClassOverview = {
  premiumInterventionAccess: boolean;
  class: {
    id: string;
    name: string;
    subject: string | null;
    gradeLevel: string | null;
    section: string | null;
    studentCount: number;
  };
  summary: {
    studentCount: number;
    activeAssignmentCount: number;
    averageScore: number;
    totalMissingSubmissions: number;
    dueSoonCount: number;
  };
  activeAssignments: OverviewAssignment[];
  dueSoonAssignments: OverviewAssignment[];
  recentResults: OverviewAssignment[];
  weakQuestionTrends: {
    label: string;
    missCount: number;
    assignmentTitles: string[];
    classNames: string[];
  }[];
  studentsAtRisk: {
    studentName: string | null;
    studentEmail: string | null;
    averageScore: number;
    lowScoreCount: number;
    assignmentTitles: string[];
    classNames: string[];
    latestSubmittedAt: string | null;
  }[];
  performanceTrend: {
    id: string;
    label: string;
    averageScore: number;
    completionRate: number;
    submittedAt: string | null;
  }[];
  interventionSummary: string | null;
  adaptiveSummary: {
    supportLevel: string;
    focus: string[];
    summary: string;
    recommendation: string;
    groupedSupport: {
      label: string;
      count: number;
      sampleStudents: string[];
    }[];
    difficultyShift: {
      direction: string;
      label: string;
      rationale: string;
    };
    remediationSequence: string[];
  } | null;
  interventionHistory: {
    eventType: string;
    feature: string | null;
    status: string;
    createdAt: string;
    mode: string | null;
    assignmentTitle: string | null;
    promptTopic: string | null;
  }[];
  interventionEffectiveness: {
    hasData: boolean;
    summary: string;
    launchedAt: string | null;
    baseline: {
      averageScore: number;
      missingCount: number;
      weakConcepts: string[];
      studentCount: number;
    };
    post: {
      averageScore: number;
      missingCount: number;
      weakConceptCarryoverCount: number;
      measuredAssignmentCount: number;
      assignmentTitles: string[];
    } | null;
    delta: {
      score: number;
      missing: number;
    } | null;
    studentImpact: {
      improvedCount: number;
      stillAtRiskCount: number;
    };
  } | null;
  interventionReview: {
    status: "needs_data" | "effective" | "mixed" | "at_risk";
    headline: string;
    summary: string;
    nextMove: string;
    provenEffective: boolean;
  } | null;
};

type ClassForm = {
  name: string;
  subject: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
};

type StudentForm = {
  studentName: string;
  studentEmail: string;
  studentNumber: string;
  notes: string;
};

const EMPTY_STUDENT_FORM: StudentForm = {
  studentName: "",
  studentEmail: "",
  studentNumber: "",
  notes: "",
};

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = String(params?.id || "");

  const [classRecord, setClassRecord] = useState<ClassDetail | null>(null);
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [classForm, setClassForm] = useState<ClassForm | null>(null);
  const [studentForm, setStudentForm] = useState<StudentForm>(EMPTY_STUDENT_FORM);
  const [bulkRoster, setBulkRoster] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingClass, setSavingClass] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [uploadingRoster, setUploadingRoster] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [emailingAssignmentId, setEmailingAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [showCopySummaryModal, setShowCopySummaryModal] = useState(false);
  const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [pendingEmailAction, setPendingEmailAction] = useState<{
    assignmentId: string;
    mode: "all" | "missing_only";
    title: string;
    description: string;
    confirmLabel: string;
  } | null>(null);
  const rosterFileInputRef = useRef<HTMLInputElement | null>(null);
  const interventionSummaryRef = useRef<HTMLDivElement | null>(null);
  const premiumInterventionAccess = Boolean(overview?.premiumInterventionAccess);
  const classAdaptiveSummary = overview?.adaptiveSummary ?? null;
  const classInterventionEffectiveness = overview?.interventionEffectiveness ?? null;
  const classInterventionReview = overview?.interventionReview ?? null;
  const classInterventionHistory = overview?.interventionHistory ?? [];
  const canShowClassIntervention = Boolean(
    premiumInterventionAccess &&
      adaptiveEnabled &&
      classAdaptiveSummary &&
      classInterventionEffectiveness &&
      classInterventionReview,
  );

  async function loadClass() {
    const [classRes, overviewRes] = await Promise.all([
      fetch(`/api/classes/${classId}`, { cache: "no-store" }),
      fetch(`/api/classes/${classId}/overview`, { cache: "no-store" }),
    ]);
    const classData = await classRes.json().catch(() => ({}));
    const overviewData = await overviewRes.json().catch(() => ({}));
    if (!classRes.ok) {
      throw new Error(classData?.error || "Failed to load class");
    }
    if (!overviewRes.ok) {
      throw new Error(overviewData?.error || "Failed to load class overview");
    }
    const nextClass = classData?.class as ClassDetail;
    setClassRecord(nextClass);
    setOverview(overviewData as ClassOverview);
    setClassForm({
      name: nextClass.name || "",
      subject: nextClass.subject || "",
      gradeLevel: nextClass.gradeLevel || "",
      section: nextClass.section || "",
      schoolYear: nextClass.schoolYear || "",
    });
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!classId) return;
      setLoading(true);
      setError(null);
      try {
        await loadClass();
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load class");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [classId]);

  useEffect(() => {
    let mounted = true;
    async function loadAdaptivePreference() {
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !mounted) return;
        setAdaptiveEnabled(
          Boolean(
            json?.user?.subscriptionPlan === "premium" && json?.user?.adaptiveLearning,
          ),
        );
      } catch {
        if (mounted) setAdaptiveEnabled(false);
      }
    }
    void loadAdaptivePreference();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const rosterSummary = useMemo(() => {
    const students = classRecord?.students ?? [];
    const withEmail = students.filter((student) => student.studentEmail).length;
    return {
      total: students.length,
      withEmail,
      withoutEmail: students.length - withEmail,
    };
  }, [classRecord]);

  const overviewSummary = overview?.summary;
  const classAdaptiveQuizHref = useMemo(() => {
    if (!classRecord || !overview?.adaptiveSummary) return "/generate-quiz";
    const focus = overview.adaptiveSummary.focus.slice(0, 2).join("; ");
    const prompt = [
      `Create a reteach quiz for ${classRecord.name}.`,
      classRecord.subject ? `Subject: ${classRecord.subject}.` : "",
      classRecord.gradeLevel ? `Grade: ${classRecord.gradeLevel}.` : "",
      focus ? `Focus on these weak concepts: ${focus}.` : "",
      `Support level: ${overview.adaptiveSummary.supportLevel}.`,
      overview.adaptiveSummary.recommendation,
    ]
      .filter(Boolean)
      .join(" ");
    const params = new URLSearchParams({
      prompt,
      interventionSourceType: "class",
      interventionSourceId: classRecord.id,
      interventionClassId: classRecord.id,
      interventionClassName: classRecord.name,
      interventionMode: "adaptive_quiz",
    });
    return `/generate-quiz?${params.toString()}`;
  }, [classRecord, overview]);

  const classAdaptiveLessonHref = useMemo(() => {
    if (!classRecord || !overview?.adaptiveSummary) return "/lessonPlan";
    const focus = overview.adaptiveSummary.focus.slice(0, 2).join("; ");
    const params = new URLSearchParams({
      topic: `Adaptive Follow-Up for ${classRecord.name}`,
      subject: classRecord.subject || "",
      grade: classRecord.gradeLevel || "",
      days: "1",
      minutesPerDay: "40",
      objectives: focus
        ? `Reteach these weak concepts: ${focus}`
        : `Reinforce the current weak concepts for ${classRecord.name}`,
      constraints: overview.adaptiveSummary.recommendation,
      interventionSourceType: "class",
      interventionSourceId: classRecord.id,
      interventionClassId: classRecord.id,
      interventionClassName: classRecord.name,
      interventionMode: "adaptive_lesson",
    });
    return `/lessonPlan?${params.toString()}`;
  }, [classRecord, overview]);

  const classInterventionSummaryText = useMemo(() => {
    if (
      !classRecord ||
      !overview ||
      !overview.premiumInterventionAccess ||
      !overview.adaptiveSummary ||
      !overview.interventionEffectiveness
    ) {
      return "";
    }
    return [
      "Class Intervention Summary",
      `Class: ${classRecord.name}`,
      classRecord.subject ? `Subject: ${classRecord.subject}` : "",
      classRecord.gradeLevel ? `Grade: ${classRecord.gradeLevel}` : "",
      `Students: ${overview.summary.studentCount}`,
      `Active assignments: ${overview.summary.activeAssignmentCount}`,
      `Average score: ${overview.summary.averageScore}%`,
      `Missing submissions: ${overview.summary.totalMissingSubmissions}`,
      `Adaptive summary: ${overview.adaptiveSummary.summary}`,
      `Recommendation: ${overview.adaptiveSummary.recommendation}`,
      `Follow-up impact: ${overview.interventionEffectiveness.summary}`,
      overview.interventionEffectiveness.baseline.weakConcepts.length
        ? `Baseline weak concepts: ${overview.interventionEffectiveness.baseline.weakConcepts.join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [classRecord, overview]);

  function updateClassField<K extends keyof ClassForm>(key: K, value: ClassForm[K]) {
    setClassForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateStudentField<K extends keyof StudentForm>(key: K, value: StudentForm[K]) {
    setStudentForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classForm) return;
    setSavingClass(true);
    setError(null);

    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save class");
      }
      await loadClass();
      setSuccess("Class updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save class");
    } finally {
      setSavingClass(false);
    }
  }

  async function handleToggleArchive() {
    if (!classRecord) return;
    setSavingClass(true);
    setError(null);

    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !classRecord.archived }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update class");
      }
      await loadClass();
      setSuccess(classRecord.archived ? "Class reopened" : "Class archived");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update class");
    } finally {
      setSavingClass(false);
    }
  }

  async function handleAddStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddingStudent(true);
    setError(null);

    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to add student");
      }
      setStudentForm(EMPTY_STUDENT_FORM);
      await loadClass();
      setSuccess("Student added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleBulkAddStudents() {
    if (!bulkRoster.trim()) return;
    setAddingStudent(true);
    setError(null);

    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkText: bulkRoster }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to import students");
      }
      setBulkRoster("");
      await loadClass();
      setSuccess("Roster imported");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import students");
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    setDeletingStudentId(studentId);
    setError(null);

    try {
      const res = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to remove student");
      }
      await loadClass();
      setSuccess("Student removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove student");
    } finally {
      setDeletingStudentId(null);
    }
  }

  async function handleRosterFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingRoster(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("rosterFile", file);

      const res = await fetch(`/api/classes/${classId}/students`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to import roster file");
      }
      await loadClass();
      setSuccess("Roster file imported");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import roster file");
    } finally {
      if (rosterFileInputRef.current) {
        rosterFileInputRef.current.value = "";
      }
      setUploadingRoster(false);
    }
  }

  async function handleEmailAssignment(assignmentId: string, mode: "all" | "missing_only" = "all") {
    setEmailingAssignmentId(assignmentId);
    setError(null);

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send quiz link to roster");
      }
      setSuccess(
        `${mode === "missing_only" ? "Reminder" : "Quiz link"} sent to ${Number(data?.emailedCount || 0)} roster email${Number(data?.emailedCount || 0) === 1 ? "" : "s"}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quiz link to roster");
    } finally {
      setEmailingAssignmentId(null);
    }
  }

  async function handleConfirmEmailAction() {
    if (!pendingEmailAction) return;
    await handleEmailAssignment(pendingEmailAction.assignmentId, pendingEmailAction.mode);
    setPendingEmailAction(null);
  }

  async function handleDeleteAssignment() {
    if (!pendingDeleteAssignment) return;
    setDeletingAssignmentId(pendingDeleteAssignment.id);
    setError(null);

    try {
      const res = await fetch(`/api/assignments/${pendingDeleteAssignment.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete assignment");
      }
      setPendingDeleteAssignment(null);
      await loadClass();
      setSuccess("Assignment deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment");
    } finally {
      setDeletingAssignmentId(null);
    }
  }

  async function handleCopyInterventionSummary() {
    try {
      await navigator.clipboard.writeText(classInterventionSummaryText);
      setShowCopySummaryModal(true);
      setError(null);
    } catch {
      setError("Failed to copy intervention summary");
    }
  }

  function handlePrintInterventionSummary() {
    if (!printElementContent(interventionSummaryRef.current, "Class Intervention Summary")) {
      setError("Failed to open a focused print preview");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Tour steps={classDetailTourSteps} tourId="class-detail-workflow" />
      <CopySummaryModal
        open={showCopySummaryModal}
        onOpenChange={setShowCopySummaryModal}
        title="Class summary copied"
      />
      <ConfirmActionModal
        open={Boolean(pendingDeleteAssignment)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteAssignment(null);
        }}
        title="Delete assignment?"
        description={
          pendingDeleteAssignment
            ? `This will remove ${pendingDeleteAssignment.title} from this class workflow.`
            : ""
        }
        confirmLabel="Delete Assignment"
        loading={Boolean(
          pendingDeleteAssignment && deletingAssignmentId === pendingDeleteAssignment.id
        )}
        onConfirm={handleDeleteAssignment}
      />
      <EmailConfirmModal
        open={Boolean(pendingEmailAction)}
        onOpenChange={(open) => {
          if (!open) setPendingEmailAction(null);
        }}
        title={pendingEmailAction?.title || "Send class email"}
        description={pendingEmailAction?.description || ""}
        confirmLabel={pendingEmailAction?.confirmLabel || "Send Email"}
        loading={Boolean(
          pendingEmailAction && emailingAssignmentId === pendingEmailAction.assignmentId
        )}
        onConfirm={handleConfirmEmailAction}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/classes">
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Link>
        </Button>
        <Button asChild>
          <Link href="/generate-quiz">Generate Quiz for This Class</Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {loading || !classRecord || !classForm ? (
        <div className="space-y-4">
          <SkeletonLoading className="h-40 w-full rounded-3xl" />
          <SkeletonLoading className="h-80 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          <section
            id="class-detail-hero"
            className="relative overflow-hidden rounded-3xl border border-emerald-200/50 bg-linear-to-r from-slate-950 via-emerald-900 to-cyan-800 p-6 text-white shadow-[0_20px_55px_-20px_rgba(5,150,105,0.65)]"
          >
            <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-14 h-32 w-32 rounded-full bg-emerald-300/15 blur-3xl" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border border-white/20 bg-white/15 text-white">
                    {classRecord.archived ? "Archived" : "Active"}
                  </Badge>
                  <Badge className="border border-white/20 bg-white/15 text-white">
                    {classRecord.subject || "Subject pending"}
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold sm:text-3xl">{classRecord.name}</h1>
                <p className="max-w-2xl text-sm text-emerald-50/90 sm:text-base">
                  {[classRecord.gradeLevel, classRecord.section, classRecord.schoolYear]
                    .filter(Boolean)
                    .join(" / ") || "Add grade, section, and school year details to ground future assignments and results."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[280px]">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-emerald-50/75">Students</p>
                  <p className="mt-1 text-2xl font-semibold">{classRecord._count.students}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <p className="text-emerald-50/75">Assignments</p>
                  <p className="mt-1 text-2xl font-semibold">{classRecord._count.assignments}</p>
                </div>
              </div>
            </div>
          </section>

          {overviewSummary ? (
            <section id="class-health-metrics" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-slate-200/80 bg-white/95">
                <CardContent className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-sm text-slate-500">Class average</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {overviewSummary.averageScore}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Based on recent submitted assignments.
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white/95">
                <CardContent className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-sm text-slate-500">Active assignments</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {overviewSummary.activeAssignmentCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Live work currently attached to this class.
                    </p>
                  </div>
                  <BookOpenCheck className="h-5 w-5 text-cyan-600" />
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white/95">
                <CardContent className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-sm text-slate-500">Missing submissions</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {overviewSummary.totalMissingSubmissions}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Open work still missing across active assignments.
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white/95">
                <CardContent className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-sm text-slate-500">Due soon</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {overviewSummary.dueSoonCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Upcoming deadlines that may need reminders or follow-up.
                    </p>
                  </div>
                  <Clock3 className="h-5 w-5 text-violet-600" />
                </CardContent>
              </Card>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <Card id="class-overview" className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
              <CardHeader>
                <CardTitle>Class Overview</CardTitle>
                <CardDescription>
                  Track the health of this class before you jump into individual assignments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview?.dueSoonAssignments.length ? (
                  <ScrollPanel
                    className="border-violet-200"
                    maxHeightClassName="max-h-[30rem]"
                    viewportClassName="space-y-3"
                  >
                    {overview.dueSoonAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(76,29,149,0.22)]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{assignment.title}</p>
                          <Badge variant="secondary">{assignment.status}</Badge>
                          <Badge variant="secondary">{assignment.missingCount} missing</Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "date not set"}.
                          {" "}
                          {assignment.submissionCount} submitted so far, average score {assignment.averageScore}%.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/assignments/${assignment.id}`}>Open Results</Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPendingEmailAction({
                                assignmentId: assignment.id,
                                mode: "missing_only",
                                title: "Send reminder to missing students?",
                                description: `This will email only the students in ${classRecord.name} who still have not submitted ${assignment.title}.`,
                                confirmLabel: "Send Reminder",
                              })
                            }
                            disabled={emailingAssignmentId === assignment.id || rosterSummary.withEmail === 0}
                          >
                            <Mail className="h-4 w-4" />
                            {emailingAssignmentId === assignment.id ? "Sending..." : "Remind Missing Students"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollPanel>
                ) : (
                  <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 p-5">
                    <p className="font-medium text-slate-900">No due-soon work right now</p>
                    <p className="mt-2 text-sm text-slate-500">
                      This class has no upcoming assignment deadlines in the current overview window.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card id="class-recent-results" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader>
                <CardTitle>Recent Class Results</CardTitle>
                <CardDescription>
                  Spot where this class is performing well and where follow-up may be needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview?.recentResults.length ? (
                  <ScrollPanel
                    className="border-cyan-200"
                    maxHeightClassName="max-h-[30rem]"
                    viewportClassName="space-y-3"
                  >
                    {overview.recentResults.map((result) => (
                      <div key={result.id} className="rounded-2xl border border-cyan-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">{result.title}</p>
                          <Badge variant="secondary">{result.averageScore}% avg</Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {result.submissionCount} submitted, {result.missingCount} still missing.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/assignments/${result.id}`}>View Results</Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/generate-quiz?prefill=${encodeURIComponent(
                              `Create a reteach quiz for ${classRecord.name} based on the weak performance in "${result.title}".`,
                            )}`}
                            >
                              <Sparkles className="h-4 w-4" />
                              Generate Reteach Quiz
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollPanel>
                ) : (
                  <div className="rounded-2xl border border-dashed border-cyan-200 bg-white/80 p-5">
                    <p className="font-medium text-slate-900">No graded results yet</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Once students submit work, this class page will surface the latest performance here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <MasonryGrid className="xl:grid-cols-3">
            <Card id="class-weak-concepts" className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
              <CardHeader>
                <CardTitle>Weak Concept Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!premiumInterventionAccess ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                    Teacher Premium unlocks recurring weak-concept trends for this class.
                  </div>
                ) : !overview?.weakQuestionTrends.length ? (
                  <p className="text-sm text-slate-500">Weak-concept trends will appear after more scored work.</p>
                ) : (
                  <ScrollPanel
                    className="border-amber-100"
                    maxHeightClassName="max-h-80"
                    viewportClassName="space-y-2"
                  >
                    {overview.weakQuestionTrends.map((item) => (
                      <div key={item.label} className="min-w-0 rounded-2xl border border-amber-100 bg-white p-4">
                        <p className="break-words text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {item.missCount} misses across {item.assignmentTitles.join(", ")}
                        </p>
                      </div>
                    ))}
                  </ScrollPanel>
                )}
              </CardContent>
            </Card>
            
            <Card id="class-students-risk" className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
              <CardHeader>
                <CardTitle>Students At Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!premiumInterventionAccess ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-500">
                    Teacher Premium unlocks student risk tracking for intervention planning.
                  </div>
                ) : !overview?.studentsAtRisk.length ? (
                  <p className="text-sm text-slate-500">No repeated low-score student pattern is standing out yet.</p>
                ) : (
                  <ScrollPanel
                    className="border-violet-100"
                    maxHeightClassName="max-h-80"
                    viewportClassName="space-y-2"
                  >
                    {overview.studentsAtRisk.map((student, idx) => (
                      <div
                        key={`${student.studentEmail || student.studentName || idx}`}
                        className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4"
                      >
                        <p className="break-words text-sm font-medium text-slate-900">
                          {student.studentName || student.studentEmail || "Student"}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {student.averageScore}% avg / {student.lowScoreCount} low-score assignment
                          {student.lowScoreCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    ))}
                  </ScrollPanel>
                )}
              </CardContent>
            </Card>

            <Card id="class-intervention-summary" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader>
                <CardTitle>Intervention Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <ScrollPanel
                  className="border-cyan-200"
                  maxHeightClassName="max-h-40"
                  viewportClassName="break-words whitespace-normal text-sm text-slate-600"
                >
                  {premiumInterventionAccess
                    ? overview?.interventionSummary ||
                      "Intervention guidance will appear once multiple assignments build up class performance patterns."
                    : "Teacher Premium unlocks class intervention summaries and adaptive follow-up planning."}
                </ScrollPanel>
                {premiumInterventionAccess && !!overview?.performanceTrend.length && (
                  <ScrollPanel
                    className="border-cyan-200"
                    maxHeightClassName="max-h-72"
                    viewportClassName="space-y-2"
                  >
                    {overview.performanceTrend.map((point) => (
                      <div key={point.id} className="min-w-0 rounded-2xl border border-cyan-200 bg-white p-4">
                        <p className="break-words text-sm font-medium text-slate-900">{point.label}</p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {point.averageScore}% avg / {point.completionRate}% completion
                        </p>
                      </div>
                    ))}
                  </ScrollPanel>
                )}
              </CardContent>
            </Card>

            {canShowClassIntervention ? (
            <div>
            <Card id="class-followup-impact-metrics" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
              <CardHeader>
                <CardTitle>Impact Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid items-start gap-3 md:grid-cols-3 xl:grid-cols-1">
                  <div className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Score delta</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {classInterventionEffectiveness!.delta ? `${classInterventionEffectiveness!.delta!.score >= 0 ? "+" : ""}${classInterventionEffectiveness!.delta!.score}%` : "--"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Submission recovery</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {classInterventionEffectiveness!.delta ? `${classInterventionEffectiveness!.delta!.missing >= 0 ? "-" : "+"}${Math.abs(classInterventionEffectiveness!.delta!.missing)}` : "--"}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Student impact</p>
                  <p className="mt-2 text-sm text-slate-600">
                      {classInterventionEffectiveness!.studentImpact.improvedCount} improved
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                      {classInterventionEffectiveness!.studentImpact.stillAtRiskCount} still at risk
                  </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
            ) : null}

            {!premiumInterventionAccess ? (
            <div>
            <Card
              id="class-premium-intervention-lock"
              className="border-amber-200/80 bg-linear-to-br from-white via-amber-50 to-orange-50"
            >
              <CardHeader>
                <CardTitle>Premium Intervention Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Upgrade to Teacher Premium to unlock class intervention summaries, adaptive
                  follow-up plans, intervention history, and post-intervention review.
                </p>
                <Button asChild>
                  <Link href="/subscription">Unlock Premium</Link>
                </Button>
              </CardContent>
            </Card>
            </div>
            ) : null}

            {canShowClassIntervention ? (
            <div>
            <Card id="class-adaptive-followup" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
              <CardHeader>
                <CardTitle>Adaptive Follow-Up</CardTitle>
                <CardDescription>
                  Class-specific follow-up guidance shaped by recent scores, missing work, and recurring weak concepts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-indigo-200 bg-white p-4 text-sm text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">Support level</p>
                    <Badge variant="secondary">
                      {classAdaptiveSummary!.supportLevel.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 break-words whitespace-normal">
                    {classAdaptiveSummary!.summary}
                  </p>
                  <p className="mt-2 break-words whitespace-normal text-xs text-slate-500">
                    {classAdaptiveSummary!.recommendation}
                  </p>
                </div>
                {!!classAdaptiveSummary!.focus.length && (
                  <div className="flex flex-wrap gap-2">
                      {classAdaptiveSummary!.focus.map((item) => (
                        <Badge key={item} variant="secondary" className="max-w-full whitespace-normal break-words text-left">
                          {item}
                        </Badge>
                    ))}
                  </div>
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="min-w-0 overflow-hidden rounded-2xl border border-indigo-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Difficulty shift
                    </p>
                    <p className="mt-2 break-words font-medium text-slate-900">
                      {classAdaptiveSummary!.difficultyShift.label}
                    </p>
                    <p className="mt-1 break-words whitespace-normal text-xs text-slate-500">
                      {classAdaptiveSummary!.difficultyShift.rationale}
                    </p>
                  </div>
                  <div className="min-w-0 overflow-hidden rounded-2xl border border-indigo-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Grouped student support
                    </p>
                    <div className="mt-2 text-sm text-slate-600">
                      {classAdaptiveSummary!.groupedSupport.length ? (
                        <ScrollPanel
                          className="border-indigo-100"
                          maxHeightClassName="max-h-64"
                          viewportClassName="space-y-2"
                        >
                          {classAdaptiveSummary!.groupedSupport.map((group) => (
                            <div key={group.label} className="min-w-0 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                              <p className="break-words font-medium text-slate-900">
                                {group.label} - {group.count}
                              </p>
                              {!!group.sampleStudents.length && (
                                <p className="mt-1 break-words whitespace-normal text-xs text-slate-500">
                                  {group.sampleStudents.join(", ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </ScrollPanel>
                      ) : (
                        <p className="text-xs text-slate-500">
                          No intervention groups identified yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {!!classAdaptiveSummary!.remediationSequence.length && (
                  <div className="min-w-0 overflow-hidden rounded-2xl border border-indigo-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Remediation sequence
                    </p>
                    <ScrollPanel
                      className="mt-3 border-indigo-100"
                      maxHeightClassName="max-h-64"
                      viewportClassName="space-y-2 px-0 py-0 pr-2"
                    >
                      <ol className="space-y-2 text-sm text-slate-600 px-4 py-4">
                        {classAdaptiveSummary!.remediationSequence.map((step, index) => (
                          <li key={`${index}-${step}`} className="flex gap-3">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                              {index + 1}
                            </span>
                            <span className="break-words whitespace-normal">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </ScrollPanel>
                  </div>
                )}
                <div className="grid gap-3 xl:grid-cols-2">
                  <Link
                    href={classAdaptiveQuizHref}
                    className="group flex min-w-0 flex-col items-start gap-1 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-4 py-4 text-left shadow-[0_12px_28px_-18px_rgba(79,70,229,0.9)] transition hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700"
                  >
                    <span className="block w-full break-words text-sm font-semibold leading-5 text-white">
                      Generate Adaptive Quiz
                    </span>
                    <span className="block w-full break-words text-[11px] font-medium leading-4 text-indigo-100/95">
                      Build a focused reteach check from this class&apos;s weakest concepts.
                    </span>
                  </Link>
                  <Link
                    href={classAdaptiveLessonHref}
                    className="group flex min-w-0 flex-col items-start gap-1 rounded-2xl border border-indigo-200 bg-white px-4 py-4 text-left shadow-[0_10px_24px_-18px_rgba(99,102,241,0.35)] transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span className="block w-full break-words text-sm font-semibold leading-5 text-indigo-700">
                      Create Adaptive Lesson Plan
                    </span>
                    <span className="block w-full break-words text-[11px] font-medium leading-4 text-slate-500">
                      Turn the current class pattern into a guided follow-up lesson.
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
            </div>
            ) : null}

            {canShowClassIntervention ? (
            <div>
            <Card id="class-followup-impact-summary" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
              <CardHeader>
                <CardTitle>Impact Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-semibold text-slate-900">{classInterventionReview!.headline}</p>
                    <Badge
                      variant="outline"
                      className={
                        classInterventionReview!.provenEffective
                          ? "border-emerald-300 text-emerald-700"
                          : "border-slate-300 text-slate-600"
                      }
                    >
                      {classInterventionReview!.provenEffective
                        ? "Proven Effective"
                        : classInterventionReview!.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 break-words whitespace-normal text-sm text-slate-600">{classInterventionReview!.summary}</p>
                  <p className="mt-2 break-words whitespace-normal text-xs text-slate-500">{classInterventionReview!.nextMove}</p>
                </div>
                <div className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">
                    {classInterventionEffectiveness!.hasData ? "Intervention review" : "Waiting for post-intervention results"}
                  </p>
                  <p className="mt-2 break-words whitespace-normal">{classInterventionEffectiveness!.summary}</p>
                  {classInterventionEffectiveness!.launchedAt ? (
                    <p className="mt-2 break-words text-xs text-slate-500">
                      Tracking from {new Date(classInterventionEffectiveness!.launchedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            </div>
            ) : null}

            {canShowClassIntervention ? (
            <div>
            <Card id="class-followup-comparison" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
              <CardHeader>
                <CardTitle>Baseline vs Post</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Baseline</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {classInterventionEffectiveness!.baseline.averageScore}% average
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {classInterventionEffectiveness!.baseline.missingCount} missing submissions
                    </p>
                    {!!classInterventionEffectiveness!.baseline.weakConcepts.length && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Baseline weak concepts
                        </p>
                        <ScrollPanel
                          className="border-emerald-100"
                          maxHeightClassName="max-h-56"
                          viewportClassName="space-y-2 px-3 py-3 pr-2"
                        >
                          {classInterventionEffectiveness!.baseline.weakConcepts.map((concept, index) => (
                            <div
                              key={`${index}-${concept}`}
                              className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm leading-5 text-slate-700"
                            >
                              {concept}
                            </div>
                          ))}
                        </ScrollPanel>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Post follow-up</p>
                    {classInterventionEffectiveness!.post ? (
                      <>
                        <p className="mt-2 break-words text-sm text-slate-600">
                          {classInterventionEffectiveness!.post.averageScore}% average across {classInterventionEffectiveness!.post.measuredAssignmentCount} assignment{classInterventionEffectiveness!.post.measuredAssignmentCount === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 break-words text-sm text-slate-600">
                          {classInterventionEffectiveness!.post.missingCount} missing submissions
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          Weak concepts still carrying over: {classInterventionEffectiveness!.post.weakConceptCarryoverCount}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 break-words text-sm text-slate-500">No scored post-intervention work yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
            ) : null}

            {canShowClassIntervention ? (
            <div ref={interventionSummaryRef}>
            <Card id="class-intervention-report" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50 print:border-slate-300">
              <CardHeader>
                <CardTitle>Intervention Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ScrollPanel
                  className="border-slate-200 shadow-inner shadow-slate-100/70"
                  maxHeightClassName="max-h-[35rem]"
                  viewportClassName="whitespace-pre-line break-words text-sm leading-7 text-slate-600"
                >
                  {classInterventionSummaryText}
                </ScrollPanel>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <Button type="button" variant="outline" onClick={() => void handleCopyInterventionSummary()}>
                    <Copy className="h-4 w-4" />
                    Copy Summary
                  </Button>
                  <Button type="button" variant="outline" onClick={handlePrintInterventionSummary}>
                    Print Summary
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
            ) : null}

            {canShowClassIntervention ? (
            <div>
            <Card id="class-intervention-timeline" className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
              <CardHeader>
                <CardTitle>Intervention Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!classInterventionHistory.length ? (
                  <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 p-4 text-sm text-slate-500">
                    Adaptive quizzes and follow-up lessons created from this class will appear here.
                  </div>
                ) : (
                  <ScrollPanel
                    className="border-violet-200"
                    maxHeightClassName="max-h-96"
                    viewportClassName="space-y-3"
                  >
                    {classInterventionHistory.map((event, index) => (
                      <div key={`${event.createdAt}-${index}`} className="min-w-0 rounded-2xl border border-violet-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{event.mode?.replace(/_/g, " ") || event.eventType}</Badge>
                          <Badge variant="outline">{event.status}</Badge>
                        </div>
                        <p className="mt-2 break-words text-sm font-medium text-slate-900">
                          {event.promptTopic || event.assignmentTitle || "Adaptive follow-up launched"}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </ScrollPanel>
                )}
              </CardContent>
            </Card>
            </div>
            ) : null}

          </MasonryGrid>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card id="class-profile" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Class Profile</CardTitle>
                    <CardDescription>
                      Keep the classroom context accurate so results, reminders, and follow-up work stay grounded.
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleToggleArchive} disabled={savingClass}>
                    <Archive className="h-4 w-4" />
                    {classRecord.archived ? "Reopen Class" : "Archive Class"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSaveClass}>
                  <div className="space-y-2">
                    <Label htmlFor="detail-name">Class Name</Label>
                    <Input
                      id="detail-name"
                      value={classForm.name}
                      onChange={(event) => updateClassField("name", event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="detail-subject">Subject</Label>
                      <Input
                        id="detail-subject"
                        value={classForm.subject}
                        onChange={(event) => updateClassField("subject", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-grade">Grade Level</Label>
                      <Input
                        id="detail-grade"
                        value={classForm.gradeLevel}
                        onChange={(event) => updateClassField("gradeLevel", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="detail-section">Section</Label>
                      <Input
                        id="detail-section"
                        value={classForm.section}
                        onChange={(event) => updateClassField("section", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-year">School Year</Label>
                      <Input
                        id="detail-year"
                        value={classForm.schoolYear}
                        onChange={(event) => updateClassField("schoolYear", event.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingClass}>
                    {savingClass ? "Saving..." : "Save Class Details"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card id="class-teaching-workflow" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader>
                <CardTitle>Teaching Workflow</CardTitle>
                <CardDescription>
                  This class now holds the roster and assignments that keep daily teaching work in one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <BookOpenCheck className="h-4 w-4 text-cyan-600" />
                    Classroom loop
                  </div>
                  <p className="mt-2">
                    Use this page as the operating hub for the class: keep the roster accurate,
                    watch due-soon work, review class performance, and launch reminders or follow-up teaching actions.
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                  <p className="font-medium text-slate-900">Suggested next action</p>
                  <p className="mt-2">
                    {overviewSummary?.totalMissingSubmissions
                      ? "Review the due-soon assignments and remind missing students before the next class session."
                      : "Generate a quiz for this class, assign it, then email the assignment link to the students who already have roster emails."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card id="class-roster" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Roster</CardTitle>
                    <CardDescription>
                      Keep a lightweight roster here so submissions can connect to real students
                      later without forcing student signup.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{rosterSummary.total} total</Badge>
                    <Badge variant="secondary">{rosterSummary.withEmail} with email</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {classRecord.students.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-center">
                    <p className="font-medium text-slate-900">No students yet</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Add them one by one or paste a roster list to prepare this class for
                      assignment tracking.
                    </p>
                  </div>
                ) : (
                  <ScrollPanel
                    className="border-slate-200"
                    maxHeightClassName="max-h-[34rem]"
                    viewportClassName="space-y-3"
                  >
                    {classRecord.students.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <UsersRound className="h-4 w-4 text-violet-600" />
                              <p className="font-medium text-slate-900">{student.studentName}</p>
                            </div>
                            <p className="text-sm text-slate-600">
                              {[student.studentEmail, student.studentNumber].filter(Boolean).join(" / ") ||
                                "No email or student number yet"}
                            </p>
                            {student.notes ? (
                              <p className="text-xs text-slate-500">{student.notes}</p>
                            ) : null}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleRemoveStudent(student.id)}
                            disabled={deletingStudentId === student.id}
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingStudentId === student.id ? "Removing..." : "Remove"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollPanel>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card id="class-add-student" className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
                <CardHeader>
                  <CardTitle>Add Student</CardTitle>
                  <CardDescription>
                    Start with a lightweight identity. Email is optional for now.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleAddStudent}>
                    <div className="space-y-2">
                      <Label htmlFor="student-name">Student Name</Label>
                      <Input
                        id="student-name"
                        value={studentForm.studentName}
                        onChange={(event) => updateStudentField("studentName", event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-email">Student Email</Label>
                      <Input
                        id="student-email"
                        type="email"
                        value={studentForm.studentEmail}
                        onChange={(event) => updateStudentField("studentEmail", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-number">Student Number</Label>
                      <Input
                        id="student-number"
                        value={studentForm.studentNumber}
                        onChange={(event) => updateStudentField("studentNumber", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-notes">Notes</Label>
                      <Textarea
                        id="student-notes"
                        value={studentForm.notes}
                        onChange={(event) => updateStudentField("notes", event.target.value)}
                        placeholder="Optional learning support note or reminder"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={addingStudent}>
                      <Plus className="h-4 w-4" />
                      {addingStudent ? "Adding..." : "Add Student"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card id="class-roster-import" className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
                <CardHeader>
                  <CardTitle>Quick Roster Paste</CardTitle>
                  <CardDescription>
                    Paste one student per line as{" "}
                    <span className="font-medium">name, email, student number</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={bulkRoster}
                    onChange={(event) => setBulkRoster(event.target.value)}
                    placeholder={"Ana Cruz, ana@school.edu, 2026-001\nLeo Tan, leo@school.edu, 2026-002"}
                    className="min-h-36"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => void handleBulkAddStudents()}
                      disabled={addingStudent || !bulkRoster.trim()}
                    >
                      {addingStudent ? "Importing..." : "Import Roster"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => rosterFileInputRef.current?.click()}
                      disabled={uploadingRoster}
                    >
                      <FileUp className="h-4 w-4" />
                      {uploadingRoster ? "Uploading..." : "Upload Roster File"}
                    </Button>
                  </div>
                  <input
                    ref={rosterFileInputRef}
                    type="file"
                    accept=".csv,.txt,.xlsx"
                    className="hidden"
                    onChange={(event) => void handleRosterFileChange(event)}
                  />
                  <p className="text-xs text-slate-500">
                    Supported roster files: <span className="font-medium">CSV, TXT, XLSX</span>.
                    Use columns in this order: name, email, student number.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card id="class-assignments" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50">
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>
                Review both quiz and lesson-plan assignments here. Quiz assignments can email student links,
                while lesson-plan assignments stay connected to the class planning workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {classRecord.assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6">
                  <p className="font-medium text-slate-900">No assignments yet</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Assign a generated quiz to this class and it will appear here with student-link
                    actions for the roster.
                  </p>
                </div>
              ) : (
                <ScrollPanel
                  className="border-slate-200"
                  maxHeightClassName="max-h-[36rem]"
                  viewportClassName="space-y-3"
                >
                  {classRecord.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{assignment.title}</p>
                        <Badge variant="secondary">{assignment.status}</Badge>
                        <Badge variant="secondary">{assignment._count.attempts} submissions</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {assignment.quiz?.title || assignment.lessonPlan?.title || "Linked resource pending"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild type="button" variant="outline" size="sm">
                          <Link href={`/assignments/${assignment.id}`}>
                            {assignment.quiz ? "View Results" : "Open Assignment"}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setPendingDeleteAssignment({
                              id: assignment.id,
                              title: assignment.title,
                            })
                          }
                          disabled={deletingAssignmentId === assignment.id}
                        >
                          {deletingAssignmentId === assignment.id ? "Deleting..." : "Delete Assignment"}
                        </Button>
                        {assignment.quiz ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPendingEmailAction({
                                assignmentId: assignment.id,
                                mode: "all",
                                title: "Email quiz link to the class?",
                                description: `This will send the ${assignment.title} link to roster students in ${classRecord.name} who have saved email addresses.`,
                                confirmLabel: "Email Quiz Link",
                              })
                            }
                            disabled={emailingAssignmentId === assignment.id || rosterSummary.withEmail === 0}
                          >
                            <Mail className="h-4 w-4" />
                            {emailingAssignmentId === assignment.id ? "Sending..." : "Email Quiz Link"}
                          </Button>
                        ) : null}
                        {assignment.quiz && rosterSummary.withEmail === 0 ? (
                          <p className="self-center text-xs text-slate-500">
                            Add roster emails first to send this assignment automatically.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </ScrollPanel>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
