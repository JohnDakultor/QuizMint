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
  ArrowRight, ArrowLeftRight, FileQuestion, SquareCheck,
  FileText, PauseCircle
} from "lucide-react";
import { X } from "lucide-react";
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

const FREE_PLAN_LIMIT = 3;

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
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [formDataObject, setFormDataObject] = useState<any>(null);
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [pptxDeck, setPptxDeck] = useState<any | null>(null);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [lessonProgress, setLessonProgress] = useState(0);
  const [slidesProgress, setSlidesProgress] = useState(0);
  const [pptxProgress, setPptxProgress] = useState(0);
  const [showPptxEditor, setShowPptxEditor] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPlans, setHistoryPlans] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const lessonPlanRef = useRef<HTMLDivElement | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const plan = data?.user?.subscriptionPlan || "free";
        setSubscriptionPlan(plan);
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

  function pauseLessonPlanGeneration() {
    if (!generationAbortRef.current) return;
    generationAbortRef.current.abort();
    generationAbortRef.current = null;
    setLoading(false);
    setLessonProgress(0);
    setError("Generation paused.");
  }

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
        if (res.status === 403 && data.error === "Free limit reached") {
          throw new Error(
            `${data.message || `You've reached your limit of ${FREE_PLAN_LIMIT} lesson plans.`}\n` +
            (data.resetTime ? `Limit resets at: ${new Date(data.resetTime).toLocaleTimeString()}` : "")
          );
        }
        if (res.status === 403 && data.error === "Premium required") {
          throw new Error(data.message || "Premium is required for downloads and PPTX generation.");
        }
        throw new Error(data.error || data.message || "Failed to generate lesson plan");
      }
      
      setLessonPlan(data.lessonPlan);
      setUsageInfo(data.usage);
      setIsHistoryView(false);
      
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

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      if (!isPremium) {
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
        throw new Error(queueData?.error || "Failed to queue export job");
      }

      const jobId = queueData.jobId as string;

      // Trigger processing immediately; this is compatible with future worker/cron setups.
      await fetch("/api/lesson-plan-export/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch(() => null);

      const timeoutMs = 3 * 60 * 1000;
      const startedAt = Date.now();
      let lastStatus = "queued";

      while (Date.now() - startedAt < timeoutMs) {
        const statusRes = await fetch(`/api/lesson-plan-export/${jobId}`, {
          cache: "no-store",
        });
        const statusData = await statusRes.json().catch(() => ({}));

        if (!statusRes.ok) {
          throw new Error(statusData?.error || "Failed to fetch export status");
        }

        lastStatus = String(statusData?.status || "queued");
        if (lastStatus === "completed") {
          const fileRes = await fetch(`/api/lesson-plan-export/${jobId}?download=1`, {
            cache: "no-store",
          });
          if (!fileRes.ok) {
            const text = await fileRes.text();
            throw new Error(text || "Failed to download ready file");
          }

          const blob = await fileRes.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${formDataObject.topic || "lesson_plan"}.${format}`;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
          return;
        }

        if (lastStatus === "failed") {
          throw new Error(statusData?.error || "Export job failed");
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

      throw new Error(`Export timeout (last status: ${lastStatus})`);
    } catch (err: any) {
      console.error("Download error:", err);
      alert(`Failed to download: ${err.message}`);
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
      if (!isPremium) {
        throw new Error("Premium is required to download lesson plan files.");
      }
      const element = lessonPlanRef.current;
      const styles = await collectStyles();
      const targetWidth = Math.max(1024, element.scrollWidth);
      const targetHeight = Math.round(targetWidth * 1.6);

      const extraCss = `
        <style>
          @page { size: ${targetWidth}px ${targetHeight}px; margin: 24px 24px; }
          body { background: white; margin: 0; }
          [data-print-hidden] { display: none !important; }
          [data-pdf-hide] { display: none !important; }
          [data-pdf-only] { display: block !important; }
          [data-pdf-keep] { break-inside: avoid; page-break-inside: avoid; }
          /* Continuous flow: remove forced page starts */
          [data-pdf-page] { break-before: auto; page-break-before: auto; }
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
            ${element.outerHTML}
          </body>
        </html>
      `;

      const res = await fetch("/api/lesson-plan-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          title: formDataObject.topic || "lesson_plan",
          pageWidth: targetWidth,
          pageHeight: targetHeight,
        }),
      });

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
      alert(`Failed to download PDF: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function loadPptxSlidesForEdit() {
    if (!lessonPlan || !formDataObject) return;
    if (!isPremium) {
      setError("Premium is required to edit and download PPTX.");
      return;
    }
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
        throw new Error(data.error || "Failed to generate slides.");
      }
      setPptxDeck(data.deck);
      setShowPptxEditor(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate slides.");
    } finally {
      setLoadingSlides(false);
    }
  }

  async function downloadEditedPptx() {
    if (!pptxDeck) return;
    setDownloadingPptx(true);
    try {
      const res = await fetch("/api/generate-lesson-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck: pptxDeck }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate PPTX");
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
      <Tour steps={lessonPlanTourSteps} tourId="lessonplan-generator" />
      {/* Header */}
      <div className="relative text-center pt-12 sm:pt-0">
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
                  defaultValue="40"
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
                className="min-h-25 border-2 focus:border-gray-500"
              />
            </div>

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
          </form>
          
          {error && (
            <div className="mt-6 p-4 bg-linear-to-r from-red-50 to-rose-50 rounded-xl border-2 border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800 text-lg">
                    {isPausedMessage ? "Paused" : "Error"}
                  </p>
                  <p className="text-red-700 whitespace-pre-line mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Lesson Plan */}
      {lessonPlan && (
        <div ref={lessonPlanRef} className="bg-white">
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
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => downloadLessonPlan("pdf")}
                  disabled={downloadingPdf || !isPremium}
                  variant={!isPremium ? "outline" : "default"}
                  className="bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg"
                  data-print-hidden
                >
                  {downloadingPdf ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {!isPremium ? "Premium Only" : "Download PDF"}
                </Button>
                
                <Button 
                  onClick={() => downloadLessonPlan("docx")}
                  disabled={downloading || !isPremium}
                  variant={!isPremium ? "outline" : "default"}
                  className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-semibold shadow-lg"
                  data-print-hidden
                >
                  {downloading ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Download className="mr-2" />
                  )}
                  {!isPremium ? "Premium Only" : "Download DOCX"}
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-8">
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
                ? "Premium Only: Edit PPTX"
                : "Edit PPTX Before Download"}
            </Button>
            {loadingSlides && (
              <LoadingProgress
                label="Preparing editable PPTX slides..."
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
                className="mt-8 pt-8 border-t-2 border-gray-300 first:border-t-0 first:pt-0"
                data-pdf-page
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
                <div className="mb-10" data-pdf-keep>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
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
                  <div className="mb-10" data-pdf-keep>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
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
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6" data-pdf-keep>
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
                <div className="mt-10" data-pdf-keep>
                  <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
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
                setIsHistoryView(true);
                setHistoryOpen(false);
                setPptxDeck(null);
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
