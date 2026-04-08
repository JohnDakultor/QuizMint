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

export function QuizAssignModal(props: {
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
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_80px_-32px_rgba(2,6,23,0.95)]">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assign Quiz to Class</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-slate-300">
          Turn this generated quiz into classroom work so it lives inside a teacher workflow, not
          just as a one-off output.
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignment-class">Class</Label>
            <select
              id="assignment-class"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-900/50"
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
            {!loadingClasses && activeClasses.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Create a class first before assigning this quiz.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-title">Assignment Title</Label>
            <Input
              id="assignment-title"
              value={assignmentTitle}
              onChange={(event) => setAssignmentTitle(event.target.value)}
              placeholder="Photosynthesis Quiz - Section A"
              disabled={assignLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-instructions">Teacher Instructions</Label>
            <Textarea
              id="assignment-instructions"
              value={assignmentInstructions}
              onChange={(event) => setAssignmentInstructions(event.target.value)}
              placeholder="Optional note for this class or a reminder about what students should focus on."
              disabled={assignLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assignment-available-from">Available From</Label>
              <Input
                id="assignment-available-from"
                type="datetime-local"
                value={assignmentAvailableFrom}
                onChange={(event) => setAssignmentAvailableFrom(event.target.value)}
                disabled={assignLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-due-at">Due At</Label>
              <Input
                id="assignment-due-at"
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
            {assignLoading ? "Assigning..." : "Assign to Class"}
          </Button>
        </div>
      </div>
    </div>
  );
}
