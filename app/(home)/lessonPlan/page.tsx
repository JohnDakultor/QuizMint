// // app/lesson-plan/page.tsx - IMPROVED UI AND STRUCTURE
// "use client";

// import { useState, useEffect } from "react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { 
//   Loader2, Sparkles, Download, Clock, AlertCircle, 
//   Target, Search, BookOpen, Zap, CheckSquare, 
//   ListChecks, ListOrdered, Hash, Users, Lightbulb,
//   Brain, ClipboardCheck, BookCheck, CheckCircle2,
//   ArrowRight, ArrowLeftRight, FileQuestion, SquareCheck
// } from "lucide-react";

// const FREE_PLAN_LIMIT = 3;

// // Usage Indicator Component
// function UsageIndicator({ usage }: { usage: any }) {
//   if (!usage) return null;
  
//   const used = usage.used || 0;
//   const limit = usage.limit || FREE_PLAN_LIMIT;
//   const percentage = Math.min((used / limit) * 100, 100);
//   const nextReset = usage.nextReset ? new Date(usage.nextReset) : null;
  
//   const getTimeUntilReset = () => {
//     if (!nextReset) return "";
//     const now = new Date();
//     const diffMs = nextReset.getTime() - now.getTime();
    
//     if (diffMs <= 0) return "Resets soon";
    
//     const hours = Math.floor(diffMs / (1000 * 60 * 60));
//     const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
//     return `Resets in ${hours}h ${minutes}m`;
//   };
  
//   return (
//     <div className="mt-4 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
//       <div className="flex items-center justify-between mb-2">
//         <div className="flex items-center gap-2">
//           <Clock className="h-4 w-4 text-blue-600" />
//           <span className="font-semibold text-blue-700">Free Plan Usage</span>
//         </div>
//         <span className="text-sm text-blue-600 font-medium bg-white px-2 py-1 rounded">
//           {used}/{limit} lesson plans
//         </span>
//       </div>
//       <div className="w-full bg-blue-100 rounded-full h-2.5 mb-2">
//         <div 
//           className={`h-2.5 rounded-full transition-all duration-300 ${
//             percentage >= 90 ? "bg-red-500" : 
//             percentage >= 70 ? "bg-yellow-500" : "bg-linear-to-r from-blue-500 to-indigo-500"
//           }`}
//           style={{ width: `${percentage}%` }}
//         ></div>
//       </div>
//       <div className="flex justify-between items-center text-sm">
//         <span className="text-blue-600 font-medium">
//           {used === limit ? "Limit reached" : `${limit - used} remaining`}
//         </span>
//         <span className="text-blue-500 font-medium">
//           {getTimeUntilReset()}
//         </span>
//       </div>
//     </div>
//   );
// }

// // Enhanced 4A's Phase Component
// function FourAsPhaseCard({ phase, index }: { phase: any, index: number }) {
//   const getPhaseDetails = (phaseName: string) => {
//     switch (phaseName) {
//       case "ACTIVITY":
//         return {
//           icon: <Target className="h-6 w-6 text-white" />,
//           gradient: "from-blue-500 to-cyan-500",
//           bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
//           border: "border-blue-200",
//           text: "text-blue-800",
//           title: "Activity",
//           subtitle: "Engagement Phase",
//           description: "Activate prior knowledge and generate interest"
//         };
//       case "ANALYSIS":
//         return {
//           icon: <Search className="h-6 w-6 text-white" />,
//           gradient: "from-green-500 to-emerald-500",
//           bg: "bg-gradient-to-br from-green-50 to-emerald-50",
//           border: "border-green-200",
//           text: "text-green-800",
//           title: "Analysis",
//           subtitle: "Exploration Phase",
//           description: "Develop critical thinking through guided exploration"
//         };
//       case "ABSTRACTION":
//         return {
//           icon: <BookOpen className="h-6 w-6 text-white" />,
//           gradient: "from-purple-500 to-violet-500",
//           bg: "bg-gradient-to-br from-purple-50 to-violet-50",
//           border: "border-purple-200",
//           text: "text-purple-800",
//           title: "Abstraction",
//           subtitle: "Concept Development",
//           description: "Formal presentation of concepts and principles"
//         };
//       case "APPLICATION":
//         return {
//           icon: <Zap className="h-6 w-6 text-white" />,
//           gradient: "from-amber-500 to-orange-500",
//           bg: "bg-gradient-to-br from-amber-50 to-orange-50",
//           border: "border-amber-200",
//           text: "text-amber-800",
//           title: "Application",
//           subtitle: "Practice & Assessment",
//           description: "Apply knowledge and demonstrate understanding"
//         };
//       default:
//         return {
//           icon: <Lightbulb className="h-6 w-6 text-white" />,
//           gradient: "from-gray-500 to-slate-500",
//           bg: "bg-gradient-to-br from-gray-50 to-slate-50",
//           border: "border-gray-200",
//           text: "text-gray-800",
//           title: "Phase",
//           subtitle: "Learning Phase",
//           description: "Learning activity"
//         };
//     }
//   };

//   const details = getPhaseDetails(phase.phase);
//   const phaseNumber = index + 1;

//   return (
//     <div className={`relative p-5 rounded-2xl border-2 ${details.bg} ${details.border} shadow-sm hover:shadow-md transition-shadow duration-300`}>
//       {/* Phase Number Badge */}
//       <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center bg-linear-to-r ${details.gradient} text-white font-bold text-sm shadow-lg`}>
//         {phaseNumber}
//       </div>
      
//       {/* Header */}
//       <div className="flex items-start gap-4 mb-5">
//         <div className={`p-3 rounded-xl bg-linear-to-r ${details.gradient} shadow-md`}>
//           {details.icon}
//         </div>
//         <div className="flex-1 min-w-0">
//           <div className="flex justify-between items-start">
//             <div className="min-w-0">
//               <h4 className={`font-bold text-xl ${details.text} mb-1 truncate`}>
//                 {phase.phase || details.title}
//               </h4>
//               <p className="text-gray-600 text-sm font-medium">
//                 {phase.title || details.subtitle}
//               </p>
//               <div className="flex items-center gap-2 mt-2">
//                 <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full border">
//                   {phase.timeMinutes || 10} min
//                 </span>
//                 <span className="text-xs text-gray-500">ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢</span>
//                 <span className="text-xs text-gray-600">Phase {phaseNumber}/4</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Description */}
//       <div className="mb-5">
//         <p className="text-gray-700 leading-relaxed line-clamp-3">
//           {phase.description || details.description}
//         </p>
//       </div>

//       {/* Teacher & Student Roles */}
//       <div className="space-y-3 mb-5">
//         <div className="grid grid-cols-1 gap-3">
//           <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border">
//             <div className="flex items-center gap-2 mb-2">
//               <Users className="h-4 w-4 text-red-500" />
//               <p className="font-semibold text-red-600 text-sm">Teacher Role</p>
//             </div>
//             <p className="text-gray-700 text-sm leading-tight">
//               {phase.teacherRole || "Facilitator and guide"}
//             </p>
//           </div>
//           <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border">
//             <div className="flex items-center gap-2 mb-2">
//               <Brain className="h-4 w-4 text-blue-500" />
//               <p className="font-semibold text-blue-600 text-sm">Student Role</p>
//             </div>
//             <p className="text-gray-700 text-sm leading-tight">
//               {phase.studentRole || "Active participants"}
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Materials */}
//       {phase.materials && Array.isArray(phase.materials) && phase.materials.length > 0 && (
//         <div className="pt-4 border-t border-gray-300/50">
//           <div className="flex items-center gap-2 mb-3">
//             <ClipboardCheck className="h-4 w-4 text-gray-500" />
//             <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Materials</p>
//           </div>
//           <div className="flex flex-wrap gap-1.5">
//             {phase.materials.slice(0, 3).map((material: string, i: number) => (
//               <span key={i} className="text-xs bg-white/80 backdrop-blur-sm px-2.5 py-1.5 border rounded-lg font-medium text-gray-700">
//                 {material}
//               </span>
//             ))}
//             {phase.materials.length > 3 && (
//               <span className="text-xs bg-white/80 backdrop-blur-sm px-2.5 py-1.5 border rounded-lg font-medium text-gray-500">
//                 +{phase.materials.length - 3} more
//               </span>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // Specific Activity Component
// function SpecificActivityCard({ phase, activity }: { phase: string, activity: any }) {
//   const getActivityDetails = (phase: string) => {
//     switch (phase) {
//       case "ACTIVITY":
//         return {
//           icon: <BookCheck className="h-6 w-6 text-white" />,
//           gradient: "from-blue-500 to-cyan-500",
//           bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
//           border: "border-blue-200",
//           text: "text-blue-800",
//           title: "Reading Comprehension",
//           subtitle: "Engagement Activity"
//         };
//       case "ANALYSIS":
//         return {
//           icon: <SquareCheck className="h-6 w-6 text-white" />,
//           gradient: "from-green-500 to-emerald-500",
//           bg: "bg-gradient-to-br from-green-50 to-emerald-50",
//           border: "border-green-200",
//           text: "text-green-800",
//           title: "True/False + Checklist",
//           subtitle: "Analysis Activities"
//         };
//       case "ABSTRACTION":
//         return {
//           icon: <ArrowLeftRight className="h-6 w-6 text-white" />,
//           gradient: "from-purple-500 to-violet-500",
//           bg: "bg-gradient-to-br from-purple-50 to-violet-50",
//           border: "border-purple-200",
//           text: "text-purple-800",
//           title: "Matching Type",
//           subtitle: "Abstraction Activity"
//         };
//       case "APPLICATION":
//         return {
//           icon: <FileQuestion className="h-6 w-6 text-white" />,
//           gradient: "from-amber-500 to-orange-500",
//           bg: "bg-gradient-to-br from-amber-50 to-orange-50",
//           border: "border-amber-200",
//           text: "text-amber-800",
//           title: "MCQ + Identification",
//           subtitle: "Application Activities"
//         };
//       default:
//         return {
//           icon: <Lightbulb className="h-6 w-6 text-white" />,
//           gradient: "from-gray-500 to-slate-500",
//           bg: "bg-gradient-to-br from-gray-50 to-slate-50",
//           border: "border-gray-200",
//           text: "text-gray-800",
//           title: "Activity",
//           subtitle: "Learning Activity"
//         };
//     }
//   };

//   const details = getActivityDetails(phase);

//   return (
//     <div className={`p-6 rounded-2xl border-2 ${details.bg} ${details.border} shadow-sm`}>
//       {/* Header */}
//       <div className="flex items-center gap-4 mb-6">
//         <div className={`p-3 rounded-xl bg-linear-to-r ${details.gradient} shadow-md`}>
//           {details.icon}
//         </div>
//         <div>
//           <h5 className={`font-bold text-xl ${details.text} mb-1`}>
//             {activity.type || details.title}
//           </h5>
//           <p className="text-gray-600 text-sm font-medium">
//             {details.subtitle}
//           </p>
//         </div>
//       </div>

//       {/* Content based on activity type */}
//       <div className="space-y-6">
//         {phase === "ACTIVITY" && (
//           <>
//             {activity.readingPassage && (
//               <div>
//                 <div className="flex items-center gap-2 mb-3">
//                   <BookOpen className="h-4 w-4 text-blue-500" />
//                   <h6 className="font-semibold text-gray-800">Reading Passage</h6>
//                 </div>
//                 <div className="p-4 bg-white rounded-xl border border-blue-100">
//                   <p className="text-gray-700 leading-relaxed whitespace-pre-line">
//                     {activity.readingPassage}
//                   </p>
//                 </div>
//               </div>
//             )}
            
