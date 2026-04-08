"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  ClipboardList,
  Copy,
  Presentation,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import Tour from "@/components/ui/tour";
import { libraryTourSteps } from "../teacher-workflow-tour-steps";

type LibraryData = {
  quizzes: {
    id: number;
    title: string;
    createdAt: string;
    updatedAt: string;
    adaptiveTags: string[];
    _count: {
      questions: number;
      attempts: number;
      assignments: number;
    };
  }[];
  lessonPlans: {
    id: string;
    title: string;
    topic: string;
    subject: string;
    grade: string;
    createdAt: string;
    updatedAt: string;
    adaptiveTags: string[];
    _count: {
      assignments: number;
    };
  }[];
  assignments: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    availableFrom: string | null;
    createdAt: string;
    updatedAt: string;
    class: {
      id: string;
      name: string;
      subject: string | null;
      gradeLevel: string | null;
    };
    quiz: {
      id: number;
      title: string;
    } | null;
    lessonPlan: {
      id: string;
      title: string;
    } | null;
    adaptiveTags: string[];
    _count: {
      attempts: number;
    };
  }[];
  classes: {
    id: string;
    name: string;
    subject: string | null;
    gradeLevel: string | null;
  }[];
};

type SectionKey = "all" | "quizzes" | "lessons" | "assignments";
type DuplicateKind = "quiz" | "lesson" | "assignment";

