"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ClassOption = {
  id: string;
  name: string;
  subject: string | null;
  gradeLevel: string | null;
  section: string | null;
  archived: boolean;
};

export function LessonPlanAssignModal(props: {
  open: boolean;
  classes: ClassOption[];
  loadingClasses: boolean;
  assignLoading: boolean;
  selectedClassId: string;
  setSelectedClassId: (value: string) => void;
  assignmentTitle: string;
  setAssignmentTitle: (value: string) => void;
  assignmentInstructions: string;
  setAssignmentInstructions: (value: string) => void;
  assignmentAvailableFrom: string;
  setAssignmentAvailableFrom: (value: string) => void;
  assignmentDueAt: string;
  setAssignmentDueAt: (value: string) => void;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const {
    open,
    classes,
    loadingClasses,
    assignLoading,
    selectedClassId,
    setSelectedClassId,
    assignmentTitle,
    setAssignmentTitle,
    assignmentInstructions,
    setAssignmentInstructions,
    assignmentAvailableFrom,
    setAssignmentAvailableFrom,
    assignmentDueAt,
    setAssignmentDueAt,
    canSubmit,
    onClose,
    onSubmit,
  } = props;

  if (!open) return null;

  const activeClasses = classes.filter((item) => !item.archived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assign Lesson Plan to Class</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-slate-300">
          Link this lesson plan to a real class so it becomes part of the teacher workflow, class
          history, and follow-up loop.
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-assignment-class">Class</Label>
            <select
              id="lesson-assignment-class"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              disabled={loadingClasses || assignLoading}
            >
              <option value="">{loadingClasses ? "Loading classes..." : "Select a class"}</option>
              {activeClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {[item.subject, item.gradeLevel, item.section].filter(Boolean).length
                    ? ` - ${[item.subject, item.gradeLevel, item.section].filter(Boolean).join(" / ")}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-assignment-title">Assignment Title</Label>
            <Input
              id="lesson-assignment-title"
              value={assignmentTitle}
              onChange={(event) => setAssignmentTitle(event.target.value)}
              placeholder="Week 4 Photosynthesis Lesson"
              disabled={assignLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-assignment-instructions">Teacher Notes</Label>
            <Textarea
              id="lesson-assignment-instructions"
              value={assignmentInstructions}
              onChange={(event) => setAssignmentInstructions(event.target.value)}
              placeholder="Optional notes about when or how this lesson should be used with the class."
              disabled={assignLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lesson-assignment-available-from">Scheduled For</Label>
              <Input
                id="lesson-assignment-available-from"
                type="datetime-local"
                value={assignmentAvailableFrom}
                onChange={(event) => setAssignmentAvailableFrom(event.target.value)}
                disabled={assignLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-assignment-due-at">Review By</Label>
              <Input
                id="lesson-assignment-due-at"
                type="datetime-local"
                value={assignmentDueAt}
                onChange={(event) => setAssignmentDueAt(event.target.value)}
                disabled={assignLoading}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={assignLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={assignLoading || !canSubmit}>
            {assignLoading ? "Assigning..." : "Assign Lesson Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