//             {Array.isArray(activity.questions) && (
//               <div>
//                 <div className="flex items-center gap-2 mb-3">
//                   <CheckCircle2 className="h-4 w-4 text-blue-500" />
//                   <h6 className="font-semibold text-gray-800">Comprehension Questions</h6>
//                 </div>
//                 <div className="space-y-3">
//                   {activity.questions.map((q: any, i: number) => (
//                     <div key={i} className="p-4 bg-white rounded-xl border border-gray-200">
//                       <p className="font-medium text-gray-800 mb-3">
//                         <span className="text-blue-600 font-bold mr-2">{i + 1}.</span>
//                         {q.question}
//                       </p>
//                       {q.answer && (
//                         <div className="mt-3 p-3 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
//                           <div className="flex items-center gap-2 mb-1">
//                             <ArrowRight className="h-3 w-3 text-green-600" />
//                             <p className="font-semibold text-green-700">Answer:</p>
//                           </div>
//                           <p className="text-green-700 pl-5">{q.answer}</p>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {phase === "ANALYSIS" && (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {/* True/False Section */}
//             <div>
//               <div className="flex items-center gap-2 mb-3">
//                 <CheckSquare className="h-4 w-4 text-green-500" />
//                 <h6 className="font-semibold text-gray-800">True/False Statements</h6>
//               </div>
//               <div className="space-y-3">
//                 {Array.isArray(activity.trueFalse) && 
//                   activity.trueFalse.map((tf: any, i: number) => (
//                     <div key={i} className="p-3 bg-white rounded-xl border border-gray-200">
//                       <p className="font-medium text-gray-800 mb-2">
//                         <span className="text-green-600 font-bold mr-2">{i + 1}.</span>
//                         {tf.statement}
//                       </p>
//                       <div className={`mt-2 p-2 rounded-lg border ${
//                         tf.answer === "True" 
//                           ? "bg-linear-to-r from-green-50 to-emerald-50 border-green-200" 
//                           : "bg-linear-to-r from-red-50 to-rose-50 border-red-200"
//                       }`}>
//                         <div className="flex items-center gap-2">
//                           {tf.answer === "True" ? (
//                             <CheckCircle2 className="h-4 w-4 text-green-600" />
//                           ) : (
//                             <AlertCircle className="h-4 w-4 text-red-600" />
//                           )}
//                           <p className={tf.answer === "True" ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
//                             {tf.answer}
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             </div>
            
//             {/* Checklist Section */}
//             <div>
//               <div className="flex items-center gap-2 mb-3">
//                 <ListChecks className="h-4 w-4 text-green-500" />
//                 <h6 className="font-semibold text-gray-800">Self-assessment Checklist</h6>
//               </div>
//               <div className="p-4 bg-white rounded-xl border border-gray-200">
//                 <ul className="space-y-3">
//                   {Array.isArray(activity.checklist) && 
//                     activity.checklist.map((item: string, i: number) => (
//                       <li key={i} className="flex items-start gap-3">
//                         <div className="h-5 w-5 border-2 border-green-400 rounded-md bg-white flex items-center justify-center mt-0.5">
//                           <div className="h-2 w-2 rounded-full bg-green-500"></div>
//                         </div>
//                         <span className="text-gray-700">{item}</span>
//                       </li>
//                     ))}
//                 </ul>
//               </div>
//             </div>
//           </div>
//         )}

//         {phase === "ABSTRACTION" && (
//           <>
//             <div>
//               <div className="flex items-center gap-2 mb-3">
//                 <ListOrdered className="h-4 w-4 text-purple-500" />
//                 <h6 className="font-semibold text-gray-800">Matching Exercise</h6>
//               </div>
//               <div className="space-y-3">
//                 {Array.isArray(activity.pairs) && 
//                   activity.pairs.map((pair: any, i: number) => (
//                     <div key={i} className="p-4 bg-white rounded-xl border border-purple-100">
//                       <div className="flex items-center justify-between">
//                         <span className="font-medium text-gray-800 bg-purple-50 px-3 py-1.5 rounded-lg">
//                           {pair.left}
//                         </span>
//                         <ArrowRight className="h-4 w-4 text-purple-400 mx-2" />
//                         <span className="text-gray-700 bg-white px-3 py-1.5 rounded-lg border">
//                           {pair.right}
//                         </span>
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             </div>
            
