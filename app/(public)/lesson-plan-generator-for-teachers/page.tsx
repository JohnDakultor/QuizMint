import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Teacher Lesson Planning Workflow | QuizMint AI",
  description:
    "Generate lesson plans, connect them to class workflow, create follow-up quizzes, and keep planning tied to real classroom results.",
  path: "/lesson-plan-generator-for-teachers",
});

export default function LessonPlanGeneratorForTeachersPage() {
  return (
    <LandingTemplate
      path="/lesson-plan-generator-for-teachers"
      title="Teacher Lesson Planning Workflow"
      subtitle="Create lesson plans with objectives, activities, and time blocks, then connect them to classes, follow-up quizzes, and ongoing classroom work."
      featureTitle="Lesson workflow features"
      features={[
        "Generate lesson plans by topic, grade, and instructional framework.",
        "Assign lesson plans to classes as part of your teaching workflow.",
        "Export plans in multiple formats while keeping them in your class history.",
        "Turn lesson plans into follow-up quizzes and intervention actions.",
      ]}
      useCasesTitle="Useful in teacher workflow"
      useCases={[
        "Daily lesson preparation connected to real classes",
        "Weekly unit planning with follow-up assessment",
        "Reteach and recovery planning after quiz results",
        "Curriculum pacing support with saved reusable plans",
      ]}
      workflowTitle="What happens after lesson plan generation"
      workflowSteps={[
        "Generate a lesson plan around the topic, framework, grade, and duration your class needs next.",
        "Keep the plan inside your teacher workspace so it stays connected to classes, assignments, and reusable materials.",
        "Create follow-up quizzes or class work from the same planning context instead of starting over elsewhere.",
        "Return to the plan later when results or intervention needs suggest reteach, revision, or reuse.",
      ]}
      summaryCards={[
        {
          title: "Plan Faster",
          body: "Build a workable lesson structure quickly with objectives, activities, checks, and pacing already in place.",
        },
        {
          title: "Stay In Workflow",
          body: "Keep lesson plans tied to classes, assignments, and saved assets so planning stays connected to daily teaching work.",
        },
        {
          title: "Turn Plans Into Follow-Up",
          body: "Use the same workflow to create quizzes, reteach lessons, and intervention-ready materials from the plan.",
        },
      ]}
      lessonPlanUseCases={[
        "Generate complete lesson plans with daily objectives, activities, assessment, and closure.",
        "Rebuild and iterate previous plans quickly based on class performance and intervention needs.",
        "Export polished lesson plans to PDF, DOCX, and PPTX while keeping them tied to class workflow.",
      ]}
      quizSamplePrompt="Create a 10-item quiz aligned with a Grade 8 lesson on ecosystems using 6 MCQ and 4 true/false questions."
      lessonPlanSamplePrompt="Create a 5-day Grade 8 lesson plan on ecosystems, 40 minutes per day, with 4A phases and differentiated activities."
      faq={[
        {
          question: "Can lesson plans connect to class workflow?",
          answer: "Yes. Lesson plans can be saved, assigned to classes, revisited later, and used to generate follow-up quizzes.",
        },
        {
          question: "Can I generate multi-day plans?",
          answer: "Yes, set your days and per-day duration in the input form, then keep the plan inside your teaching workflow.",
        },
      ]}
      ctaText="Open Lesson Planning Workflow"
      ctaHref="/lessonPlan"
      relatedLinks={[
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
        { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
      ]}
    />
  );
}
