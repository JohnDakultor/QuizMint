"use client";

import { AlertCircle, Brain, CheckCircle2, ClipboardCheck, FileQuestion, Users } from "lucide-react";
import { ReactNode } from "react";

type LessonPlanDaySectionsProps = {
  lessonPlan: any;
  shouldKeepSpecificActivities: (day: any) => boolean;
  shouldKeepAssessment: (day: any) => boolean;
  renderFourAsPhaseCard: (phase: any, index: number) => ReactNode;
  renderSpecificActivityCard: (phase: string, activity: any) => ReactNode;
};

export function LessonPlanDaySections({
  lessonPlan,
  shouldKeepSpecificActivities,
  shouldKeepAssessment,
  renderFourAsPhaseCard,
  renderSpecificActivityCard,
}: LessonPlanDaySectionsProps) {
  return (
    <>
      {lessonPlan.days?.map((day: any, dayIndex: number) => (
        <div
          key={day.day || dayIndex + 1}
          className="pdf-day-card mt-8 pt-8 border-t-2 border-gray-300 first:border-t-0 first:pt-0"
          data-pdf-page
          data-page-start={dayIndex > 0 ? "1" : undefined}
        >
          {dayIndex === 0 && (
            <div className="pdf-only pdf-header" data-pdf-only data-pdf-keep>
              <div className="pdf-header-title">{lessonPlan.title}</div>
              <div className="pdf-header-meta">
                Grade: {lessonPlan.grade} - Duration: {lessonPlan.duration} - Day {day.day || dayIndex + 1}
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-linear-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{day.day || dayIndex + 1}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Day {day.day || dayIndex + 1}: {day.topic}
                </h3>
              </div>
              <p className="text-gray-600 ml-13">Total duration: 40 minutes</p>
            </div>
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">40 minutes total</span>
          </div>

          <div className="mb-10 pdf-section-page" data-pdf-keep data-page-keep="1">
            <div className="flex items-center justify-between mb-6">
              <h4 className="pdf-section-title text-xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                4A&apos;s Pedagogical Framework
              </h4>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">4 Phases - 10 min each</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {day["4asModel"] &&
                Array.isArray(day["4asModel"]) &&
                day["4asModel"].map((phase: any, idx: number) => renderFourAsPhaseCard(phase, idx))}
            </div>
          </div>

          {day.specificActivities && (
            <div
              className="mb-10 pdf-section-page"
              data-pdf-keep
              {...(shouldKeepSpecificActivities(day) ? { "data-page-keep": "1" } : { "data-page-flow": "1" })}
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="pdf-section-title text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-purple-600" />
                  Specific Activity Types
                </h4>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Linked to 4A&apos;s Phases</div>
              </div>

              <div className="space-y-8">
                {Object.entries(day.specificActivities).map(([phase, activity]: [string, any]) =>
                  renderSpecificActivityCard(phase, activity)
                )}
              </div>
            </div>
          )}

          {(day.differentiation || day.closure) && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pdf-section-page" data-pdf-keep data-page-keep="1">
              {day.differentiation && (
                <div className="bg-linear-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
                  <h4 className="font-bold text-green-800 text-lg mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Differentiation Strategies
                  </h4>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{day.differentiation}</p>
                </div>
              )}

              {day.closure && (
                <div className="bg-linear-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border-2 border-purple-200">
                  <h4 className="font-bold text-purple-800 text-lg mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    Lesson Closure
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{day.closure}</p>
                </div>
              )}
            </div>
          )}

          <div
            className="mt-10 pdf-section-page"
            data-pdf-keep
            {...(shouldKeepAssessment(day) ? { "data-page-keep": "1" } : { "data-page-flow": "1" })}
            data-page-end="1"
          >
            <h4 className="pdf-section-title text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-red-600" />
              Assessment / Rubrics
            </h4>
            {day.assessment && day.assessment.length > 0 ? (
              <div className="space-y-6">
                {day.assessment.map((a: any, i: number) => (
                  <div key={i} className="bg-linear-to-br from-gray-50 to-slate-50 p-6 rounded-2xl border-2 border-gray-200">
                    <p className="font-bold text-blue-700 text-xl mb-3">{a.criteria}</p>
                    <p className="text-gray-700 mb-6 font-medium">{a.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-linear-to-brrom-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <p className="font-bold text-green-800">Excellent</p>
                        </div>
                        <p className="text-green-700 text-sm">{a.rubricLevel?.excellent || "N/A"}</p>
                      </div>
                      <div className="bg-linear-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <p className="font-bold text-amber-800">Satisfactory</p>
                        </div>
                        <p className="text-amber-700 text-sm">{a.rubricLevel?.satisfactory || "N/A"}</p>
                      </div>
                      <div className="bg-linear-to-br from-red-50 to-rose-50 p-4 rounded-xl border-2 border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <p className="font-bold text-red-800">Needs Improvement</p>
                        </div>
                        <p className="text-red-700 text-sm">{a.rubricLevel?.needsImprovement || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-linear-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-300">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="text-amber-800 font-bold text-lg">No assessment rubrics provided for this day.</p>
                    <p className="text-amber-700 mt-1">Consider adding assessment criteria to evaluate student learning.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

