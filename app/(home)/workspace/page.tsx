"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  Copy,
  FileClock,
  FolderClock,
  LineChart,
  Presentation,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopySummaryModal } from "@/components/ui/copy-summary-modal";
import Tour from "@/components/ui/tour";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import { workspaceTourSteps } from "../teacher-workflow-tour-steps";
import { printElementContent } from "@/lib/print-element";

type WorkspaceData = {
  premiumInterventionAccess: boolean;
  todayView: {
    dueTodayCount: number;
    overdueCount: number;
    draftCount: number;
    reminderNeededCount: number;
    lowScoreAlertCount: number;
    recentSubmissionCount: number;
  };
  latestClass: {
    id: string;
    name: string;
    subject: string | null;
    gradeLevel: string | null;
    section: string | null;
    updatedAt: string;
  } | null;
  dueSoonAssignments: {
    id: string;
    title: string;
    dueAt: string | null;
    class: {
      id: string;
      name: string;
    };
    submissionCount: number;
  }[];
  overdueAssignments: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    updatedAt: string;
    class: {
      id: string;
      name: string;
    };
    submissionCount: number;
    studentCount: number;
    missingCount: number;
  }[];
  draftAssignments: {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
    class: {
      id: string;
      name: string;
    };
    quiz: {
      id: number;
      title: string;
    } | null;
    lessonPlan: {
      id: string;
      title: string;
    } | null;
  }[];
  reminderNeededAssignments: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    class: {
      id: string;
      name: string;
    };
    submissionCount: number;
    studentCount: number;
    missingCount: number;
    lastRosterEmailAt: string | null;
    lastReminderAt: string | null;
  }[];
  lowScoreAlerts: {
    id: string;
    title: string;
    class: {
      id: string;
      name: string;
    };
    averageScore: number;
    submissionCount: number;
    studentCount: number;
    missingCount: number;
  }[];
  recentSubmissions: {
    id: string;
    studentName: string | null;
    studentEmail: string | null;
    scorePercent: number;
    submittedAt: string;
    assignment: {
      id: string;
      title: string;
      class: {
        id: string;
        name: string;
      };
    } | null;
  }[];
  suggestedAction: {
    type: string;
    title: string;
    description: string;
    href: string;
  };
  alertGroupsByClass: {
    classId: string;
    className: string;
    lowScoreAssignments: number;
    missingSubmissions: number;
    weakestScore: number;
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
  weakQuestionTrends: {
    label: string;
    missCount: number;
    assignmentTitles: string[];
    classNames: string[];
  }[];
  performanceTrend: {
    id: string;
    label: string;
    averageScore: number;
    completionRate: number;
    submittedAt: string | null;
  }[];
  interventionSummary: string | null;
  adaptiveWorkspaceSummary: {
    supportLevel: string;
    focus: string[];
    primaryClassName: string | null;
    primaryClassId: string | null;
    summary: string;
    recommendation: string;
    suggestedPrompt: string;
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
  workspaceInterventionReview: {
    headline: string;
    summary: string;
    nextMove: string;
  } | null;
};

export default function WorkspacePage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);
  const [showCopySummaryModal, setShowCopySummaryModal] = useState(false);
  const interventionSummaryRef = useRef<HTMLDivElement | null>(null);
  const premiumInterventionAccess = Boolean(data?.premiumInterventionAccess);
  const workspaceAdaptiveSummary = data?.adaptiveWorkspaceSummary ?? null;
  const workspaceInterventionReview = data?.workspaceInterventionReview ?? null;
  const canShowWorkspaceIntervention = Boolean(
    premiumInterventionAccess &&
      adaptiveEnabled &&
      workspaceAdaptiveSummary?.summary &&
      workspaceInterventionReview,
  );

  const workspaceInterventionSummary = useMemo(() => {
    if (!data?.adaptiveWorkspaceSummary) return "";
    return [
      "Workspace Intervention Summary",
      data.adaptiveWorkspaceSummary.primaryClassName
        ? `Priority class: ${data.adaptiveWorkspaceSummary.primaryClassName}`
        : "",
      `Support level: ${data.adaptiveWorkspaceSummary.supportLevel.replace(/_/g, " ")}`,
      `Adaptive summary: ${data.adaptiveWorkspaceSummary.summary}`,
      `Recommendation: ${data.adaptiveWorkspaceSummary.recommendation}`,
      data.adaptiveWorkspaceSummary.focus.length
        ? `Focus concepts: ${data.adaptiveWorkspaceSummary.focus.join("; ")}`
        : "",
      `Top low-score alerts: ${data?.todayView.lowScoreAlertCount || 0}`,
      `Reminders pending: ${data?.todayView.reminderNeededCount || 0}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [data]);

  const adaptiveQuizHref = useMemo(() => {
    if (!data?.adaptiveWorkspaceSummary) return "";
    return `/generate-quiz?${new URLSearchParams({
      adaptivePrompt: data.adaptiveWorkspaceSummary.suggestedPrompt,
      interventionSourceType: "workspace",
      interventionSourceId: data.adaptiveWorkspaceSummary.primaryClassId || "workspace",
      interventionClassId: data.adaptiveWorkspaceSummary.primaryClassId || "",
      interventionClassName: data.adaptiveWorkspaceSummary.primaryClassName || "",
      interventionMode: "adaptive_quiz",
    }).toString()}`;
  }, [data]);

  const adaptiveLessonHref = useMemo(() => {
    if (!data?.adaptiveWorkspaceSummary) return "";
    const focus = data.adaptiveWorkspaceSummary.focus.slice(0, 2).join("; ");
    return `/lessonPlan?${new URLSearchParams({
      topic: data.adaptiveWorkspaceSummary.primaryClassName
        ? `Adaptive Follow-Up for ${data.adaptiveWorkspaceSummary.primaryClassName}`
        : "Adaptive Follow-Up Lesson",
      subject: "",
      grade: "",
      days: "1",
      minutesPerDay: "35",
      objectives: focus
        ? `Reteach these priority concepts: ${focus}`
        : "Reteach the top weak concepts identified in the workspace.",
      constraints: data.adaptiveWorkspaceSummary.recommendation,
      interventionSourceType: "workspace",
      interventionSourceId: data.adaptiveWorkspaceSummary.primaryClassId || "workspace",
      interventionClassId: data.adaptiveWorkspaceSummary.primaryClassId || "",
      interventionClassName: data.adaptiveWorkspaceSummary.primaryClassName || "",
      interventionMode: "adaptive_lesson",
    }).toString()}`;
  }, [data]);

  function handlePrintSummary() {
    if (!printElementContent(interventionSummaryRef.current, "Workspace Intervention Summary")) {
      setError("Failed to open a focused print preview");
    }
  }

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(workspaceInterventionSummary);
      setShowCopySummaryModal(true);
    } catch {
      setError("Failed to copy workspace summary");
    }
  }

  function handleLaunchWorkspaceBundle(kind: "reteach" | "recovery") {
    if (!data?.adaptiveWorkspaceSummary) return;
    const lessonHref = adaptiveLessonHref;
    const quizHref =
      kind === "reteach"
        ? adaptiveQuizHref
        : `/generate-quiz?${new URLSearchParams({
            prompt: [
              "Create an easy recovery mastery-check quiz for the top-priority class.",
              data.adaptiveWorkspaceSummary.primaryClassName
                ? `Priority class: ${data.adaptiveWorkspaceSummary.primaryClassName}.`
                : "",
              data.adaptiveWorkspaceSummary.focus.length
                ? `Focus on these concepts: ${data.adaptiveWorkspaceSummary.focus.slice(0, 2).join("; ")}.`
                : "",
              "Keep the difficulty low to medium and prioritize student re-entry and quick wins.",
            ]
              .filter(Boolean)
              .join(" "),
            interventionSourceType: "workspace",
            interventionSourceId: data.adaptiveWorkspaceSummary.primaryClassId || "workspace",
            interventionClassId: data.adaptiveWorkspaceSummary.primaryClassId || "",
            interventionClassName: data.adaptiveWorkspaceSummary.primaryClassName || "",
            interventionMode: "workspace_recovery_bundle_quiz",
          }).toString()}`;

    if (lessonHref) {
      window.open(lessonHref, "_blank", "noopener,noreferrer");
    }
    if (quizHref) {
      window.location.href = quizHref;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load workspace");
        if (!mounted) return;
        setData(json as WorkspaceData);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load workspace");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Tour steps={workspaceTourSteps} tourId="workspace" />
      <CopySummaryModal
        open={showCopySummaryModal}
        onOpenChange={setShowCopySummaryModal}
        title="Workspace summary copied"
      />
      <section
        id="workspace-hero"
        className="relative overflow-hidden rounded-3xl border border-orange-200/40 bg-linear-to-r from-slate-950 via-orange-900 to-amber-700 p-6 text-white shadow-[0_20px_55px_-20px_rgba(180,83,9,0.65)]"
      >
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="border border-white/20 bg-white/15 text-white">Daily Workspace</Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">Teaching Operations</h1>
            <p className="max-w-3xl text-sm text-orange-50/90 sm:text-base">
              Open one screen and see what needs attention today: overdue work, pending reminders,
              unfinished drafts, and the next best action for your classes.
            </p>
          </div>
          {data?.suggestedAction ? (
            <Button asChild className="bg-white text-orange-900 hover:bg-orange-50">
              <Link href={data.suggestedAction.href}>
                {data.suggestedAction.title}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          <SkeletonLoading className="h-44 w-full rounded-3xl" />
          <SkeletonLoading className="h-64 w-full rounded-3xl" />
          <SkeletonLoading className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          {data?.suggestedAction ? (
            <Card id="workspace-suggested-action" className="border-orange-200/80 bg-linear-to-br from-white to-orange-50">
              <CardHeader>
                <CardTitle>Suggested Next Action</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{data.suggestedAction.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{data.suggestedAction.description}</p>
                </div>
                <Button asChild>
                  <Link href={data.suggestedAction.href}>
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!premiumInterventionAccess ? (
            <Card
              id="workspace-premium-intervention-lock"
              className="border-amber-200/80 bg-linear-to-br from-white via-amber-50 to-orange-50"
            >
              <CardHeader>
                <CardTitle>Premium Intervention Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Upgrade to Teacher Premium to unlock intervention summaries, adaptive follow-up
                  planning, grouped support, and remediation actions from the workspace.
                </p>
                <Button asChild>
                  <Link href="/subscription">Unlock Premium</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {canShowWorkspaceIntervention ? (
            <Card id="workspace-adaptive-focus" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
              <CardHeader>
                <CardTitle>Adaptive Workspace Focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {workspaceInterventionReview!.headline}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{workspaceInterventionReview!.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">{workspaceInterventionReview!.nextMove}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {workspaceAdaptiveSummary!.supportLevel.replace(/_/g, " ")}
                  </Badge>
                  {workspaceAdaptiveSummary!.primaryClassName ? (
                    <Badge variant="secondary">{workspaceAdaptiveSummary!.primaryClassName}</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-slate-700">{workspaceAdaptiveSummary!.summary}</p>
                <p className="text-xs text-slate-500">{workspaceAdaptiveSummary!.recommendation}</p>
                {!!workspaceAdaptiveSummary!.focus.length && (
                  <div className="flex flex-wrap gap-2">
                    {workspaceAdaptiveSummary!.focus.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-indigo-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Difficulty shift
                    </p>
                    <p className="mt-2 font-medium text-slate-900">
                      {workspaceAdaptiveSummary!.difficultyShift.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {workspaceAdaptiveSummary!.difficultyShift.rationale}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Grouped student support
                    </p>
                    <div className="mt-2 space-y-2 text-sm text-slate-600">
                      {workspaceAdaptiveSummary!.groupedSupport.length ? (
                        workspaceAdaptiveSummary!.groupedSupport.map((group) => (
                          <div key={group.label} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                            <p className="font-medium text-slate-900">
                              {group.label} · {group.count}
                            </p>
                            {!!group.sampleStudents.length && (
                              <p className="mt-1 text-xs text-slate-500">
                                {group.sampleStudents.join(", ")}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">
                          No cross-class intervention groups identified yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {!!workspaceAdaptiveSummary!.remediationSequence.length && (
                  <div className="rounded-2xl border border-indigo-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Remediation sequence
                    </p>
                    <ol className="mt-3 space-y-2 text-sm text-slate-600">
                      {workspaceAdaptiveSummary!.remediationSequence.map((step, index) => (
                        <li key={`${index}-${step}`} className="flex gap-3">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild>
                    <Link href={adaptiveQuizHref}>
                      Generate Adaptive Quiz
                    </Link>
                  </Button>
                  {workspaceAdaptiveSummary!.primaryClassId ? (
                    <Button asChild variant="outline">
                      <Link href={`/classes/${workspaceAdaptiveSummary!.primaryClassId}`}>
                        Open Priority Class
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {canShowWorkspaceIntervention ? (
            <Card id="workspace-intervention-bundles" className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
              <CardHeader>
                <CardTitle>Intervention Bundles</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleLaunchWorkspaceBundle("reteach")}
                  className="rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-[0_10px_24px_-18px_rgba(217,119,6,0.35)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
                >
                  <p className="text-sm font-semibold text-slate-900">Launch Reteach Bundle</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Open a follow-up lesson and start an adaptive reteach quiz from the workspace focus.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchWorkspaceBundle("recovery")}
                  className="rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-[0_10px_24px_-18px_rgba(217,119,6,0.35)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
                >
                  <p className="text-sm font-semibold text-slate-900">Launch Recovery Bundle</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Start an easier recovery check and a compact review lesson for the top-priority class.
                  </p>
                </button>
              </CardContent>
            </Card>
          ) : null}

          {canShowWorkspaceIntervention ? (
            <div ref={interventionSummaryRef}>
            <Card id="workspace-intervention-summary" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50 print:border-slate-300">
              <CardHeader>
                <CardTitle>Intervention Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm whitespace-pre-line text-slate-600">
                  {workspaceInterventionSummary}
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <Button type="button" variant="outline" onClick={() => void handleCopySummary()}>
                    <Copy className="h-4 w-4" />
                    Copy Summary
                  </Button>
                  <Button type="button" variant="outline" onClick={handlePrintSummary}>
                    Print Summary
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          ) : null}

          <div id="workspace-ops-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Card id="workspace-today-view" className="border-slate-200/80 bg-white/95 xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Presentation className="h-5 w-5 text-slate-700" />
                  Today View
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>{data?.todayView.dueTodayCount || 0} assignment{data?.todayView.dueTodayCount === 1 ? "" : "s"} due today</p>
                <p>{data?.todayView.recentSubmissionCount || 0} recent submission{data?.todayView.recentSubmissionCount === 1 ? "" : "s"} to review</p>
                <p>{data?.todayView.lowScoreAlertCount || 0} class alert{data?.todayView.lowScoreAlertCount === 1 ? "" : "s"} needing follow-up</p>
                {data?.latestClass ? (
                  <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                    <Link href={`/classes/${data.latestClass.id}`}>Resume Latest Class</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card id="workspace-overdue-count" className="border-rose-200/80 bg-linear-to-br from-white to-rose-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-rose-700">{data?.todayView.overdueCount || 0}</p>
              </CardContent>
            </Card>

            <Card id="workspace-due-today-count" className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Due Today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">{data?.todayView.dueTodayCount || 0}</p>
              </CardContent>
            </Card>

            <Card id="workspace-draft-count" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Drafts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-700">{data?.todayView.draftCount || 0}</p>
              </CardContent>
            </Card>

            <Card id="workspace-reminders-count" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Reminders Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-cyan-700">{data?.todayView.reminderNeededCount || 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card id="workspace-overdue-assignments" className="border-rose-200/80 bg-linear-to-br from-white to-rose-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileClock className="h-5 w-5 text-rose-600" />
                  Overdue Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.overdueAssignments?.length ? (
                  <p className="text-sm text-slate-500">No overdue assignments right now.</p>
                ) : (
                  data.overdueAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-2xl border border-rose-100 bg-white/95 p-4">
                      <p className="font-medium text-slate-900">{assignment.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.class.name} / Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "not set"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.missingCount} missing / {assignment.submissionCount} submitted
                      </p>
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link href={`/assignments/${assignment.id}`}>Resolve Overdue Work</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="workspace-draft-assignments" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderClock className="h-5 w-5 text-indigo-600" />
                  Draft Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.draftAssignments?.length ? (
                  <p className="text-sm text-slate-500">No unfinished draft assignments right now.</p>
                ) : (
                  data.draftAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-2xl border border-indigo-100 bg-white/95 p-4">
                      <p className="font-medium text-slate-900">{assignment.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.class.name} / Updated {new Date(assignment.updatedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.quiz?.title || assignment.lessonPlan?.title || "Draft content still being prepared"}
                      </p>
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link href={`/assignments/${assignment.id}`}>Finish Draft</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="workspace-reminders-pending-list" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-cyan-600" />
                  Reminders Pending
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.reminderNeededAssignments?.length ? (
                  <p className="text-sm text-slate-500">No reminder-needed assignments right now.</p>
                ) : (
                  data.reminderNeededAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-2xl border border-cyan-100 bg-white/95 p-4">
                      <p className="font-medium text-slate-900">{assignment.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.class.name} / {assignment.missingCount} student{assignment.missingCount === 1 ? "" : "s"} still missing
                      </p>
                      <p className="text-xs text-slate-500">
                        Initial send {assignment.lastRosterEmailAt ? new Date(assignment.lastRosterEmailAt).toLocaleString() : "not recorded"} / No reminder sent yet
                      </p>
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link href={`/assignments/${assignment.id}`}>Send Reminder</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card id="workspace-due-soon" className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-amber-600" />
                  Due Soon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.dueSoonAssignments?.length ? (
                  <p className="text-sm text-slate-500">No due-soon assignments right now.</p>
                ) : (
                  data.dueSoonAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-amber-100 bg-white/95 p-4"
                    >
                      <p className="font-medium text-slate-900">{assignment.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.class.name} / Due{" "}
                        {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "not set"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.submissionCount} submission
                        {assignment.submissionCount === 1 ? "" : "s"}
                      </p>
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link href={`/assignments/${assignment.id}`}>Review Assignment</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="workspace-low-score-alerts" className="border-rose-200/80 bg-linear-to-br from-white to-rose-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-rose-600" />
                  Low-Score Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.lowScoreAlerts?.length ? (
                  <p className="text-sm text-slate-500">No low-score or missing-submission alerts right now.</p>
                ) : (
                  data.lowScoreAlerts.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-rose-100 bg-white/95 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{assignment.title}</p>
                        <Badge variant="secondary">{assignment.averageScore}% avg</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.class.name} / {assignment.submissionCount} of {assignment.studentCount} submitted
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.missingCount} student{assignment.missingCount === 1 ? "" : "s"} still missing
                      </p>
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link href={`/assignments/${assignment.id}`}>Open Follow-Up</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="workspace-recent-submissions" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-cyan-600" />
                  Recent Submissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.recentSubmissions?.length ? (
                  <p className="text-sm text-slate-500">No recent assignment submissions yet.</p>
                ) : (
                  data.recentSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-2xl border border-cyan-100 bg-white/95 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {submission.studentName || submission.studentEmail || "Student submission"}
                        </p>
                        <Badge variant="secondary">{submission.scorePercent}%</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {submission.assignment?.title || "Assignment"} / {submission.assignment?.class.name || "Class"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                      {submission.assignment ? (
                        <Button asChild size="sm" variant="outline" className="mt-3">
                          <Link href={`/assignments/${submission.assignment.id}`}>Open Results</Link>
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card id="workspace-students-risk" className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-violet-600" />
                  Students At Risk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!premiumInterventionAccess ? (
                  <p className="text-sm text-slate-500">
                    Teacher Premium unlocks cross-assignment student risk tracking.
                  </p>
                ) : !data?.studentsAtRisk?.length ? (
                  <p className="text-sm text-slate-500">No repeated low-score pattern is standing out right now.</p>
                ) : (
                  data.studentsAtRisk.map((student, idx) => (
                    <div key={`${student.studentEmail || student.studentName || idx}`} className="rounded-2xl border border-violet-100 bg-white/95 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{student.studentName || student.studentEmail || "Student"}</p>
                        <Badge variant="secondary">{student.averageScore}% avg</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {student.lowScoreCount} low-score assignment{student.lowScoreCount === 1 ? "" : "s"}
                        {student.classNames.length ? ` / ${student.classNames.join(", ")}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.assignmentTitles.join(", ")}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="workspace-class-alert-groups" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-indigo-600" />
                  Class Alert Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data?.alertGroupsByClass?.length ? (
                  <p className="text-sm text-slate-500">No class-wide alert clusters right now.</p>
                ) : (
                  data.alertGroupsByClass.map((group) => (
                    <div key={group.classId} className="rounded-2xl border border-indigo-100 bg-white/95 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{group.className}</p>
                        <Badge variant="secondary">{group.weakestScore}% lowest avg</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {group.missingSubmissions} missing submissions / {group.lowScoreAssignments} low-score assignment
                        {group.lowScoreAssignments === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="workspace-performance-trend" className="border-sky-200/80 bg-linear-to-br from-white to-sky-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-sky-600" />
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!premiumInterventionAccess ? (
                  <p className="text-sm text-slate-500">
                    Teacher Premium unlocks intervention-focused performance trend tracking.
                  </p>
                ) : !data?.performanceTrend?.length ? (
                  <p className="text-sm text-slate-500">Trend lines will appear after more assignments are submitted.</p>
                ) : (
                  data.performanceTrend.map((point) => (
                    <div key={point.id} className="rounded-2xl border border-sky-100 bg-white/95 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{point.label}</p>
                        <Badge variant="secondary">{point.averageScore}% avg</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Completion {point.completionRate}%
                        {point.submittedAt ? ` / ${new Date(point.submittedAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Alert>
            <BellRing className="h-4 w-4" />
            <AlertDescription>
              {premiumInterventionAccess
                ? data?.interventionSummary ||
                  "Intervention signals will appear here once multiple assignments and submissions accumulate."
                : "Teacher Premium unlocks intervention summaries and adaptive follow-up recommendations from your workspace."}
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