//             {activity.explanation && (
//               <div>
//                 <div className="flex items-center gap-2 mb-3">
//                   <Lightbulb className="h-4 w-4 text-purple-500" />
//                   <h6 className="font-semibold text-gray-800">Concept Explanation</h6>
//                 </div>
//                 <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
//                   <p className="text-gray-700 leading-relaxed">{activity.explanation}</p>
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {phase === "APPLICATION" && (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {/* Multiple Choice Section */}
//             <div>
//               <div className="flex items-center gap-2 mb-3">
//                 <Hash className="h-4 w-4 text-amber-500" />
//                 <h6 className="font-semibold text-gray-800">Multiple Choice Questions</h6>
//               </div>
//               <div className="space-y-4">
//                 {Array.isArray(activity.multipleChoice) && 
//                   activity.multipleChoice.map((mc: any, i: number) => (
//                     <div key={i} className="p-4 bg-white rounded-xl border border-gray-200">
//                       <p className="font-medium text-gray-800 mb-3">
//                         <span className="text-amber-600 font-bold mr-2">{i + 1}.</span>
//                         {mc.question}
//                       </p>
//                       <div className="space-y-2 ml-4">
//                         {Array.isArray(mc.options) && mc.options.map((opt: string, optIndex: number) => {
//                           const isCorrect = mc.answer && opt.startsWith(mc.answer);
//                           return (
//                             <div key={optIndex} className="flex items-center gap-2">
//                               <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
//                                 isCorrect 
//                                   ? "bg-linear-to-r from-green-500 to-emerald-500 text-white" 
//                                   : "bg-gray-100 text-gray-600"
//                               }`}>
//                                 <span className="text-xs font-bold">{String.fromCharCode(65 + optIndex)}</span>
//                               </div>
//                               <p className={`${isCorrect ? "text-green-700 font-semibold" : "text-gray-700"}`}>
//                                 {opt}
//                               </p>
//                             </div>
//                           );
//                         })}
//                       </div>
//                       {mc.answer && (
//                         <div className="mt-4 p-3 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
//                           <div className="flex items-center gap-2">
//                             <CheckCircle2 className="h-4 w-4 text-green-600" />
//                             <p className="text-green-700 font-semibold">Correct Answer: {mc.answer}</p>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//               </div>
//             </div>
            
//             {/* Identification Section */}
//             <div>
//               <div className="flex items-center gap-2 mb-3">
//                 <ListChecks className="h-4 w-4 text-amber-500" />
//                 <h6 className="font-semibold text-gray-800">Identification Exercise</h6>
//               </div>
              
//               {/* Word Bank */}
//               {activity.identification?.wordBank && (
//                 <div className="mb-6 p-4 bg-linear-to-rrom-amber-50 to-orange-50 rounded-xl border border-amber-200">
//                   <div className="flex items-center gap-2 mb-3">
//                     <BookOpen className="h-4 w-4 text-amber-600" />
//                     <p className="font-semibold text-gray-800">Word Bank</p>
//                   </div>
//                   <div className="flex flex-wrap gap-2">
//                     {activity.identification.wordBank.map((word: string, i: number) => (
//                       <span key={i} className="bg-white px-3 py-1.5 border rounded-lg text-sm font-medium shadow-sm">
//                         {word}
//                       </span>
//                     ))}
//                   </div>
//                 </div>
//               )}
              
//               {/* Clues */}
//               {activity.identification?.clues && (
//                 <div className="space-y-3">
//                   {activity.identification.clues.map((clue: string, i: number) => (
//                     <div key={i} className="p-3 bg-white rounded-xl border border-gray-200">
//                       <p className="font-medium text-gray-800 mb-2">
//                         <span className="text-amber-600 font-bold mr-2">{i + 1}.</span>
//                         {clue}
//                       </p>
//                       {activity.identification.answers && 
//                         activity.identification.answers[i] && (
//                           <div className="mt-2 p-2 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
//                             <p className="text-green-700 font-medium">
//                               <span className="font-semibold">Answer:</span> {activity.identification.answers[i]}
//                             </p>
//                           </div>
//                         )}
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // Main Component
// export default function LessonPlanPage() {
//   const [loading, setLoading] = useState(false);
//   const [lessonPlan, setLessonPlan] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [downloading, setDownloading] = useState(false);
//   const [formDataObject, setFormDataObject] = useState<any>(null);
//   const [usageInfo, setUsageInfo] = useState<any>(null);

//   async function generateLessonPlan(formData: FormData) {
//     const formObj = Object.fromEntries(formData.entries());
//     setFormDataObject(formObj);

//     setLoading(true);
//     setError(null);
//     setLessonPlan(null);
//     setUsageInfo(null);

//     try {
//       const res = await fetch("/api/generate-lesson-plan", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formObj),
//       });

//       const data = await res.json().catch(() => ({}));
      
//       if (!res.ok) {
//         if (res.status === 403 && data.error === "Free limit reached") {
//           throw new Error(
//             `${data.message || `You've reached your limit of ${FREE_PLAN_LIMIT} lesson plans.`}\n` +
//             (data.resetTime ? `Limit resets at: ${new Date(data.resetTime).toLocaleTimeString()}` : "")
//           );
//         }
//         throw new Error(data.error || data.message || "Failed to generate lesson plan");
//       }
      
//       setLessonPlan(data.lessonPlan);
//       setUsageInfo(data.usage);
      
//     } catch (err: any) {
//       setError(err.message || "Failed to generate lesson plan");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function downloadLessonPlan() {
//     if (!lessonPlan || !formDataObject) return;
//     setDownloading(true);

//     try {
//       if (usageInfo?.used >= FREE_PLAN_LIMIT) {
//         throw new Error(`You've reached your limit of ${FREE_PLAN_LIMIT} lesson plans. Please wait 3 hours for your limit to reset.`);
//       }

//       const downloadData = {
//         ...formDataObject,
//         format: "docx",
//         useCache: true
//       };

//       const res = await fetch("/api/generate-lesson-plan", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(downloadData),
//       });

//       if (!res.ok) {
//         const errorText = await res.text();
//         throw new Error(`Download failed: ${res.status} ${errorText}`);
//       }

//       const blob = await res.blob();
//       const url = URL.createObjectURL(blob);
      
//       const link = document.createElement("a");
//       link.href = url;
//       link.download = `${formDataObject.topic || 'lesson_plan'}.docx`;
      
//       document.body.appendChild(link);
//       link.click();
      
//       setTimeout(() => {
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//       }, 100);
      
//     } catch (err: any) {
//       console.error("Download error:", err);
//       alert(`Failed to download: ${err.message}`);
//     } finally {
//       setDownloading(false);
//     }
//   }

//   useEffect(() => {
//     if (error) {
//       const timer = setTimeout(() => {
//         setError(null);
//       }, 10000);
//       return () => clearTimeout(timer);
//     }
//   }, [error]);

//   return (
//     <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
//       {/* Header */}
//       <div className="relative text-center">
        
//         <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
//           4A's Model Lesson Plan Generator
//         </h1>
//         <p className="text-gray-600 text-lg max-w-3xl mx-auto">
//           Generate comprehensive DepEd-aligned lesson plans using the 4A's instructional model with clear separation between pedagogical framework and activity types
//         </p>
        
//         {/* 4A's Overview Cards */}
//         <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
//           {[
//             { phase: "ACTIVITY", icon: Target, color: "blue", title: "Activity", subtitle: "Engagement Phase", desc: "Activate prior knowledge" },
//             { phase: "ANALYSIS", icon: Search, color: "green", title: "Analysis", subtitle: "Exploration Phase", desc: "Develop critical thinking" },
//             { phase: "ABSTRACTION", icon: BookOpen, color: "purple", title: "Abstraction", subtitle: "Concept Development", desc: "Present concepts & principles" },
//             { phase: "APPLICATION", icon: Zap, color: "amber", title: "Application", subtitle: "Practice & Assessment", desc: "Apply real-world skills" }
//           ].map((item, idx) => (
//             <div key={idx} className={`p-4 rounded-xl border-2 border-${item.color}-100 bg-linear-to-br from-${item.color}-50 to-white`}>
//               <div className="flex items-center justify-center mb-3">
//                 <div className={`p-3 rounded-lg bg-linear-to-r from-${item.color}-500 to-${item.color}-600`}>
//                   <item.icon className="h-6 w-6 text-white" />
//                 </div>
//               </div>
//               <p className={`font-bold text-${item.color}-700 text-center mb-1`}>{item.title}</p>
//               <p className="text-sm text-gray-600 text-center mb-2">{item.subtitle}</p>
//               <p className="text-xs text-gray-500 text-center">{item.desc}</p>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Form Section */}
//       <Card className="shadow-xl border-2 border-gray-200 overflow-hidden">
//         <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4">
//           <h2 className="text-xl font-bold text-white text-center">Generate Your Lesson Plan</h2>
//         </div>
//         <CardContent className="p-6">
//           <form
//             onSubmit={(e) => {
//               e.preventDefault();
//               generateLessonPlan(new FormData(e.currentTarget));
//             }}
//             className="space-y-6"
//           >
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-3">
//                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                   <Target className="h-4 w-4 text-blue-600" />
//                   Lesson Topic *
//                 </label>
//                 <Input 
//                   name="topic" 
//                   placeholder="e.g., Photosynthesis, World War II, Quadratic Equations" 
//                   required 
//                   className="h-12 border-2 focus:border-blue-500"
//                 />
//               </div>
//               <div className="space-y-3">
//                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                   <BookOpen className="h-4 w-4 text-purple-600" />
//                   Subject *
//                 </label>
//                 <Input 
//                   name="subject" 
//                   placeholder="e.g., Science, History, Mathematics" 
//                   required 
//                   className="h-12 border-2 focus:border-purple-500"
//                 />
//               </div>
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="space-y-3">
//                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                   <Users className="h-4 w-4 text-green-600" />
//                   Grade Level *
//                 </label>
//                 <Input 
//                   name="grade" 
//                   placeholder="e.g., Grade 7, Senior High School" 
//                   required 
//                   className="h-12 border-2 focus:border-green-500"
//                 />
//               </div>
//               <div className="space-y-3">
//                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                   <Clock className="h-4 w-4 text-amber-600" />
//                   Number of Days *
//                 </label>
//                 <Input 
//                   name="days" 
//                   type="number" 
//                   min="1" 
//                   max="10" 
//                   placeholder="Days" 
//                   required 
//                   className="h-12 border-2 focus:border-amber-500"
//                 />
//               </div>
//               <div className="space-y-3">
//                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                   <Zap className="h-4 w-4 text-red-600" />
//                   Minutes per Day *
//                 </label>
//                 <Input
//                   name="minutesPerDay"
//                   type="number"
//                   min="10"
//                   max="120"
//                   defaultValue="40"
//                   required
//                   className="h-12 border-2 focus:border-red-500"
//                 />
//               </div>
//             </div>

//             <div className="space-y-3">
//               <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                 <Lightbulb className="h-4 w-4 text-indigo-600" />
//                 Learning Objectives (optional)
//               </label>
//               <Textarea 
//                 name="objectives" 
//                 placeholder="Enter specific learning objectives, one per line..."
//                 className="min-h-30 border-2 focus:border-indigo-500"
//               />
//             </div>

//             <div className="space-y-3">
//               <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
//                 <AlertCircle className="h-4 w-4 text-gray-600" />
//                 Special Constraints (optional)
//               </label>
//               <Textarea 
//                 name="constraints" 
//                 placeholder="Any specific requirements or constraints..."
//                 className="min-h-25 border-2 focus:border-gray-500"
//               />
//             </div>

//             <Button 
//               className="w-full h-14 text-lg font-bold bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
//               disabled={loading}
//             >
//               {loading ? (
//                 <>
//                   <Loader2 className="animate-spin mr-3" />
//                   <span className="text-white">Generating 4A's Lesson Plan...</span>
//                 </>
//               ) : (
//                 <>
//                   <Sparkles className="mr-3" />
//                   <span className="text-white">Generate 4A's Lesson Plan</span>
//                 </>
//               )}
//             </Button>
//           </form>
          
//           {error && (
//             <div className="mt-6 p-4 bg-linear-to-r from-red-50 to-rose-50 rounded-xl border-2 border-red-200">
//               <div className="flex items-start gap-3">
//                 <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
//                 <div>
//                   <p className="font-bold text-red-800 text-lg">Error</p>
//                   <p className="text-red-700 whitespace-pre-line mt-1">{error}</p>
//                 </div>
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Generated Lesson Plan */}
//       {lessonPlan && (
//         <Card className="shadow-2xl border-2 border-gray-300 overflow-hidden">
//           <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4">
//             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
//               <div>
//                 <h2 className="text-2xl font-bold text-white">{lessonPlan.title}</h2>
//                 <div className="flex items-center gap-4 mt-2 text-blue-100">
//                   <span><strong>Grade:</strong> {lessonPlan.grade}</span>
//                   <span>ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢</span>
//                   <span><strong>Duration:</strong> {lessonPlan.duration}</span>
//                 </div>
//               </div>
//               <Button 
//                 onClick={downloadLessonPlan} 
//                 disabled={downloading || (usageInfo?.used >= FREE_PLAN_LIMIT)}
//                 variant={usageInfo?.used >= FREE_PLAN_LIMIT ? "outline" : "default"}
//                 className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-semibold shadow-lg"
//               >
//                 {downloading ? (
//                   <Loader2 className="animate-spin mr-2" />
//                 ) : (
//                   <Download className="mr-2" />
//                 )}
//                 {usageInfo?.used >= FREE_PLAN_LIMIT ? "Limit Reached" : "Download DOCX"}
//               </Button>
//             </div>
//           </div>

//           <CardContent className="p-6 space-y-8">
//             {/* Usage Indicator */}
//             <UsageIndicator usage={usageInfo} />

//             {/* Objectives */}
//             {lessonPlan.objectives && lessonPlan.objectives.length > 0 && (
//               <div className="bg-linear-to-rrom-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200">
//                 <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
//                   <Lightbulb className="h-5 w-5 text-blue-600" />
//                   Learning Objectives
//                 </h3>
//                 <ul className="space-y-3 ml-2">
//                   {lessonPlan.objectives.map((obj: string, i: number) => (
//                     <li key={i} className="flex items-start gap-3">
//                       <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
//                       <span className="text-gray-700 font-medium">{obj}</span>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}

//             {/* Days */}
//             {lessonPlan.days?.map((day: any, dayIndex: number) => (
//               <div key={day.day || dayIndex + 1} className="mt-8 pt-8 border-t-2 border-gray-300 first:border-t-0 first:pt-0">
//                 {/* Day Header */}
//                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
//                   <div>
//                     <div className="flex items-center gap-3 mb-2">
//                       <div className="w-10 h-10 rounded-full bg-linear-to-r from-blue-500 to-purple-500 flex items-center justify-center">
//                         <span className="text-white font-bold text-lg">{day.day || dayIndex + 1}</span>
//                       </div>
//                       <h3 className="text-2xl font-bold text-gray-900">
//                         Day {day.day || dayIndex + 1}: {day.topic}
//                       </h3>
//                     </div>
//                     <p className="text-gray-600 ml-13">Total duration: 40 minutes</p>
//                   </div>
//                   <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
//                     ÃƒÂ¢Ã‚ÂÃ‚Â±ÃƒÂ¯Ã‚Â¸Ã‚Â 40 minutes total
//                   </span>
//                 </div>
                
//                 {/* 4A's Pedagogical Framework Section */}
//                 <div className="mb-10">
//                   <div className="flex items-center justify-between mb-6">
//                     <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
//                       <Brain className="h-5 w-5 text-blue-600" />
//                       4A's Pedagogical Framework
//                     </h4>
//                     <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
//                       4 Phases - 10 min each
//                     </div>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                     {day["4asModel"] && Array.isArray(day["4asModel"]) && 
//                       day["4asModel"].map((phase: any, idx: number) => (
//                         <FourAsPhaseCard key={idx} phase={phase} index={idx} />
//                       ))}
//                   </div>
//                 </div>

//                 {/* Specific Activities Section */}
//                 {day.specificActivities && (
//                   <div className="mb-10">
//                     <div className="flex items-center justify-between mb-6">
//                       <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
//                         <ClipboardCheck className="h-5 w-5 text-purple-600" />
//                         Specific Activity Types
//                       </h4>
//                       <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
//                         Linked to 4A's Phases
//                       </div>
//                     </div>
                    
//                     <div className="space-y-8">
//                       {Object.entries(day.specificActivities).map(([phase, activity]: [string, any]) => (
//                         <SpecificActivityCard 
//                           key={phase} 
//                           phase={phase} 
//                           activity={activity} 
//                         />
//                       ))}
//                     </div>
//                   </div>
//                 )}

//                 {/* Additional Information */}
//                 {(day.differentiation || day.closure) && (
//                   <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
//                     {day.differentiation && (
//                       <div className="bg-linear-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
//                         <h4 className="font-bold text-green-800 text-lg mb-3 flex items-center gap-2">
//                           <Users className="h-5 w-5 text-green-600" />
//                           Differentiation Strategies
//                         </h4>
//                         <p className="text-gray-700 whitespace-pre-line leading-relaxed">
//                           {day.differentiation}
//                         </p>
//                       </div>
//                     )}
                    
//                     {day.closure && (
//                       <div className="bg-linear-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border-2 border-purple-200">
//                         <h4 className="font-bold text-purple-800 text-lg mb-3 flex items-center gap-2">
//                           <CheckCircle2 className="h-5 w-5 text-purple-600" />
//                           Lesson Closure
//                         </h4>
//                         <p className="text-gray-700 leading-relaxed">{day.closure}</p>
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {/* Assessment/Rubrics */}
//                 <div className="mt-10">
//                   <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
//                     <FileQuestion className="h-5 w-5 text-red-600" />
//                     Assessment / Rubrics
//                   </h4>
//                   {day.assessment && day.assessment.length > 0 ? (
//                     <div className="space-y-6">
//                       {day.assessment.map((a: any, i: number) => (
//                         <div key={i} className="bg-linear-to-br from-gray-50 to-slate-50 p-6 rounded-2xl border-2 border-gray-200">
//                           <p className="font-bold text-blue-700 text-xl mb-3">{a.criteria}</p>
//                           <p className="text-gray-700 mb-6 font-medium">{a.description}</p>
//                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                             <div className="bg-linear-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
//                               <div className="flex items-center gap-2 mb-2">
//                                 <CheckCircle2 className="h-4 w-4 text-green-600" />
//                                 <p className="font-bold text-green-800">Excellent</p>
//                               </div>
//                               <p className="text-green-700 text-sm">{a.rubricLevel?.excellent || "N/A"}</p>
//                             </div>
//                             <div className="bg-linear-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
//                               <div className="flex items-center gap-2 mb-2">
//                                 <AlertCircle className="h-4 w-4 text-amber-600" />
//                                 <p className="font-bold text-amber-800">Satisfactory</p>
//                               </div>
//                               <p className="text-amber-700 text-sm">{a.rubricLevel?.satisfactory || "N/A"}</p>
//                             </div>
//                             <div className="bg-linear-to-br from-red-50 to-rose-50 p-4 rounded-xl border-2 border-red-200">
//                               <div className="flex items-center gap-2 mb-2">
//                                 <AlertCircle className="h-4 w-4 text-red-600" />
//                                 <p className="font-bold text-red-800">Needs Improvement</p>
//                               </div>
//                               <p className="text-red-700 text-sm">{a.rubricLevel?.needsImprovement || "N/A"}</p>
//                             </div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="bg-linear-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-300">
//                       <div className="flex items-center gap-3">
//                         <AlertCircle className="h-6 w-6 text-amber-600" />
//                         <div>
//                           <p className="text-amber-800 font-bold text-lg">
//                             No assessment rubrics provided for this day.
//                           </p>
//                           <p className="text-amber-700 mt-1">
//                             Consider adding assessment criteria to evaluate student learning.
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// }




// app/lesson-plan/page.tsx - WITH PDF DOWNLOAD FUNCTIONALITY
// app/lesson-plan/page.tsx - WITH PDF DOWNLOAD FUNCTIONALITY (FIXED FOR EXISTING BACKEND)
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, Sparkles, Download, Clock, AlertCircle, 
  Target, Search, BookOpen, Zap, CheckSquare, 
  ListChecks, ListOrdered, Hash, Users, Lightbulb,
  Brain, ClipboardCheck, BookCheck, CheckCircle2,
  ArrowRight, ArrowLeftRight, FileQuestion, SquareCheck, Share2,
  RefreshCw,
  FileText, PauseCircle, FileUp
} from "lucide-react";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import PptxEditor from "@/components/lesson-plan/pptx-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Tour from "@/components/ui/tour";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import LoadingProgress from "@/components/ui/loading-progress";
import LiteModeBadge from "@/components/ui/lite-mode-badge";
import { SourceIcons, type SourceIcon } from "@/components/source-icons";

