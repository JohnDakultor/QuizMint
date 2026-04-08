"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap, Plus, UsersRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import Tour from "@/components/ui/tour";
import { classesTourSteps } from "../teacher-workflow-tour-steps";

type ClassSummary = {
  id: string;
  name: string;
  subject: string | null;
  gradeLevel: string | null;
  section: string | null;
  schoolYear: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    students: number;
    assignments: number;
  };
};

type CreateClassForm = {
  name: string;
  subject: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
};

const INITIAL_FORM: CreateClassForm = {
  name: "",
  subject: "",
  gradeLevel: "",
  section: "",
  schoolYear: "",
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateClassForm>(INITIAL_FORM);

  async function loadClasses() {
    const res = await fetch("/api/classes", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Failed to load classes");
    }
    setClasses(Array.isArray(data?.classes) ? (data.classes as ClassSummary[]) : []);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await loadClasses();
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const archivedClasses = classes.filter((item) => item.archived).length;
    const activeClasses = classes.length - archivedClasses;
    const totalStudents = classes.reduce((sum, item) => sum + item._count.students, 0);
    return {
      totalClasses: classes.length,
      activeClasses,
      archivedClasses,
      totalStudents,
    };
  }, [classes]);

  async function handleCreateClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create class");
      }
      setForm(INITIAL_FORM);
      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField<K extends keyof CreateClassForm>(key: K, value: CreateClassForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Tour steps={classesTourSteps} tourId="classes-workflow" />
      <section
        id="classes-hero"
        className="relative overflow-hidden rounded-3xl border border-emerald-200/50 bg-linear-to-r from-slate-950 via-emerald-900 to-cyan-800 p-6 text-white shadow-[0_20px_55px_-20px_rgba(5,150,105,0.65)]"
      >
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 left-16 h-36 w-36 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge className="border border-white/20 bg-white/15 text-white">Phase 1 Workflow</Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">Classes</h1>
            <p className="max-w-2xl text-sm text-emerald-50/90 sm:text-base">
              Start anchoring your generated work to real teaching contexts. Create classes now so
              quizzes, lesson plans, assignments, and student results can connect to a classroom
              instead of floating as one-off outputs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-white text-emerald-900 hover:bg-emerald-50">
              <Link href="/generate-quiz">Generate Quiz</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/15">
              <Link href="/lessonPlan">Plan Lesson</Link>
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section id="classes-stats" className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
          <CardHeader className="pb-2">
            <CardDescription>Total Classes</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              {loading ? <SkeletonLoading className="h-8 w-14" /> : stats.totalClasses}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-cyan-200/80 bg-linear-to-br from-white to-cyan-50">
          <CardHeader className="pb-2">
            <CardDescription>Active Classes</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <BookOpen className="h-5 w-5 text-cyan-600" />
              {loading ? <SkeletonLoading className="h-8 w-14" /> : stats.activeClasses}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-violet-200/80 bg-linear-to-br from-white to-violet-50">
          <CardHeader className="pb-2">
            <CardDescription>Total Students</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <UsersRound className="h-5 w-5 text-violet-600" />
              {loading ? <SkeletonLoading className="h-8 w-14" /> : stats.totalStudents}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-200/80 bg-linear-to-br from-white to-amber-50">
          <CardHeader className="pb-2">
            <CardDescription>Archived</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <CalendarDays className="h-5 w-5 text-amber-600" />
              {loading ? <SkeletonLoading className="h-8 w-14" /> : stats.archivedClasses}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card id="classes-create" className="border-emerald-200/80 bg-linear-to-br from-white to-emerald-50">
          <CardHeader>
            <CardTitle>Create a Class</CardTitle>
            <CardDescription>
              This becomes the home for roster, assignments, and future student results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateClass}>
              <div className="space-y-2">
                <Label htmlFor="class-name">Class Name</Label>
                <Input
                  id="class-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Grade 9 Science - Section A"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="class-subject">Subject</Label>
                  <Input
                    id="class-subject"
                    value={form.subject}
                    onChange={(event) => updateField("subject", event.target.value)}
                    placeholder="Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-grade">Grade Level</Label>
                  <Input
                    id="class-grade"
                    value={form.gradeLevel}
                    onChange={(event) => updateField("gradeLevel", event.target.value)}
                    placeholder="Grade 9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="class-section">Section</Label>
                  <Input
                    id="class-section"
                    value={form.section}
                    onChange={(event) => updateField("section", event.target.value)}
                    placeholder="Section A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-year">School Year</Label>
                  <Input
                    id="class-year"
                    value={form.schoolYear}
                    onChange={(event) => updateField("schoolYear", event.target.value)}
                    placeholder="2026-2027"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <Plus className="h-4 w-4" />
                {submitting ? "Creating Class..." : "Create Class"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="classes-list" className="border-slate-200/80 bg-linear-to-br from-white to-slate-50">
          <CardHeader>
            <CardTitle>Your Classes</CardTitle>
            <CardDescription>
              Phase 1 gives you class context first. Assignments and result loops build on top of
              these records next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
                  <SkeletonLoading className="h-5 w-40" />
                  <SkeletonLoading className="mt-2 h-4 w-56" />
                  <SkeletonLoading className="mt-3 h-9 w-28" />
                </div>
              ))
            ) : classes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
                <p className="text-base font-medium text-slate-900">No classes yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Create your first class to start moving from one-off generation into a repeatable
                  teacher workflow.
                </p>
              </div>
            ) : (
              classes.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                        {item.archived ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {[item.subject, item.gradeLevel, item.section].filter(Boolean).join(" / ") ||
                          "Add subject, grade, or section details to make this class easier to work with."}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{item._count.students} students</span>
                        <span>{item._count.assignments} assignments</span>
                        <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                        {item.schoolYear ? <span>{item.schoolYear}</span> : null}
                      </div>
                    </div>
                    <Button asChild>
                      <Link href={`/classes/${item.id}`}>Manage Class</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