export default function LibraryPage() {
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<SectionKey>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reassignTargets, setReassignTargets] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/library", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load library");
        if (!mounted) return;
        setData(json as LibraryData);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load library");
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
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const normalizedQuery = query.trim().toLowerCase();

  const filterOptions = useMemo(() => {
    if (!data) {
      return {
        subjects: [] as string[],
        grades: [] as string[],
        statuses: [] as string[],
      };
    }

    const subjects = new Set<string>();
    const grades = new Set<string>();
    const statuses = new Set<string>();

    data.lessonPlans.forEach((plan) => {
      if (plan.subject) subjects.add(plan.subject);
      if (plan.grade) grades.add(plan.grade);
    });

    data.assignments.forEach((assignment) => {
      if (assignment.class.subject) subjects.add(assignment.class.subject);
      if (assignment.class.gradeLevel) grades.add(assignment.class.gradeLevel);
      if (assignment.status) statuses.add(assignment.status);
    });

    data.classes.forEach((classItem) => {
      if (classItem.subject) subjects.add(classItem.subject);
      if (classItem.gradeLevel) grades.add(classItem.gradeLevel);
    });

    return {
      subjects: Array.from(subjects).sort(),
      grades: Array.from(grades).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) {
      return {
        quizzes: [],
        lessonPlans: [],
        assignments: [],
      };
    }

    const matches = (value: string, extras: Array<string | null | undefined> = []) => {
      if (!normalizedQuery) return true;
      const haystack = [value, ...extras]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    };

    const matchesSubject = (...values: Array<string | null | undefined>) =>
      subjectFilter === "all" || values.some((value) => value === subjectFilter);
    const matchesGrade = (...values: Array<string | null | undefined>) =>
      gradeFilter === "all" || values.some((value) => value === gradeFilter);
    const matchesClass = (value: string) => classFilter === "all" || value === classFilter;
    const matchesStatus = (value: string) => statusFilter === "all" || value === statusFilter;

    return {
      quizzes: data.quizzes.filter((quiz) => matches(quiz.title)),
      lessonPlans: data.lessonPlans.filter((plan) =>
        matches(plan.title, [plan.subject, plan.grade]) &&
        matchesSubject(plan.subject) &&
        matchesGrade(plan.grade),
      ),
      assignments: data.assignments.filter((assignment) =>
        matches(assignment.title, [
          assignment.class.name,
          assignment.class.subject,
          assignment.class.gradeLevel,
          assignment.quiz?.title,
          assignment.lessonPlan?.title,
        ]) &&
        matchesSubject(assignment.class.subject) &&
        matchesGrade(assignment.class.gradeLevel) &&
        matchesClass(assignment.class.id) &&
        matchesStatus(assignment.status),
      ),
    };
  }, [classFilter, data, gradeFilter, normalizedQuery, statusFilter, subjectFilter]);

  const showQuizzes = section === "all" || section === "quizzes";
  const showLessons = section === "all" || section === "lessons";
  const showAssignments = section === "all" || section === "assignments";

  const templateHighlights = useMemo(() => {
    if (!data) return [];

    return [
      ...data.quizzes
        .filter((quiz) => quiz._count.assignments > 0)
        .slice(0, 3)
        .map((quiz) => ({
          id: `quiz-${quiz.id}`,
          label: quiz.title,
          meta: `${quiz._count.assignments} assignment${quiz._count.assignments === 1 ? "" : "s"} from this quiz`,
          href: "/generate-quiz",
        })),
      ...data.lessonPlans
        .filter((plan) => plan._count.assignments > 0)
        .slice(0, 2)
        .map((plan) => ({
          id: `lesson-${plan.id}`,
          label: plan.title,
          meta: `${plan._count.assignments} assignment${plan._count.assignments === 1 ? "" : "s"} from this lesson plan`,
          href: "/lessonPlan",
        })),
    ].slice(0, 5);
  }, [data]);

  const provenInterventions = useMemo(() => {
    if (!data) return [];

    return [
      ...data.quizzes
        .filter((quiz) => quiz.adaptiveTags.includes("Proven Effective"))
        .slice(0, 3)
        .map((quiz) => ({
          id: `quiz-${quiz.id}`,
          title: quiz.title,
          kind: "Quiz",
          href: "/generate-quiz",
        })),
      ...data.lessonPlans
        .filter((plan) => plan.adaptiveTags.includes("Proven Effective"))
        .slice(0, 3)
        .map((plan) => ({
          id: `lesson-${plan.id}`,
          title: plan.title,
          kind: "Lesson Plan",
          href: "/lessonPlan",
        })),
      ...data.assignments
        .filter((assignment) => assignment.adaptiveTags.includes("Proven Effective"))
        .slice(0, 4)
        .map((assignment) => ({
          id: `assignment-${assignment.id}`,
          title: assignment.title,
          kind: "Assignment",
          href: `/assignments/${assignment.id}`,
        })),
    ].slice(0, 6);
  }, [data]);

  async function reloadLibrary() {
    const res = await fetch("/api/library", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || "Failed to refresh library");
    }
    setData(json as LibraryData);
  }

  async function handleDuplicate(kind: DuplicateKind, id: string | number) {
    const key = `${kind}-${id}`;
    setBusyKey(key);
    setError(null);
    try {
      const path =
        kind === "quiz"
          ? `/api/library/quizzes/${id}/duplicate`
          : kind === "lesson"
          ? `/api/library/lesson-plans/${id}/duplicate`
          : `/api/assignments/${id}/duplicate`;
      const res = await fetch(path, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to duplicate item");
      }
      await reloadLibrary();
      setActionMessage(
        kind === "assignment"
          ? "Assignment duplicated"
          : kind === "lesson"
          ? "Lesson plan duplicated"
          : "Quiz duplicated",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate item");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleReassignAssignment(assignmentId: string) {
    const targetClassId = reassignTargets[assignmentId];
    if (!targetClassId) return;

    setBusyKey(`reassign-${assignmentId}`);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: targetClassId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to reassign assignment");
      }
      await reloadLibrary();
      setActionMessage("Assignment reassigned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign assignment");
    } finally {
      setBusyKey(null);
    }
  }

  function getAlternativeClasses(currentClassId: string) {
    return (data?.classes ?? []).filter((classItem) => classItem.id !== currentClassId);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Tour steps={libraryTourSteps} tourId="library" />
      <section
        id="library-hero"
        className="relative overflow-hidden rounded-3xl border border-violet-200/50 bg-linear-to-r from-slate-950 via-violet-900 to-fuchsia-800 p-6 text-white shadow-[0_20px_55px_-20px_rgba(109,40,217,0.65)]"
      >
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="border border-white/20 bg-white/15 text-white">Content Library</Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">Teaching Resources</h1>
            <p className="max-w-3xl text-sm text-violet-50/90 sm:text-base">
              Reopen saved quizzes, lesson plans, and class assignments from one library so your
              workflow grows into reusable teaching assets instead of one-off generations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-white text-violet-900 hover:bg-violet-50">
              <Link href="/generate-quiz">New Quiz</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              <Link href="/lessonPlan">New Lesson Plan</Link>
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {actionMessage && (
        <Alert>
          <AlertDescription>{actionMessage}</AlertDescription>
        </Alert>
      )}

      <Card id="library-filters" className="border-slate-200/80 bg-white/95">
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,180px))]">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search quizzes, lesson plans, assignments, or classes"
              className="pl-9"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {filterOptions.subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All grades</SelectItem>
              {filterOptions.grades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {data?.classes.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {filterOptions.statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
            {[
              { key: "all", label: "All" },
              { key: "quizzes", label: "Quizzes" },
              { key: "lessons", label: "Lesson Plans" },
              { key: "assignments", label: "Assignments" },
            ].map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={section === item.key ? "default" : "outline"}
                onClick={() => setSection(item.key as SectionKey)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {templateHighlights.length > 0 && !loading ? (
        <Card id="library-templates" className="border-fuchsia-200/80 bg-linear-to-br from-white to-fuchsia-50">
          <CardHeader>
            <CardTitle>Saved Teaching Templates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {templateHighlights.map((item) => (
              <div key={item.id} className="rounded-2xl border border-fuchsia-100 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-fuchsia-600" />
                  <p className="font-medium text-slate-900">{item.label}</p>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.meta}</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href={item.href}>Open Template Source</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!loading ? (
        <Card id="library-proven-assets" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
          <CardHeader>
            <CardTitle>Proven Intervention Assets</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {provenInterventions.length ? (
              provenInterventions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-emerald-100 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <p className="font-medium text-slate-900">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.kind} with measured follow-up outcomes strong enough to reuse.</p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href={item.href}>Open Asset</Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="lg:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-emerald-200 bg-white/85 p-5">
                <p className="font-medium text-slate-900">No proven intervention assets yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  This section will fill once quizzes, lesson plans, or assignments show strong measured follow-up outcomes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <SkeletonLoading className="h-52 w-full rounded-3xl" />
          <SkeletonLoading className="h-52 w-full rounded-3xl" />
          <SkeletonLoading className="h-52 w-full rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {showQuizzes && (
            <Card id="library-quizzes" className="border-indigo-200/80 bg-linear-to-br from-white to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!filtered.quizzes.length ? (
                  <p className="text-sm text-slate-500">No quizzes match this filter.</p>
                ) : (
                  filtered.quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white/95 p-4 shadow-[0_10px_24px_-18px_rgba(79,70,229,0.35)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{quiz.title}</p>
                        {quiz.adaptiveTags.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {quiz.adaptiveTags.map((tag) => (
                              <Badge key={`${quiz.id}-${tag}`} variant="outline" className="border-indigo-200 text-indigo-700">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-500">
                          {quiz._count.questions} questions / {quiz._count.attempts} submissions /{" "}
                          {quiz._count.assignments} assignment{quiz._count.assignments === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Updated {new Date(quiz.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href="/generate-quiz">Reuse in Generator</Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleDuplicate("quiz", quiz.id)}
                          disabled={busyKey === `quiz-${quiz.id}`}
                        >
                          <Copy className="h-4 w-4" />
                          {busyKey === `quiz-${quiz.id}` ? "Duplicating..." : "Duplicate Quiz"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {showLessons && (
            <Card id="library-lessons" className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Presentation className="h-5 w-5 text-cyan-600" />
                  Lesson Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!filtered.lessonPlans.length ? (
                  <p className="text-sm text-slate-500">No lesson plans match this filter.</p>
                ) : (
                  filtered.lessonPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-white/95 p-4 shadow-[0_10px_24px_-18px_rgba(6,182,212,0.35)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{plan.title}</p>
                        {plan.adaptiveTags.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {plan.adaptiveTags.map((tag) => (
                              <Badge key={`${plan.id}-${tag}`} variant="outline" className="border-cyan-200 text-cyan-700">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-500">
                          {plan.subject} / {plan.grade} / {plan._count.assignments} assignment
                          {plan._count.assignments === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Updated {new Date(plan.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href="/lessonPlan">Reuse in Lesson Planner</Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleDuplicate("lesson", plan.id)}
                          disabled={busyKey === `lesson-${plan.id}`}
                        >
                          <Copy className="h-4 w-4" />
                          {busyKey === `lesson-${plan.id}` ? "Duplicating..." : "Duplicate Lesson Plan"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {showAssignments && (
            <Card id="library-assignments" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-600" />
                  Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!filtered.assignments.length ? (
                  <p className="text-sm text-slate-500">No assignments match this filter.</p>
                ) : (
                  filtered.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.35)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-slate-900">{assignment.title}</p>
                          <Badge variant="secondary">{assignment.status}</Badge>
                          {assignment.adaptiveTags.map((tag) => (
                            <Badge
                              key={`${assignment.id}-${tag}`}
                              variant="outline"
                              className="border-emerald-200 text-emerald-700"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {assignment.class.name}
                          {assignment.quiz?.title ? ` / ${assignment.quiz.title}` : ""}
                          {assignment.lessonPlan?.title ? ` / ${assignment.lessonPlan.title}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          {assignment.dueAt
                            ? `Due ${new Date(assignment.dueAt).toLocaleString()}`
                            : assignment.availableFrom
                            ? `Available ${new Date(assignment.availableFrom).toLocaleString()}`
                            : `Updated ${new Date(assignment.updatedAt).toLocaleString()}`}
                          {` / ${assignment._count.attempts} submission${assignment._count.attempts === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/assignments/${assignment.id}`}>Open Results</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/classes/${assignment.class.id}`}>Open Class</Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleDuplicate("assignment", assignment.id)}
                          disabled={busyKey === `assignment-${assignment.id}`}
                        >
                          <Copy className="h-4 w-4" />
                          {busyKey === `assignment-${assignment.id}` ? "Duplicating..." : "Duplicate Assignment"}
                        </Button>
                      </div>
                      {(() => {
                        const alternativeClasses = getAlternativeClasses(assignment.class.id);
                        const selectedTarget = reassignTargets[assignment.id];
                        return (
                          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-500">Reassign to another class</Label>
                              <Select
                                value={selectedTarget}
                                onValueChange={(value) =>
                                  setReassignTargets((current) => ({ ...current, [assignment.id]: value }))
                                }
                                disabled={alternativeClasses.length === 0}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={
                                      alternativeClasses.length === 0
                                        ? "No other class available"
                                        : "Choose a class"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {alternativeClasses.map((classItem) => (
                                    <SelectItem key={classItem.id} value={classItem.id}>
                                      {classItem.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {alternativeClasses.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                  Create another class first to move this assignment.
                                </p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="self-end"
                              onClick={() => void handleReassignAssignment(assignment.id)}
                              disabled={
                                alternativeClasses.length === 0 ||
                                !selectedTarget ||
                                busyKey === `reassign-${assignment.id}`
                              }
                            >
                              <Send className="h-4 w-4" />
                              {busyKey === `reassign-${assignment.id}` ? "Moving..." : "Reassign"}
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {data &&
            !filtered.quizzes.length &&
            !filtered.lessonPlans.length &&
            !filtered.assignments.length && (
              <Card className="border-slate-200/80 bg-linear-to-br from-white to-slate-50">
                <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                  <Archive className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Nothing matched this filter</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try a broader search term or switch to another library section.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