const FREE_PLAN_LIMIT = 3;
const LESSON_EXPORT_POLL_TIMEOUT_MS = 10 * 60 * 1000;
const LESSON_EXPORT_LOCALSTORAGE_KEY = "lessonPlanPendingExports";
type PendingExportJob = {
  jobId: string;
  format: "docx" | "pdf" | "pptx";
  topic: string;
  createdAt: number;
};

// Usage Indicator Component
function UsageIndicator({ usage }: { usage: any }) {
  if (!usage) return null;
  
  const used = usage.used || 0;
  const limit = usage.limit || FREE_PLAN_LIMIT;
  const percentage = Math.min((used / limit) * 100, 100);
  const nextReset = usage.nextReset ? new Date(usage.nextReset) : null;
  
  const getTimeUntilReset = () => {
    if (!nextReset) return "";
    const now = new Date();
    const diffMs = nextReset.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Resets soon";
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `Resets in ${hours}h ${minutes}m`;
  };
  
  return (
    <div className="mt-4 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-blue-700">Free Plan Usage</span>
        </div>
        <span className="text-sm text-blue-600 font-medium bg-white px-2 py-1 rounded">
          {used}/{limit} lesson plans
        </span>
      </div>
      <div className="w-full bg-blue-100 rounded-full h-2.5 mb-2">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ${
            percentage >= 90 ? "bg-red-500" : 
            percentage >= 70 ? "bg-yellow-500" : "bg-linear-to-r from-blue-500 to-indigo-500"
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-blue-600 font-medium">
          {used === limit ? "Limit reached" : `${limit - used} remaining`}
        </span>
        <span className="text-blue-500 font-medium">
          {getTimeUntilReset()}
        </span>
      </div>
    </div>
  );
}

// Enhanced 4A's Phase Component
function FourAsPhaseCard({ phase, index }: { phase: any, index: number }) {
  const getPhaseDetails = (phaseName: string) => {
    switch (phaseName) {
      case "ACTIVITY":
        return {
          icon: <Target className="h-6 w-6 text-white" />,
          gradient: "from-blue-500 to-cyan-500",
          bg: "bg-gradient-to-br from-blue-50 to-cyan-50", // FIXED: bg-gradient-to-br
          border: "border-blue-200",
          text: "text-blue-800",
          title: "Activity",
          subtitle: "Engagement Phase",
          description: "Activate prior knowledge and generate interest"
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
          description: "Develop critical thinking through guided exploration"
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
          description: "Formal presentation of concepts and principles"
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
          description: "Apply knowledge and demonstrate understanding"
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
          description: "Learning activity"
        };
    }
  };

  const details = getPhaseDetails(phase.phase);
  const phaseNumber = index + 1;

  return (
    <div className={`relative p-5 rounded-2xl border-2 ${details.bg} ${details.border} shadow-sm hover:shadow-md transition-shadow duration-300`}>
      {/* Phase Number Badge */}
      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center bg-linear-to-r ${details.gradient} text-white font-bold text-sm shadow-lg`}>
        {phaseNumber}
      </div>
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className={`p-3 rounded-xl bg-linear-to-r ${details.gradient} shadow-md`}>
          {details.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h4 className={`font-bold text-xl ${details.text} mb-1 truncate`}>
                {phase.phase || details.title}
              </h4>
              <p className="text-gray-600 text-sm font-medium">
                {phase.title || details.subtitle}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full border">
                  {phase.timeMinutes || 10} min
                </span>
                <span className="text-xs text-gray-500">-</span>
                <span className="text-xs text-gray-600">Phase {phaseNumber}/4</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-5">
        <p className="text-gray-700 leading-relaxed ">
          {phase.description || details.description}
        </p>
      </div>

      {/* Teacher & Student Roles */}
      <div className="space-y-3 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-red-500" />
              <p className="font-semibold text-red-600 text-sm">Teacher Role</p>
            </div>
            <p className="text-gray-700 text-sm leading-tight">
              {phase.teacherRole || "Facilitator and guide"}
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2 ml-3">
              <Brain className="h-4 w-4 text-blue-500" />
              <p className="font-semibold text-blue-600 text-sm">Student Role</p>
            </div>
            <p className="text-gray-700 text-sm leading-tight">
              {phase.studentRole || "Active participants"}
            </p>
          </div>
        </div>
      </div>

      {/* Materials */}
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

// Specific Activity Component
function SpecificActivityCard({ phase, activity }: { phase: string, activity: any }) {
  const getActivityDetails = (phase: string) => {
    switch (phase) {
      case "ACTIVITY":
        return {
          icon: <BookCheck className="h-6 w-6 text-white" />,
          gradient: "from-blue-500 to-cyan-500",
          bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
          border: "border-blue-200",
          text: "text-blue-800",
          title: "Reading Comprehension",
          subtitle: "Engagement Activity"
        };
      case "ANALYSIS":
        return {
          icon: <SquareCheck className="h-6 w-6 text-white" />,
          gradient: "from-green-500 to-emerald-500",
          bg: "bg-gradient-to-br from-green-50 to-emerald-50",
          border: "border-green-200",
          text: "text-green-800",
          title: "True/False + Checklist",
          subtitle: "Analysis Activities"
        };
      case "ABSTRACTION":
        return {
          icon: <ArrowLeftRight className="h-6 w-6 text-white" />,
          gradient: "from-purple-500 to-violet-500",
          bg: "bg-gradient-to-br from-purple-50 to-violet-50",
          border: "border-purple-200",
          text: "text-purple-800",
          title: "Matching Type",
          subtitle: "Abstraction Activity"
        };
      case "APPLICATION":
        return {
          icon: <FileQuestion className="h-6 w-6 text-white" />,
          gradient: "from-amber-500 to-orange-500",
          bg: "bg-gradient-to-br from-amber-50 to-orange-50",
          border: "border-amber-200",
          text: "text-amber-800",
          title: "MCQ + Identification",
          subtitle: "Application Activities"
        };
      default:
        return {
          icon: <Lightbulb className="h-6 w-6 text-white" />,
          gradient: "from-gray-500 to-slate-500",
          bg: "bg-gradient-to-br from-gray-50 to-slate-50",
          border: "border-gray-200",
          text: "text-gray-800",
          title: "Activity",
          subtitle: "Learning Activity"
        };
    }
  };

  const details = getActivityDetails(phase);

  return (
    <div className={`p-6 rounded-2xl border-2 ${details.bg} ${details.border} shadow-sm`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-xl bg-linear-to-r ${details.gradient} shadow-md`}>
          {details.icon}
        </div>
        <div>
          <h5 className={`font-bold text-xl ${details.text} mb-1`}>
            {activity.type || details.title}
          </h5>
          <p className="text-gray-600 text-sm font-medium">
            {details.subtitle}
          </p>
        </div>
      </div>

      {/* Content based on activity type */}
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
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {activity.readingPassage}
                  </p>
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
            {/* True/False Section */}
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
                      <div className={`mt-2 p-2 rounded-lg border ${
                        tf.answer === "True" 
                          ? "bg-linear-to-r from-green-50 to-emerald-50 border-green-200" 
                          : "bg-linear-to-r from-red-50 to-rose-50 border-red-200"
                      }`}>
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
            
            {/* Checklist Section */}
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
                        <span className="font-medium text-gray-800 bg-purple-50 px-3 py-1.5 rounded-lg">
                          {pair.left}
                        </span>
                        <ArrowRight className="h-4 w-4 text-purple-400 mx-2" />
                        <span className="text-gray-700 bg-white px-3 py-1.5 rounded-lg border">
                          {pair.right}
                        </span>
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
            {/* Multiple Choice Section */}
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
                        {Array.isArray(mc.options) && mc.options.map((opt: string, optIndex: number) => {
                          const isCorrect = mc.answer && opt.startsWith(mc.answer);
                          return (
                            <div key={optIndex} className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isCorrect 
                                  ? "bg-linear-to-r from-green-500 to-emerald-500 text-white" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                <span className="text-xs font-bold">{String.fromCharCode(65 + optIndex)}</span>
                              </div>
                              <p className={`${isCorrect ? "text-green-700 font-semibold" : "text-gray-700"}`}>
                                {opt}
                              </p>
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
            
            {/* Identification Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-amber-500" />
                <h6 className="font-semibold text-gray-800">Identification Exercise</h6>
              </div>
              
              {/* Word Bank */}
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
              
              {/* Clues */}
              {activity.identification?.clues && (
                <div className="space-y-3">
                  {activity.identification.clues.map((clue: string, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-gray-200">
                      <p className="font-medium text-gray-800 mb-2">
                        <span className="text-amber-600 font-bold mr-2">{i + 1}.</span>
                        {clue}
                      </p>
                      {activity.identification.answers && 
                        activity.identification.answers[i] && (
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
      </div>
    </div>
  );
}

// Main Component
export default function LessonPlanPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [formDataObject, setFormDataObject] = useState<any>(null);
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [liteMode, setLiteMode] = useState(false);
  const [pptxDeck, setPptxDeck] = useState<any | null>(null);
  const [pptxDeckSource, setPptxDeckSource] = useState<"lesson_plan" | "lesson_material_upload">(
    "lesson_plan"
  );
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slidesLoadingLabel, setSlidesLoadingLabel] = useState(
    "Preparing editable PPTX slides..."
  );
  const [lessonProgress, setLessonProgress] = useState(0);
  const [slidesProgress, setSlidesProgress] = useState(0);
  const [pptxProgress, setPptxProgress] = useState(0);
  const [pendingExportJobs, setPendingExportJobs] = useState<PendingExportJob[]>([]);
  const [retryingPendingExport, setRetryingPendingExport] = useState(false);
  const [showPptxEditor, setShowPptxEditor] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPlans, setHistoryPlans] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [lessonSources, setLessonSources] = useState<SourceIcon[]>([]);
  const [lessonSourceTrace, setLessonSourceTrace] = useState<{
    mode: "none" | "documents" | "semantic_cache";
    fromCache: boolean;
    sourceCount: number;
  } | null>(null);
  const [lessonMaterialUploadUsage, setLessonMaterialUploadUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
    resetAtMs: number | null;
  } | null>(null);
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());
  const lessonPlanRef = useRef<HTMLDivElement | null>(null);
  const uploadLessonPlanInputRef = useRef<HTMLInputElement | null>(null);
  const lessonFormRef = useRef<HTMLFormElement | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
  const withRequestId = (message: string, payload: any) =>
    payload?.requestId ? `${message} (Ref: ${payload.requestId})` : message;
  const withRequestIdFromText = (fallback: string, text: string) => {
    try {
      const parsed = JSON.parse(text);
      const message = parsed?.error || parsed?.message || fallback;
      return parsed?.requestId ? `${message} (Ref: ${parsed.requestId})` : message;
    } catch {
      return fallback;
    }
  };
  const isPremium = subscriptionPlan === "premium";
  const isFree = subscriptionPlan === "free" || !subscriptionPlan;
  const dedupedHistoryPlans = useMemo(() => {
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const plan of historyPlans) {
      const fingerprint = JSON.stringify({
        title: plan?.title ?? "",
        topic: plan?.topic ?? "",
        subject: plan?.subject ?? "",
        grade: plan?.grade ?? "",
        days: plan?.days ?? "",
        minutesPerDay: plan?.minutesPerDay ?? "",
        data: plan?.data ?? null,
      });
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      unique.push(plan);
    }
    return unique;
  }, [historyPlans]);

  const lessonTemplateDefaults = useMemo(
    () => ({
      topic: searchParams.get("topic") || "",
      subject: searchParams.get("subject") || "",
      grade: searchParams.get("grade") || "",
      days: searchParams.get("days") || "",
      minutesPerDay: searchParams.get("minutesPerDay") || "40",
      objectives: searchParams.get("objectives") || "",
      constraints: searchParams.get("constraints") || "",
    }),
    [searchParams]
  );
  const lessonTemplateKey = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const plan = data?.user?.subscriptionPlan || "free";
        setLiteMode(Boolean(data?.user?.liteMode));
        setSubscriptionPlan(plan);
        if (plan === "free" || !plan) {
          const used = Number(data?.user?.lessonMaterialUploadUsage || 0);
          const limit = 3;
          const resetInSeconds = Number(data?.user?.lessonMaterialUploadResetInSeconds || 0);
          const resetAtMs = resetInSeconds > 0 ? Date.now() + resetInSeconds * 1000 : null;
          setLessonMaterialUploadUsage({
            used,
            limit,
            remaining: Math.max(limit - used, 0),
            resetAtMs,
          });
        } else {
          setLessonMaterialUploadUsage(null);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch("/api/lesson-plans");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.plans)) {
          setHistoryPlans(data.plans);
        }
      } catch {
        // ignore
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
      generationAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!lessonMaterialUploadUsage?.resetAtMs) return;
    const timer = setInterval(() => setCountdownNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lessonMaterialUploadUsage?.resetAtMs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LESSON_EXPORT_LOCALSTORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPendingExportJobs(
          parsed.filter(
            (job: any) =>
              typeof job?.jobId === "string" &&
              (job?.format === "docx" || job?.format === "pdf" || job?.format === "pptx")
          )
        );
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  const persistPendingExportJobs = (jobs: PendingExportJob[]) => {
    setPendingExportJobs(jobs);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LESSON_EXPORT_LOCALSTORAGE_KEY, JSON.stringify(jobs));
    } catch {
      // ignore storage failures
    }
  };

  const addPendingExportJob = (job: PendingExportJob) => {
    const next = [job, ...pendingExportJobs.filter((item) => item.jobId !== job.jobId)].slice(0, 5);
    persistPendingExportJobs(next);
  };

  const removePendingExportJob = (jobId: string) => {
    persistPendingExportJobs(pendingExportJobs.filter((item) => item.jobId !== jobId));
  };

  const downloadCompletedExport = async (
    jobId: string,
    format: "docx" | "pdf" | "pptx",
    topic: string
  ) => {
    const fileRes = await fetch(`/api/lesson-plan-export/${jobId}?download=1`, {
      cache: "no-store",
    });
    if (!fileRes.ok) {
      const text = await fileRes.text();
      throw new Error(withRequestIdFromText("Failed to download ready file", text));
    }

    const blob = await fileRes.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${topic || "lesson_plan"}.${format}`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const pollExportJob = async (
    jobId: string,
    format: "docx" | "pdf" | "pptx",
    topic: string,
    timeoutMs: number
  ) => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const startedAt = Date.now();
    let lastStatus = "queued";

    while (Date.now() - startedAt < timeoutMs) {
      const statusRes = await fetch(`/api/lesson-plan-export/${jobId}`, {
        cache: "no-store",
      });
      const statusData = await statusRes.json().catch(() => ({}));

      if (!statusRes.ok) {
        throw new Error(
          withRequestId(statusData?.error || "Failed to fetch export status", statusData)
        );
      }

      lastStatus = String(statusData?.status || "queued");
      if (lastStatus === "completed") {
        await downloadCompletedExport(jobId, format, topic);
        removePendingExportJob(jobId);
        return;
      }

      if (lastStatus === "failed") {
        removePendingExportJob(jobId);
        throw new Error(withRequestId(statusData?.error || "Export job failed", statusData));
      }

      if (lastStatus === "queued") {
        await fetch("/api/lesson-plan-export/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        }).catch(() => null);
      }

      await sleep(1500);
    }

    addPendingExportJob({
      jobId,
      format,
      topic,
      createdAt: Date.now(),
    });
    setError(null);
    setInfoMessage("Still processing. We kept it running in the background. Click 'Download when ready' to retry.");
  };

  function pauseLessonPlanGeneration() {
    if (!generationAbortRef.current) return;
    generationAbortRef.current.abort();
    generationAbortRef.current = null;
    setLoading(false);
    setLessonProgress(0);
    setError("Generation paused.");
  }

  const getLessonTemplateValues = () => {
    const formData = lessonFormRef.current
      ? Object.fromEntries(new FormData(lessonFormRef.current).entries())
      : {};
    const merged = {
      ...lessonTemplateDefaults,
      ...(formDataObject || {}),
      ...formData,
    } as Record<string, any>;
    return {
      topic: String(merged.topic || "").trim(),
      subject: String(merged.subject || "").trim(),
      grade: String(merged.grade || "").trim(),
      days: String(merged.days || "").trim(),
      minutesPerDay: String(merged.minutesPerDay || "").trim(),
      objectives: String(merged.objectives || "").trim(),
      constraints: String(merged.constraints || "").trim(),
    };
  };

  const buildLessonTemplateUrl = () => {
    if (typeof window === "undefined") return "";
    const values = getLessonTemplateValues();
    if (!values.topic) return "";
    const url = new URL("/lessonPlan", window.location.origin);
    Object.entries(values).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return url.toString();
  };

  const copyLessonTemplateLink = async () => {
    const url = buildLessonTemplateUrl();
    if (!url) {
      setError(null);
      setInfoMessage("Add at least a topic first to create a shareable template link.");
      return;
    }
    await navigator.clipboard.writeText(url);
    setError(null);
    setInfoMessage("Template link copied.");
  };

  const shareLessonTemplateLink = async () => {
    const url = buildLessonTemplateUrl();
    if (!url) {
      setError(null);
      setInfoMessage("Add at least a topic first to create a shareable template link.");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Lesson Plan Template",
          text: "Use this prefilled lesson plan template:",
          url,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await navigator.clipboard.writeText(url);
    setError(null);
    setInfoMessage("Template link copied.");
  };

  useEffect(() => {
    if (!loading) {
      setLessonProgress(0);
      return;
    }
    setLessonProgress(7);
    const id = setInterval(() => {
      setLessonProgress((prev) => {
        if (prev >= 92) return prev;
        return prev + Math.max(1, Math.floor((100 - prev) / 12));
      });
    }, 600);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!loadingSlides) {
      setSlidesProgress(0);
      return;
    }
    setSlidesProgress(10);
    const id = setInterval(() => {
      setSlidesProgress((prev) => {
        if (prev >= 94) return prev;
        return prev + Math.max(1, Math.floor((100 - prev) / 10));
      });
    }, 500);
    return () => clearInterval(id);
  }, [loadingSlides]);

  useEffect(() => {
    if (!downloadingPptx) {
      setPptxProgress(0);
      return;
    }
    setPptxProgress(12);
    const id = setInterval(() => {
      setPptxProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.max(1, Math.floor((100 - prev) / 11));
      });
    }, 500);
    return () => clearInterval(id);
  }, [downloadingPptx]);

  async function generateLessonPlan(formData: FormData) {
    const formObj = Object.fromEntries(formData.entries());
    setFormDataObject(formObj);

    setLoading(true);
    setError(null);
    setLessonPlan(null);
    setUsageInfo(null);
    setLessonSources([]);
    setLessonSourceTrace(null);
    setIsHistoryView(false);

    try {
      generationAbortRef.current?.abort();
      const controller = new AbortController();
      generationAbortRef.current = controller;

      const res = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formObj),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 429) {
          setError(null);
          setInfoMessage(
            withRequestId(
              data?.message ||
                data?.error ||
                "Too many requests. Please wait a moment and try again.",
              data
            )
          );
          return;
        }
        if (res.status === 403 && data.error === "Free limit reached") {
          const resetInSeconds = Number(data?.resetInSeconds || 0);
          const hh = Math.floor(resetInSeconds / 3600);
          const mm = Math.floor((resetInSeconds % 3600) / 60);
          const ss = Math.floor(resetInSeconds % 60);
          const waitTime =
            resetInSeconds > 0
              ? `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
              : "about 3 hours";
          setError(null);
          setInfoMessage(
            withRequestId(
              `Free limit reached. You can generate up to ${FREE_PLAN_LIMIT} lesson plans every 3 hours. Try Pro or Premium now. Please try again in ${waitTime}.`,
              data
            )
          );
          return;
        }
        if (res.status === 403 && data.error === "Premium required") {
          throw new Error(
            withRequestId(
              data.message || "Premium is required for downloads and PPTX generation.",
              data
            )
          );
        }
        throw new Error(
          withRequestId(data.error || data.message || "Failed to generate lesson plan", data)
        );
      }
      
      setLessonPlan(data.lessonPlan);
      setUsageInfo(data.usage);
      setLessonSources(Array.isArray(data.sources) ? data.sources : []);
      setLessonSourceTrace(
        data?.sourceTrace && typeof data.sourceTrace === "object"
          ? {
              mode:
                data.sourceTrace.mode === "documents" ||
                data.sourceTrace.mode === "semantic_cache"
                  ? data.sourceTrace.mode
                  : "none",
              fromCache: Boolean(data.sourceTrace.fromCache),
              sourceCount: Number(data.sourceTrace.sourceCount || 0),
            }
          : null
      );
      setIsHistoryView(false);
      setLessonProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 120));
      
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setError("Generation paused.");
        return;
      }
      setError(err.message || "Failed to generate lesson plan");
    } finally {
      generationAbortRef.current = null;
      setLoading(false);
    }
  }

  async function downloadLessonPlan(format: "docx" | "pdf" | "pptx" = "docx") {
    if (!lessonPlan || !formDataObject) return;

    if (format === "pptx") {
      setDownloadingPptx(true);
    } else if (format === "pdf") {
      setDownloadingPdf(true);
    } else {
      setDownloading(true);
    }

    try {
      if (format === "pptx" && !isPremium) {
        throw new Error("Premium is required to download lesson plan files.");
      }

      const queueRes = await fetch("/api/lesson-plan-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          lessonPlan,
          topic: formDataObject.topic || lessonPlan?.title || "Lesson Plan",
          subject: formDataObject.subject || lessonPlan?.subject || "General",
          grade: formDataObject.grade || lessonPlan?.grade || "General",
          days: Number(formDataObject.days || lessonPlan?.days || 1),
          minutesPerDay: Number(formDataObject.minutesPerDay || lessonPlan?.minutesPerDay || 40),
        }),
      });

      const queueData = await queueRes.json().catch(() => ({}));
      if (!queueRes.ok || !queueData?.jobId) {
        throw new Error(
          withRequestId(queueData?.error || "Failed to queue export job", queueData)
        );
      }

      const jobId = queueData.jobId as string;

      // Trigger processing immediately; this is compatible with future worker/cron setups.
      await fetch("/api/lesson-plan-export/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch(() => null);

      await pollExportJob(
        jobId,
        format,
        String(formDataObject.topic || "lesson_plan"),
        LESSON_EXPORT_POLL_TIMEOUT_MS
      );
    } catch (err: any) {
      console.error("Download error:", err);
      setError(err?.message || "Failed to download.");
    } finally {
      if (format === "pptx") {
        setDownloadingPptx(false);
      } else if (format === "pdf") {
        setDownloadingPdf(false);
      } else {
        setDownloading(false);
      }
    }
  }

  async function downloadLessonPlanPdfFromUi() {
    if (!lessonPlanRef.current || !formDataObject) return;
    setDownloadingPdf(true);
    try {
      const element = lessonPlanRef.current;
      const styles = await collectStyles();
      const renderRoot = element.cloneNode(true) as HTMLElement;
      const tmp = document.createElement("div");
      tmp.id = "lessonplan-pdf-probe";
      tmp.style.position = "fixed";
      tmp.style.left = "-10000px";
      tmp.style.top = "0";
      tmp.style.width = `${element.clientWidth || 1024}px`;
      tmp.style.pointerEvents = "none";
      tmp.style.opacity = "0";
      tmp.appendChild(renderRoot);
      document.body.appendChild(tmp);

      // Dynamic pagination:
      // - keep a day card together when it fits in one A4 content area
      // - allow split only for oversized day cards to prevent clipping
      const approxA4ContentHeightPx = 980;
      renderRoot.querySelectorAll<HTMLElement>(".pdf-day-card").forEach((card) => {
        if (card.scrollHeight > approxA4ContentHeightPx) {
          card.classList.add("pdf-day-card-long");
        }
      });

      const extraCss = `
        <style>
          @page { size: A3; margin: 12mm 10mm; }
          body { background: white; margin: 0; }
          html, body { width: 100%; }
          [data-print-hidden] { display: none !important; }
          [data-pdf-hide] { display: none !important; }
          [data-pdf-only] { display: block !important; }
          [data-page-start] { break-before: page !important; page-break-before: always !important; }
          [data-page-end] { break-after: page !important; page-break-after: always !important; }
          [data-page-keep] { break-inside: avoid-page !important; page-break-inside: avoid !important; }
          [data-page-flow] { break-inside: auto !important; page-break-inside: auto !important; }
          [data-pdf-keep] { break-inside: auto; page-break-inside: auto; }
          .pdf-day-card { break-inside: avoid-page; page-break-inside: avoid; }
          .pdf-day-card-long { break-inside: auto; page-break-inside: auto; }
          /* Strict mode: each major titled section starts on a new page */
          .pdf-section-page {
            break-before: auto;
            page-break-before: auto;
            break-inside: auto;
            page-break-inside: auto;
            min-height: auto;
            display: block;
            padding-top: 0;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
          .pdf-day-card .pdf-section-page:first-of-type {
            break-before: auto;
            page-break-before: auto;
          }
          .pdf-section-title { text-align: center !important; justify-content: center !important; margin-top: 0 !important; }
          .pdf-day-card .mb-10, .pdf-day-card .mt-10, .pdf-day-card .mt-8 { margin-top: 8px !important; margin-bottom: 8px !important; }
          .shadow-2xl, .shadow-xl, .shadow-lg, .shadow, [class*="shadow-"] { box-shadow: none !important; }
          .pdf-header {
            border-bottom: 2px solid #e5e7eb;
            padding: 16px 0 12px;
            margin-bottom: 16px;
          }
          .pdf-header-title { font-size: 20px; font-weight: 700; color: #111827; }
          .pdf-header-meta { font-size: 12px; color: #4b5563; margin-top: 6px; }
          .pdf-summary {
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 12px;
            background: #f8fafc;
          }
          .pdf-summary-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 6px; }
          .pdf-summary-line { font-size: 12px; color: #4b5563; }
          .overflow-hidden { overflow: visible !important; }
          .truncate { overflow: visible !important; text-overflow: clip !important; white-space: normal !important; }
          .text-ellipsis { text-overflow: clip !important; }
          .whitespace-nowrap { white-space: normal !important; }
          .min-w-0 { min-width: 0 !important; }
          .backdrop-blur-sm { backdrop-filter: none !important; }
          .line-clamp-1, .line-clamp-2, .line-clamp-3, .line-clamp-4, .line-clamp-5, .line-clamp-6 {
            display: block !important;
            -webkit-line-clamp: unset !important;
            overflow: visible !important;
          }
          [class*="max-h-"] { max-height: none !important; }
          [class*="overflow-y-"] { overflow-y: visible !important; }
          [class*="overflow-x-"] { overflow-x: visible !important; }
          .flex-wrap { flex-wrap: wrap !important; }
        </style>
      `;

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${formDataObject.topic || "lesson_plan"}</title>
            ${styles}
            ${extraCss}
          </head>
          <body>
            ${renderRoot.outerHTML}
          </body>
        </html>
      `;

      const res = await fetch("/api/lesson-plan-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          title: formDataObject.topic || "lesson_plan",
          pageSize: "A3",
        }),
      });
      if (tmp.parentElement) {
        tmp.parentElement.removeChild(tmp);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formDataObject.topic || "lesson_plan"}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err: any) {
      console.error("PDF UI download error:", err);
      setError(err?.message || "Failed to download PDF.");
    } finally {
      const leftover = document.getElementById("lessonplan-pdf-probe");
      if (leftover?.parentElement) {
        leftover.parentElement.removeChild(leftover);
      }
      setDownloadingPdf(false);
    }
  }

  async function retryPendingExportDownload() {
    if (!pendingExportJobs.length) {
      setError(null);
      setInfoMessage("No pending export found.");
      return;
    }

    const latest = pendingExportJobs[0];
    setRetryingPendingExport(true);
    try {
      await pollExportJob(
        latest.jobId,
        latest.format,
        latest.topic || String(formDataObject?.topic || "lesson_plan"),
        LESSON_EXPORT_POLL_TIMEOUT_MS
      );
    } catch (err: any) {
      setError(err?.message || "Failed to retry export download.");
    } finally {
      setRetryingPendingExport(false);
    }
  }

  async function loadPptxSlidesForEdit() {
    if (!lessonPlan || !formDataObject) return;
    if (!isPremium) {
      setError("Premium is required to edit and download PPTX.");
      return;
    }
    setSlidesLoadingLabel("Preparing editable PPTX slides...");
    setLoadingSlides(true);
    try {
      const res = await fetch("/api/lesson-plan-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonPlan,
          topic: formDataObject.topic,
          subject: formDataObject.subject,
          grade: formDataObject.grade,
          duration: `${formDataObject.days} day(s), ${formDataObject.minutesPerDay} minutes per day`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(withRequestId(data.error || "Failed to generate slides.", data));
      }
      setPptxDeck(data.deck);
      setPptxDeckSource("lesson_plan");
      setShowPptxEditor(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate slides.");
    } finally {
      setLoadingSlides(false);
    }
  }

  function openLessonPlanUploadPicker() {
    if (loadingSlides) return;
    uploadLessonPlanInputRef.current?.click();
  }

  async function handleLessonPlanFileUpload(file: File) {
    if (!file) return;
    setError(null);
    setInfoMessage(null);
    setSlidesLoadingLabel("Parsing uploaded file and generating editable slides...");
    setLoadingSlides(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Do not auto-inject current lesson form inputs into uploaded-file generation.
      // This keeps uploaded-file prompts based on file content unless backend defaults apply.

      const res = await fetch("/api/lesson-material-from-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          setError(null);
          setInfoMessage(
            withRequestId(
              data?.message ||
                data?.error ||
                "Too many requests. Please wait a moment and try again.",
              data
            )
          );
          return;
        }
        if (data?.usage && typeof data.usage === "object") {
          const resetInSeconds = Number(data?.usage?.resetInSeconds || 0);
          const resetAtMs = resetInSeconds > 0 ? Date.now() + resetInSeconds * 1000 : null;
          setLessonMaterialUploadUsage({
            used: Number(data.usage.used || 0),
            limit: Number(data.usage.limit || 3),
            remaining: Number(data.usage.remaining || 0),
            resetAtMs,
          });
        }
        throw new Error(
          withRequestId(
            data?.error || data?.message || "Failed to generate lesson material",
            data
          )
        );
      }

      setPptxDeck(data.deck);
      setPptxDeckSource("lesson_material_upload");
      setShowPptxEditor(true);
      if (data?.usage && typeof data.usage === "object") {
        const resetInSeconds = Number(data?.usage?.resetInSeconds || 0);
        const resetAtMs = resetInSeconds > 0 ? Date.now() + resetInSeconds * 1000 : null;
        setLessonMaterialUploadUsage({
          used: Number(data.usage.used || 0),
          limit: Number(data.usage.limit || 3),
          remaining: Number(data.usage.remaining || 0),
          resetAtMs,
        });
      }
      setInfoMessage("Uploaded lesson plan converted to editable slides.");
    } catch (err: any) {
      setError(err?.message || "Failed to generate lesson material from uploaded file.");
    } finally {
      setLoadingSlides(false);
      if (uploadLessonPlanInputRef.current) {
        uploadLessonPlanInputRef.current.value = "";
      }
    }
  }

  function shouldKeepSpecificActivities(day: any) {
    const activities = day?.specificActivities || {};
    const q1 = Array.isArray(activities?.ACTIVITY?.questions) ? activities.ACTIVITY.questions.length : 0;
    const q2 = Array.isArray(activities?.ANALYSIS?.trueFalse) ? activities.ANALYSIS.trueFalse.length : 0;
    const q3 = Array.isArray(activities?.APPLICATION?.multipleChoice)
      ? activities.APPLICATION.multipleChoice.length
      : 0;
    const q4 = Array.isArray(activities?.APPLICATION?.identification?.clues)
      ? activities.APPLICATION.identification.clues.length
      : 0;
    return q1 + q2 + q3 + q4 <= 12;
  }

  function shouldKeepAssessment(day: any) {
    const count = Array.isArray(day?.assessment) ? day.assessment.length : 0;
    return count <= 2;
  }

  async function downloadEditedPptx() {
    if (!pptxDeck) return;
    setDownloadingPptx(true);
    try {
      const res = await fetch("/api/generate-lesson-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck: pptxDeck, source: pptxDeckSource }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(null);
          setInfoMessage(
            withRequestId(
              data?.message ||
                data?.error ||
                "Too many requests. Please wait a moment and try again.",
              data
            )
          );
          return;
        }
        const text = JSON.stringify(data || {});
        throw new Error(withRequestIdFromText("Failed to generate PPTX", text));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${pptxDeck.title || "Lesson_Plan"}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate PPTX");
    } finally {
      setDownloadingPptx(false);
    }
  }

  async function collectStyles() {
    const styleTags = Array.from(document.querySelectorAll("style"));
    const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];
    const inlineStyles = styleTags.map((s) => s.outerHTML).join("\n");

    const linkedCss: string[] = [];
    for (const link of linkTags) {
      try {
        const href = link.href;
        if (!href) continue;
        const res = await fetch(href);
        if (res.ok) {
          const css = await res.text();
          linkedCss.push(`<style>${css}</style>`);
        }
      } catch {
        // ignore missing stylesheet
      }
    }

    return `${inlineStyles}\n${linkedCss.join("\n")}`;
  }

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (infoMessage) {
      const timer = setTimeout(() => {
        setInfoMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [infoMessage]);

  const isPausedMessage = error?.trim().toLowerCase() === "generation paused.";
  const lessonPlanTourSteps = [
    {
      element: "#lessonplan-topic",
      popover: {
        title: "Set the topic",
        description:
          "Enter the lesson topic first, then fill subject and grade level.",
      },
    },
    {
      element: "#lessonplan-subject",
      popover: {
        title: "Set the subject",
        description: "Add the subject area for this lesson plan.",
      },
    },
    {
      element: "#lessonplan-grade",
      popover: {
        title: "Set the grade",
        description: "Enter the target grade or year level.",
      },
    },
    {
      element: "#lessonplan-days",
      popover: {
        title: "Choose duration",
        description:
          "Set number of days (max 7) and minutes per day to control scope.",
      },
    },
    {
      element: "#lessonplan-minutes",
      popover: {
        title: "Set minutes per day",
        description: "Choose how many minutes each day will cover.",
      },
    },
    {
      element: "#lessonplan-objectives",
      popover: {
        title: "Learning objectives",
        description: "Optional: add target outcomes to guide generation.",
      },
    },
    {
      element: "#lessonplan-constraints",
      popover: {
        title: "Special constraints",
        description: "Optional: add rules, requirements, or limitations.",
      },
    },
    {
      element: "#lessonplan-generate",
      popover: {
        title: "Generate plan",
        description:
          "Click to generate. Use Pause anytime to stop an in-flight request.",
      },
    },
    {
      element: "#lessonplan-copy-template-link",
      popover: {
        title: "Copy template link",
        description:
          "Copy a shareable URL with current lesson inputs prefilled.",
      },
    },
    {
      element: "#lessonplan-share-template-link",
      popover: {
        title: "Share template",
        description:
          "Share your current lesson input template using the device share menu.",
      },
    },
    {
      element: "#lessonplan-upload-file",
      popover: {
        title: "Upload Lesson File",
        description:
          "Upload a lesson plan file (PDF, DOCX, PPTX, XLSX, TXT, CSV, MD) to generate editable slides.",
      },
    },
    {
      element: "#lessonplan-history",
      popover: {
        title: "Recent plans",
        description:
          "Open recent generated plans and reload one instantly.",
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <style jsx global>{`
        @media print {
          html,
          body {
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #lessonplan-print-root,
          #lessonplan-print-root * {
            visibility: visible !important;
          }
          #lessonplan-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          [data-print-hidden] {
            display: none !important;
          }
          [data-page-start] { break-before: page !important; page-break-before: always !important; }
          [data-page-end] { break-after: page !important; page-break-after: always !important; }
          [data-page-keep] { break-inside: avoid-page !important; page-break-inside: avoid !important; }
          [data-page-flow] { break-inside: auto !important; page-break-inside: auto !important; }
          /* Reduce unwanted hard page breaks in browser print */
          #lessonplan-print-root [data-pdf-page],
          #lessonplan-print-root .pdf-day-card,
          #lessonplan-print-root .pdf-section-page {
            break-before: auto !important;
            page-break-before: auto !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          /* Keep visual cards together when possible */
          #lessonplan-print-root .rounded-2xl,
          #lessonplan-print-root .rounded-xl,
          #lessonplan-print-root .border-2 {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
          /* Tighter print spacing to avoid whitespace-driven breaks */
          #lessonplan-print-root .mt-10,
          #lessonplan-print-root .mt-8,
          #lessonplan-print-root .mb-10,
          #lessonplan-print-root .mb-8 {
            margin-top: 10px !important;
            margin-bottom: 10px !important;
          }
        }
      `}</style>
      {!liteMode && <Tour steps={lessonPlanTourSteps} tourId="lessonplan-generator" />}
      {/* Header */}
      <div className="relative text-center pt-12 sm:pt-0">
        <LiteModeBadge className="absolute right-11 top-1 sm:right-14 sm:top-0" />
        <button
          id="lessonplan-history"
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="absolute right-1 top-1 sm:right-0 sm:top-0 inline-flex h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-full border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm transition hover:from-blue-100 hover:to-indigo-100 hover:text-blue-800"
          aria-label="Open recent lesson plans"
          title="Recent lesson plans"
          data-print-hidden
        >
          <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Lesson Plan Generator
        </h1>
        <p className="text-gray-600 text-lg max-w-3xl mx-auto">
          Generate comprehensive lesson plans using the 4A's instructional model with clear separation between pedagogical framework and activity types
        </p>
        
        {/* 4A's Overview Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {[
            { phase: "ACTIVITY", icon: Target, color: "blue", title: "Activity", subtitle: "Engagement Phase", desc: "Activate prior knowledge" },
            { phase: "ANALYSIS", icon: Search, color: "green", title: "Analysis", subtitle: "Exploration Phase", desc: "Develop critical thinking" },
            { phase: "ABSTRACTION", icon: BookOpen, color: "purple", title: "Abstraction", subtitle: "Concept Development", desc: "Present concepts & principles" },
            { phase: "APPLICATION", icon: Zap, color: "amber", title: "Application", subtitle: "Practice & Assessment", desc: "Apply real-world skills" }
          ].map((item, idx) => (
            <div key={idx} className={`p-4 rounded-xl border-2 border-${item.color}-100 bg-linear-to-br from-${item.color}-50 to-white`}>
              <div className="flex items-center justify-center mb-3">
                <div className={`p-3 rounded-lg bg-linear-to-r from-${item.color}-500 to-${item.color}-600`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className={`font-bold text-${item.color}-700 text-center mb-1`}>{item.title}</p>
              <p className="text-sm text-gray-600 text-center mb-2">{item.subtitle}</p>
              <p className="text-xs text-gray-500 text-center">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form Section */}
      <Card className="shadow-xl border-2 border-gray-200 overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4">
          <h2 className="text-xl font-bold text-white text-center">Generate Your Lesson Plan</h2>
        </div>
        <CardContent className="p-6">
          <form
            key={lessonTemplateKey}
            ref={lessonFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              generateLessonPlan(new FormData(e.currentTarget));
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Lesson Topic *
                </label>
                <Input 
                  id="lessonplan-topic"
                  name="topic" 
                  placeholder="e.g., Photosynthesis, World War II, Quadratic Equations" 
                  defaultValue={lessonTemplateDefaults.topic}
                  required 
                  className="h-12 border-2 focus:border-blue-500"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  Subject *
                </label>
                <Input 
                  id="lessonplan-subject"
                  name="subject" 
                  placeholder="e.g., Science, History, Mathematics" 
                  defaultValue={lessonTemplateDefaults.subject}
                  required 
                  className="h-12 border-2 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  Grade Level *
                </label>
                <Input 
                  id="lessonplan-grade"
                  name="grade" 
                  placeholder="e.g., Grade 7, Senior High School" 
                  defaultValue={lessonTemplateDefaults.grade}
                  required 
                  className="h-12 border-2 focus:border-green-500"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Number of Days *
                </label>
                <Input 
                  id="lessonplan-days"
                  name="days" 
                  type="number" 
                  min="1" 
                  max="7" 
                  placeholder="Days" 
                  defaultValue={lessonTemplateDefaults.days}
                  required 
                  className="h-12 border-2 focus:border-amber-500"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-600" />
                  Minutes per Day *
                </label>
                <Input
                  id="lessonplan-minutes"
                  name="minutesPerDay"
                  type="number"
                  min="10"
                  max="120"
                  defaultValue={lessonTemplateDefaults.minutesPerDay}
                  required
                  className="h-12 border-2 focus:border-red-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-indigo-600" />
                Learning Objectives (optional)
              </label>
              <Textarea 
                id="lessonplan-objectives"
                name="objectives" 
                placeholder="Enter specific learning objectives, one per line..."
                defaultValue={lessonTemplateDefaults.objectives}
                className="min-h-30 border-2 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                Special Constraints (optional)
              </label>
              <Textarea 
                id="lessonplan-constraints"
                name="constraints" 
                placeholder="Any specific requirements or constraints..."
                defaultValue={lessonTemplateDefaults.constraints}
                className="min-h-25 border-2 focus:border-gray-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                id="lessonplan-copy-template-link"
                type="button"
                variant="outline"
                onClick={copyLessonTemplateLink}
                className="text-xs"
              >
                <FileText className="mr-1 h-3.5 w-3.5" />
                Copy Template Link
              </Button>
              <Button
                id="lessonplan-share-template-link"
                type="button"
                variant="outline"
                onClick={shareLessonTemplateLink}
                className="text-xs"
              >
                <Share2 className="mr-1 h-3.5 w-3.5" />
                Share Template
              </Button>
              <Button
                id="lessonplan-upload-file"
                type="button"
                variant="outline"
                onClick={openLessonPlanUploadPicker}
                disabled={
                  loadingSlides ||
                  (isFree && (lessonMaterialUploadUsage?.remaining ?? 3) <= 0)
                }
                className="text-xs"
              >
                <FileUp className="mr-1 h-3.5 w-3.5" />
                Upload Lesson Plan File
              </Button>
              <input
                ref={uploadLessonPlanInputRef}
                type="file"
                accept=".txt,.docx,.pdf,.ppt,.pptx,.xlsx,.csv,.md"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleLessonPlanFileUpload(file);
                  }
                }}
              />
            </div>

            {isFree && lessonMaterialUploadUsage && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                File-to-PPTX uploads: {lessonMaterialUploadUsage.used}/{lessonMaterialUploadUsage.limit} used
                {" • "}
                {lessonMaterialUploadUsage.remaining} remaining
                {lessonMaterialUploadUsage.resetAtMs &&
                  lessonMaterialUploadUsage.remaining <= 0 && (
                  <>
                    {" • "}
                    resets in{" "}
                    {(() => {
                      const remainingMs = Math.max(
                        lessonMaterialUploadUsage.resetAtMs - countdownNowMs,
                        0
                      );
                      const hh = Math.floor(remainingMs / (1000 * 60 * 60));
                      const mm = Math.floor(
                        (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
                      );
                      const ss = Math.floor((remainingMs % (1000 * 60)) / 1000);
                      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(
                        ss
                      ).padStart(2, "0")}`;
                    })()}
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-stretch">
              <Button
                id="lessonplan-generate"
                type="submit"
                className="w-full sm:w-auto h-14 text-lg font-bold bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-3" />
                    <span className="text-white">Generating 4A's Lesson Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-3" />
                    <span className="text-white">Generate 4A's Lesson Plan</span>
                  </>
                )}
              </Button>
            {loading && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={pauseLessonPlanGeneration}
                  className="w-full sm:w-auto h-14 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <PauseCircle className="mr-2 h-5 w-5" />
                  Pause
                </Button>
              )}
            </div>
            {loading && (
              <LoadingProgress
                label="Generating lesson plan..."
                percent={lessonProgress}
              />
            )}
            {loadingSlides && !lessonPlan && (
              <LoadingProgress
                label={slidesLoadingLabel || "Preparing lesson material slides..."}
                percent={slidesProgress}
              />
            )}
            {downloadingPptx && !lessonPlan && (
              <LoadingProgress
                label="Generating PPTX file..."
                percent={pptxProgress}
              />
            )}
          </form>

          {infoMessage && (
            <div className="mt-6 p-4 rounded-xl border-2 bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 mt-0.5 text-blue-700" />
                <div>
                  <p className="font-bold text-lg text-blue-900">Info</p>
                  <p className="whitespace-pre-line mt-1 text-blue-800">{infoMessage}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              className={`mt-6 p-4 rounded-xl border-2 ${
                isPausedMessage
                  ? "bg-linear-to-r from-amber-50 to-yellow-50 border-amber-200"
                  : "bg-linear-to-r from-red-50 to-rose-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`h-6 w-6 mt-0.5 ${
                    isPausedMessage ? "text-amber-700" : "text-red-600"
                  }`}
                />
                <div>
                  <p
                    className={`font-bold text-lg ${
                      isPausedMessage ? "text-amber-900" : "text-red-800"
                    }`}
                  >
                    {isPausedMessage ? "Paused" : "Error"}
                  </p>
                  <p
                    className={`whitespace-pre-line mt-1 ${
                      isPausedMessage ? "text-amber-800" : "text-red-700"
                    }`}
                  >
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Lesson Plan */}
      {lessonPlan && (
        <div id="lessonplan-print-root" ref={lessonPlanRef} className="bg-white">
        <Card className="shadow-2xl border-2 border-gray-300 overflow-hidden">
          <div className="bg-linear-to-r from-blue-600 to-purple-600 p-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{lessonPlan.title}</h2>
                <div className="flex items-center gap-4 mt-2 text-blue-100">
                  <span><strong>Grade:</strong> {lessonPlan.grade}</span>
                  <span>-</span>
                  <span><strong>Duration:</strong> {lessonPlan.duration}</span>
                </div>
                {!!lessonSources.length && (
                  <div className="mt-3">
                    <SourceIcons
                      sources={lessonSources}
                      variant="compact"
                      maxCount={6}
                      size={30}
                      className="max-w-full"
                    />
                    {lessonSourceTrace && (
                      <p className="text-xs text-blue-100 mt-1">
                        Sources: {lessonSourceTrace.mode === "documents" ? "Web/Docs retrieval" : lessonSourceTrace.mode === "semantic_cache" ? "Semantic cache" : "None"}
                        {" • "}
                        {lessonSourceTrace.sourceCount} reference{lessonSourceTrace.sourceCount === 1 ? "" : "s"}
                        {lessonSourceTrace.fromCache ? " • cache hit" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={downloadLessonPlanPdfFromUi}
                  disabled={downloadingPdf}
                  variant="default"
                  className="bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg"
                  data-print-hidden
                >
                  {downloadingPdf ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
                
                <Button 
                  onClick={() => downloadLessonPlan("docx")}
                  disabled={downloading}
                  variant="default"
                  className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-semibold shadow-lg"
                  data-print-hidden
                >
                  {downloading ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Download className="mr-2" />
                  )}
                  Download DOCX
                </Button>
                {!!pendingExportJobs.length && (
                  <Button
                    onClick={retryPendingExportDownload}
                    disabled={retryingPendingExport || !pendingExportJobs.length}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    data-print-hidden
                  >
                    {retryingPendingExport ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Download when ready
                  </Button>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                onClick={loadPptxSlidesForEdit}
                disabled={loadingSlides || !isPremium}
                variant="ghost"
                className="text-purple-700 hover:text-purple-800 hover:bg-transparent p-0 h-auto font-semibold underline underline-offset-4 self-start"
                data-print-hidden
              >
                {loadingSlides
                  ? "Preparing PPTX slides..."
                  : !isPremium
                  ? "Premium Only: download pptx lesson material"
                  : "Edit PPTX Before Download"}
              </Button>
            </div>
            {loadingSlides && lessonPlan && (
              <LoadingProgress
                label={slidesLoadingLabel}
                percent={slidesProgress}
              />
            )}
            {downloadingPptx && (
              <LoadingProgress
                label="Generating PPTX file..."
                percent={pptxProgress}
              />
            )}

            {/* Usage Indicator */}
            <div data-pdf-keep>
              {isFree && <UsageIndicator usage={usageInfo} />}
            </div>

            {/* Objectives */}
            {lessonPlan.objectives && lessonPlan.objectives.length > 0 && (
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200" data-pdf-keep>
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Learning Objectives
                </h3>
                <ul className="space-y-3 ml-2">
                  {lessonPlan.objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <span className="text-gray-700 font-medium">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Days */}
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
                {/* Day Header */}
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
                
                {/* 4A's Pedagogical Framework Section */}
                <div className="mb-10 pdf-section-page" data-pdf-keep data-page-keep="1">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="pdf-section-title text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-600" />
                      4A's Pedagogical Framework
                    </h4>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      4 Phases - 10 min each
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {day["4asModel"] && Array.isArray(day["4asModel"]) && 
                      day["4asModel"].map((phase: any, idx: number) => (
                        <FourAsPhaseCard key={idx} phase={phase} index={idx} />
                      ))}
                  </div>
                </div>

                {/* Specific Activities Section */}
                {day.specificActivities && (
                  <div
                    className="mb-10 pdf-section-page"
                    data-pdf-keep
                    {...(shouldKeepSpecificActivities(day)
                      ? { "data-page-keep": "1" }
                      : { "data-page-flow": "1" })}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="pdf-section-title text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-purple-600" />
                        Specific Activity Types
                      </h4>
                      <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        Linked to 4A's Phases
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                      {Object.entries(day.specificActivities).map(([phase, activity]: [string, any]) => (
                        <SpecificActivityCard 
                          key={phase} 
                          phase={phase} 
                          activity={activity} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {(day.differentiation || day.closure) && (
                  <div
                    className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pdf-section-page"
                    data-pdf-keep
                    data-page-keep="1"
                  >
                    {day.differentiation && (
                      <div className="bg-linear-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
                        <h4 className="font-bold text-green-800 text-lg mb-3 flex items-center gap-2">
                          <Users className="h-5 w-5 text-green-600" />
                          Differentiation Strategies
                        </h4>
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                          {day.differentiation}
                        </p>
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

                {/* Assessment/Rubrics */}
                <div
                  className="mt-10 pdf-section-page"
                  data-pdf-keep
                  {...(shouldKeepAssessment(day)
                    ? { "data-page-keep": "1" }
                    : { "data-page-flow": "1" })}
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
                          <p className="text-amber-800 font-bold text-lg">
                            No assessment rubrics provided for this day.
                          </p>
                          <p className="text-amber-700 mt-1">
                            Consider adding assessment criteria to evaluate student learning.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>
      )}

      <Dialog open={showPptxEditor} onOpenChange={setShowPptxEditor}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto premium-scrollbar">
          <DialogHeader>
            <DialogTitle>Edit PPTX Slides</DialogTitle>
          </DialogHeader>
          <div className="text-xs rounded-md border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2">
            Source: {pptxDeckSource === "lesson_material_upload" ? "Uploaded file" : "Generated lesson plan"}
          </div>
          {downloadingPptx && (
            <LoadingProgress
              label="Generating PPTX file..."
              percent={pptxProgress}
            />
          )}
          {pptxDeck && (
            <PptxEditor
              deck={pptxDeck}
              onChange={setPptxDeck}
              onDownload={downloadEditedPptx}
              loading={downloadingPptx}
            />
          )}
        </DialogContent>
      </Dialog>

      {historyOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[1px]"
          onClick={() => setHistoryOpen(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-linear-to-b from-blue-50 via-indigo-50 to-white shadow-2xl border-l border-blue-200 transform transition-transform duration-300 ${
          historyOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-blue-200 bg-linear-to-r from-blue-600 to-purple-600">
          <h3 className="font-semibold text-white">Recent Lesson Plans</h3>
          <button
            onClick={() => setHistoryOpen(false)}
            className="p-2 rounded-md text-white/90 hover:bg-white/15"
            aria-label="Close history panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto h-full">
          {historyLoading && (
            <div className="space-y-3">
              <SkeletonLoading className="h-20 w-full bg-blue-100" />
              <SkeletonLoading className="h-20 w-full bg-blue-100" />
              <SkeletonLoading className="h-20 w-full bg-blue-100" />
            </div>
          )}
          {!historyLoading && dedupedHistoryPlans.length === 0 && (
            <div className="text-sm text-blue-700">
              No lesson plans saved yet.
            </div>
          )}
          {dedupedHistoryPlans.map((plan) => (
            <button
              key={plan.id}
              className="w-full text-left border border-blue-200 bg-white/90 rounded-xl p-3 hover:bg-blue-50 transition"
              onClick={() => {
                setLessonPlan(plan.data);
                setFormDataObject({
                  topic: plan.topic,
                  subject: plan.subject,
                  grade: plan.grade,
                  days: plan.days,
                  minutesPerDay: plan.minutesPerDay,
                });
                const historySources = Array.isArray(plan?.data?.__sources)
                  ? plan.data.__sources
                  : [];
                const historyTrace =
                  plan?.data?.__sourceTrace && typeof plan.data.__sourceTrace === "object"
                    ? {
                        mode:
                          plan.data.__sourceTrace.mode === "documents" ||
                          plan.data.__sourceTrace.mode === "semantic_cache"
                            ? plan.data.__sourceTrace.mode
                            : "none",
                        fromCache: Boolean(plan.data.__sourceTrace.fromCache),
                        sourceCount: Number(plan.data.__sourceTrace.sourceCount || 0),
                      }
                    : null;
                setLessonSources(historySources);
                setLessonSourceTrace(historyTrace);
                setIsHistoryView(true);
                setHistoryOpen(false);
                setPptxDeck(null);
                setPptxDeckSource("lesson_plan");
              }}
            >
              <div className="font-semibold text-blue-900">
                {plan.title || `${plan.topic} - ${plan.subject}`}
              </div>
              <div className="text-xs text-blue-700">
                {plan.topic} - {plan.subject} - {plan.grade}
              </div>
              <div className="text-xs text-blue-600/80 mt-1">
                {new Date(plan.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
          <div className="h-24" />
        </div>
      </aside>
    </div>
  );
}
