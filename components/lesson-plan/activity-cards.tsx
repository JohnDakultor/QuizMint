"use client";

import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  BookCheck,
  BookOpen,
  Brain,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  FileQuestion,
  Hash,
  Lightbulb,
  ListChecks,
  ListOrdered,
  Search,
  SquareCheck,
  Target,
  Users,
  Zap,
} from "lucide-react";

export function FourAsPhaseCard({ phase, index }: { phase: any; index: number }) {
  const prettyPhaseName =
    typeof phase?.phase === "string"
      ? phase.phase
          .split("_")
          .filter(Boolean)
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(" ")
      : "Phase";

  const getPhaseDetails = (phaseName: string) => {
    switch (phaseName) {
      case "ACTIVITY":
        return {
          icon: <Target className="h-6 w-6 text-white" />,
          gradient: "from-blue-500 to-cyan-500",
          bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
          border: "border-blue-200",
          text: "text-blue-800",
          title: "Activity",
          subtitle: "Engagement Phase",
          description: "Activate prior knowledge and generate interest",
        };
      case "ANALYSIS":
        return {
          icon: <Search className="h-6 w-6 text-white" />,
          gradient: "from-green-500 to-emerald-500",
          bg: "bg-gradient-to-br from-green-50 to-emerald-50",
          border: "border-green-200",
          text: "text-green-800",
          title: "Analysis",
          subtitle: "Exploration Phase",
          description: "Develop critical thinking through guided exploration",
        };
      case "ABSTRACTION":
        return {
          icon: <BookOpen className="h-6 w-6 text-white" />,
          gradient: "from-purple-500 to-violet-500",
          bg: "bg-gradient-to-br from-purple-50 to-violet-50",
          border: "border-purple-200",
          text: "text-purple-800",
          title: "Abstraction",
          subtitle: "Concept Development",
          description: "Formal presentation of concepts and principles",
        };
      case "APPLICATION":
        return {
          icon: <Zap className="h-6 w-6 text-white" />,
          gradient: "from-amber-500 to-orange-500",
          bg: "bg-gradient-to-br from-amber-50 to-orange-50",
          border: "border-amber-200",
          text: "text-amber-800",
          title: "Application",
          subtitle: "Practice & Assessment",
          description: "Apply knowledge and demonstrate understanding",
        };
      case "ENGAGE":
        return {
          icon: <Target className="h-6 w-6 text-white" />,
          gradient: "from-blue-500 to-cyan-500",
          bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
          border: "border-blue-200",
          text: "text-blue-800",
          title: "Engage",
          subtitle: "Curiosity & prior knowledge",
          description: "Launch the lesson with a strong hook and activate prior ideas",
        };
      case "EXPLORE":
        return {
          icon: <Search className="h-6 w-6 text-white" />,
          gradient: "from-green-500 to-emerald-500",
          bg: "bg-gradient-to-br from-green-50 to-emerald-50",
          border: "border-green-200",
          text: "text-green-800",
          title: "Explore",
          subtitle: "Inquiry & investigation",
          description: "Let learners investigate, observe, and gather evidence",
        };
      case "EXPLAIN":
        return {
          icon: <BookOpen className="h-6 w-6 text-white" />,
          gradient: "from-violet-500 to-fuchsia-500",
          bg: "bg-gradient-to-br from-violet-50 to-fuchsia-50",
          border: "border-violet-200",
          text: "text-violet-800",
          title: "Explain",
          subtitle: "Clarify understanding",
          description: "Turn discoveries into clear, formal understanding",
        };
      case "ELABORATE":
        return {
          icon: <ArrowRight className="h-6 w-6 text-white" />,
          gradient: "from-amber-500 to-orange-500",
          bg: "bg-gradient-to-br from-amber-50 to-orange-50",
          border: "border-amber-200",
          text: "text-amber-800",
          title: "Elaborate",
          subtitle: "Extend learning",
          description: "Apply the concept to richer or unfamiliar contexts",
        };
      case "EVALUATE":
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-white" />,
          gradient: "from-rose-500 to-pink-500",
          bg: "bg-gradient-to-br from-rose-50 to-pink-50",
          border: "border-rose-200",
          text: "text-rose-800",
          title: "Evaluate",
          subtitle: "Assess progress",
          description: "Measure understanding and reflect on mastery",
        };
      case "DESIRED_RESULTS":
        return {
          icon: <Target className="h-6 w-6 text-white" />,
          gradient: "from-blue-500 to-cyan-500",
          bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
          border: "border-blue-200",
          text: "text-blue-800",
          title: "Desired Results",
          subtitle: "Goals & understandings",
          description: "Clarify the outcomes and essential understandings first",
        };
      case "EVIDENCE":
        return {
          icon: <ClipboardCheck className="h-6 w-6 text-white" />,
          gradient: "from-violet-500 to-fuchsia-500",
          bg: "bg-gradient-to-br from-violet-50 to-fuchsia-50",
          border: "border-violet-200",
          text: "text-violet-800",
          title: "Evidence",
          subtitle: "Assessment evidence",
          description: "Define what mastery will look like and how it will be shown",
        };
      case "LEARNING_PLAN":
        return {
          icon: <Zap className="h-6 w-6 text-white" />,
          gradient: "from-emerald-500 to-teal-500",
          bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
          border: "border-emerald-200",
          text: "text-emerald-800",
          title: "Learning Plan",
          subtitle: "Teaching sequence",
          description: "Plan the teaching, practice, and reflection path",
        };
      default:
        return {
          icon: <Lightbulb className="h-6 w-6 text-white" />,
          gradient: "from-gray-500 to-slate-500",
          bg: "bg-gradient-to-br from-gray-50 to-slate-50",
          border: "border-gray-200",
          text: "text-gray-800",
          title: "Phase",
          subtitle: "Learning Phase",
          description: "Learning activity",
        };
    }
  };

  const details = getPhaseDetails(phase.phase);
  const phaseNumber = index + 1;

  return (
    <div className={`relative p-5 rounded-2xl border-2 ${details.bg} ${details.border} shadow-sm hover:shadow-md transition-shadow duration-300`}>
      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center bg-linear-to-r ${details.gradient} text-white font-bold text-sm shadow-lg`}>
        {phaseNumber}
      </div>

      <div className="flex items-start gap-4 mb-5">
        <div className={`p-3 rounded-xl bg-linear-to-r ${details.gradient} shadow-md`}>{details.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h4
                className={`font-bold ${details.text} mb-1 text-lg leading-tight break-words whitespace-normal`}
              >
                {prettyPhaseName || details.title}
              </h4>
              <p className="text-gray-600 text-sm font-medium break-words whitespace-normal">
                {phase.title || details.subtitle}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full border">{phase.timeMinutes || 10} min</span>
                <span className="text-xs text-gray-500">-</span>
                <span className="text-xs text-gray-600">Phase {phaseNumber}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <p className="text-gray-700 leading-relaxed ">{phase.description || details.description}</p>
      </div>

      <div className="space-y-3 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-red-500" />
              <p className="font-semibold text-red-600 text-sm">Teacher Role</p>
            </div>
            <p className="text-gray-700 text-sm leading-tight">{phase.teacherRole || "Facilitator and guide"}</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2 ml-3">
              <Brain className="h-4 w-4 text-blue-500" />
              <p className="font-semibold text-blue-600 text-sm">Student Role</p>
            </div>
            <p className="text-gray-700 text-sm leading-tight">{phase.studentRole || "Active participants"}</p>
          </div>
        </div>
      </div>

      {phase.materials && Array.isArray(phase.materials) && phase.materials.length > 0 && (
        <div className="pt-4 border-t border-gray-300/50">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Materials</p>
          </div>
          <div className="flex flex-wrap gap-1.5" data-print-hidden>
            {phase.materials.slice(0, 3).map((material: string, i: number) => (
              <span key={i} className="text-xs bg-white/80 backdrop-blur-sm px-2.5 py-1.5 border rounded-lg font-medium text-gray-700">
                {material}
              </span>
            ))}
            {phase.materials.length > 3 && (
              <span className="text-xs bg-white/80 backdrop-blur-sm px-2.5 py-1.5 border rounded-lg font-medium text-gray-500">
                +{phase.materials.length - 3} more
              </span>
            )}
          </div>
          <ul className="pdf-only mt-2 space-y-1 text-sm text-gray-700" data-pdf-only style={{ display: "none" }}>
            {phase.materials.map((material: string, i: number) => (
              <li key={i}>- {material}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SpecificActivityCard({ phase, activity }: { phase: string; activity: any }) {
  const getActivityDetails = (phaseName: string) => {
    switch (phaseName) {
      case "ACTIVITY":
        return {
          icon: <BookCheck className="h-6 w-6 text-white" />,
          gradient: "from-blue-500 to-cyan-500",
          bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
          border: "border-blue-200",
          text: "text-blue-800",
          title: "Reading Comprehension",
          subtitle: "Engagement Activity",
        };
      case "ANALYSIS":
        return {
          icon: <SquareCheck className="h-6 w-6 text-white" />,
          gradient: "from-green-500 to-emerald-500",
          bg: "bg-gradient-to-br from-green-50 to-emerald-50",
          border: "border-green-200",
          text: "text-green-800",
          title: "True/False + Checklist",
          subtitle: "Analysis Activities",
        };
      case "ABSTRACTION":
        return {
          icon: <ArrowLeftRight className="h-6 w-6 text-white" />,
          gradient: "from-purple-500 to-violet-500",
          bg: "bg-gradient-to-br from-purple-50 to-violet-50",
          border: "border-purple-200",
          text: "text-purple-800",
          title: "Matching Type",
          subtitle: "Abstraction Activity",
        };
      case "APPLICATION":
        return {
          icon: <FileQuestion className="h-6 w-6 text-white" />,
          gradient: "from-amber-500 to-orange-500",
          bg: "bg-gradient-to-br from-amber-50 to-orange-50",
          border: "border-amber-200",
          text: "text-amber-800",
          title: "MCQ + Identification",
          subtitle: "Application Activities",
        };
      default:
        return {
          icon: <Lightbulb className="h-6 w-6 text-white" />,
          gradient: "from-gray-500 to-slate-500",
          bg: "bg-gradient-to-br from-gray-50 to-slate-50",
          border: "border-gray-200",
          text: "text-gray-800",
          title: "Activity",
          subtitle: "Learning Activity",
        };
    }
  };

  const details = getActivityDetails(phase);
  const hasGenericContent =
    (typeof activity?.description === "string" && activity.description.trim()) ||
    (Array.isArray(activity?.steps) && activity.steps.length > 0) ||
    (Array.isArray(activity?.outputs) && activity.outputs.length > 0) ||
    (Array.isArray(activity?.materials) && activity.materials.length > 0);

  return (
    <div className={`p-6 rounded-2xl border-2 ${details.bg} ${details.border} shadow-sm`}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-xl bg-linear-to-r ${details.gradient} shadow-md`}>{details.icon}</div>
        <div>
          <h5 className={`font-bold text-xl ${details.text} mb-1`}>{activity.type || details.title}</h5>
          <p className="text-gray-600 text-sm font-medium">{details.subtitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        {phase === "ACTIVITY" && (
          <>
            {activity.readingPassage && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  <h6 className="font-semibold text-gray-800">Reading Passage</h6>
                </div>
                <div className="p-4 bg-white rounded-xl border border-blue-100">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{activity.readingPassage}</p>
                </div>
              </div>
            )}

            {Array.isArray(activity.questions) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <h6 className="font-semibold text-gray-800">Comprehension Questions</h6>
                </div>
                <div className="space-y-3">
                  {activity.questions.map((q: any, i: number) => (
                    <div key={i} className="p-4 bg-white rounded-xl border border-gray-200">
                      <p className="font-medium text-gray-800 mb-3">
                        <span className="text-blue-600 font-bold mr-2">{i + 1}.</span>
                        {q.question}
                      </p>
                      {q.answer && (
                        <div className="mt-3 p-3 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <ArrowRight className="h-3 w-3 text-green-600" />
                            <p className="font-semibold text-green-700">Answer:</p>
                          </div>
                          <p className="text-green-700 pl-5">{q.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {phase === "ANALYSIS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="h-4 w-4 text-green-500" />
                <h6 className="font-semibold text-gray-800">True/False Statements</h6>
              </div>
              <div className="space-y-3">
                {Array.isArray(activity.trueFalse) &&
                  activity.trueFalse.map((tf: any, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-gray-200">
                      <p className="font-medium text-gray-800 mb-2">
                        <span className="text-green-600 font-bold mr-2">{i + 1}.</span>
                        {tf.statement}
                      </p>
                      <div
                        className={`mt-2 p-2 rounded-lg border ${
                          tf.answer === "True"
                            ? "bg-linear-to-r from-green-50 to-emerald-50 border-green-200"
                            : "bg-linear-to-r from-red-50 to-rose-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {tf.answer === "True" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <p className={tf.answer === "True" ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                            {tf.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-green-500" />
                <h6 className="font-semibold text-gray-800">Self-assessment Checklist</h6>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <ul className="space-y-3">
                  {Array.isArray(activity.checklist) &&
                    activity.checklist.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="h-5 w-5 border-2 border-green-400 rounded-md bg-white flex items-center justify-center mt-0.5">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {phase === "ABSTRACTION" && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListOrdered className="h-4 w-4 text-purple-500" />
                <h6 className="font-semibold text-gray-800">Matching Exercise</h6>
              </div>
              <div className="space-y-3">
                {Array.isArray(activity.pairs) &&
                  activity.pairs.map((pair: any, i: number) => (
                    <div key={i} className="p-4 bg-white rounded-xl border border-purple-100">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 bg-purple-50 px-3 py-1.5 rounded-lg">{pair.left}</span>
                        <ArrowRight className="h-4 w-4 text-purple-400 mx-2" />
                        <span className="text-gray-700 bg-white px-3 py-1.5 rounded-lg border">{pair.right}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {activity.explanation && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-purple-500" />
                  <h6 className="font-semibold text-gray-800">Concept Explanation</h6>
                </div>
                <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
                  <p className="text-gray-700 leading-relaxed">{activity.explanation}</p>
                </div>
              </div>
            )}
          </>
        )}

        {phase === "APPLICATION" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-4 w-4 text-amber-500" />
                <h6 className="font-semibold text-gray-800">Multiple Choice Questions</h6>
              </div>
              <div className="space-y-4">
                {Array.isArray(activity.multipleChoice) &&
                  activity.multipleChoice.map((mc: any, i: number) => (
                    <div key={i} className="p-4 bg-white rounded-xl border border-gray-200">
                      <p className="font-medium text-gray-800 mb-3">
                        <span className="text-amber-600 font-bold mr-2">{i + 1}.</span>
                        {mc.question}
                      </p>
                      <div className="space-y-2 ml-4">
                        {Array.isArray(mc.options) &&
                          mc.options.map((opt: string, optIndex: number) => {
                            const isCorrect = mc.answer && opt.startsWith(mc.answer);
                            return (
                              <div key={optIndex} className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    isCorrect ? "bg-linear-to-r from-green-500 to-emerald-500 text-white" : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <span className="text-xs font-bold">{String.fromCharCode(65 + optIndex)}</span>
                                </div>
                                <p className={`${isCorrect ? "text-green-700 font-semibold" : "text-gray-700"}`}>{opt}</p>
                              </div>
                            );
                          })}
                      </div>
                      {mc.answer && (
                        <div className="mt-4 p-3 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <p className="text-green-700 font-semibold">Correct Answer: {mc.answer}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-amber-500" />
                <h6 className="font-semibold text-gray-800">Identification Exercise</h6>
              </div>

              {activity.identification?.wordBank && (
                <div className="mb-6 p-4 bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-amber-600" />
                    <p className="font-semibold text-gray-800">Word Bank</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activity.identification.wordBank.map((word: string, i: number) => (
                      <span key={i} className="bg-white px-3 py-1.5 border rounded-lg text-sm font-medium shadow-sm">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activity.identification?.clues && (
                <div className="space-y-3">
                  {activity.identification.clues.map((clue: string, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-gray-200">
                      <p className="font-medium text-gray-800 mb-2">
                        <span className="text-amber-600 font-bold mr-2">{i + 1}.</span>
                        {clue}
                      </p>
                      {activity.identification.answers && activity.identification.answers[i] && (
                        <div className="mt-2 p-2 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <p className="text-green-700 font-medium">
                            <span className="font-semibold">Answer:</span> {activity.identification.answers[i]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!["ACTIVITY", "ANALYSIS", "ABSTRACTION", "APPLICATION"].includes(phase) && hasGenericContent && (
          <div className="space-y-4">
            {activity?.description && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h6 className="mb-2 font-semibold text-gray-800">Description</h6>
                <p className="text-gray-700 leading-relaxed">{activity.description}</p>
              </div>
            )}
            {Array.isArray(activity?.steps) && activity.steps.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h6 className="mb-2 font-semibold text-gray-800">Steps</h6>
                <ul className="space-y-2">
                  {activity.steps.map((step: string, index: number) => (
                    <li key={`${step}-${index}`} className="text-gray-700">
                      <span className="mr-2 font-semibold text-indigo-600">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(activity?.outputs) && activity.outputs.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h6 className="mb-2 font-semibold text-gray-800">Expected Outputs</h6>
                <div className="flex flex-wrap gap-2">
                  {activity.outputs.map((output: string, index: number) => (
                    <span key={`${output}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
                      {output}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

