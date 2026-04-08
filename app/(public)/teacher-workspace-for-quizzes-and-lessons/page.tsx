import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Teacher Workspace for Quizzes and Lessons | QuizMint AI",
  description:
    "Use QuizMintAI as a teacher workspace for classes, assignments, lesson plans, quizzes, follow-up actions, and daily teaching operations.",
  path: "/teacher-workspace-for-quizzes-and-lessons",
});

export default function TeacherWorkspaceForQuizzesAndLessonsPage() {
  return (
    <LandingTemplate
      path="/teacher-workspace-for-quizzes-and-lessons"
      title="Teacher Workspace for Quizzes and Lessons"
      subtitle="Keep classes, assignments, results, lesson plans, and follow-up actions inside one teacher workspace instead of scattered tools."
      featureTitle="What the teacher workspace brings together"
      features={[
        "Classes, roster, and assignments in one operating screen.",
        "Quiz generation, lesson planning, and follow-up actions in one flow.",
        "Recent results, due-soon work, and reminder-needed assignments in one workspace.",
        "Library reuse for quizzes, lesson plans, and proven intervention assets.",
      ]}
      useCasesTitle="Useful for teachers who need"
      useCases={[
        "A daily workspace instead of a one-shot generation tool",
        "One place to return to classes, due work, and recent results",
        "Reusable teaching materials across many lessons and sections",
        "A clearer operating system for assessment and follow-up",
      ]}
      workflowTitle="Typical teacher workspace loop"
      workflowSteps={[
        "Start from classes, due-soon work, or recent classroom results.",
        "Generate a quiz or lesson plan only when the workflow actually needs it.",
        "Return to assignments, reminders, and results from the same workspace.",
        "Reuse saved materials and proven follow-up assets across classes.",
      ]}
      summaryCards={[
        {
          title: "Daily Operations",
          body: "See due work, reminders, and recent classroom activity in one place instead of bouncing between isolated tools.",
        },
        {
          title: "Saved Reuse",
          body: "Keep quizzes, lesson plans, and intervention assets in a reusable library tied to the teacher workflow.",
        },
        {
          title: "Next Action Focus",
          body: "Move from planning to assigning to reviewing without rebuilding context on every screen.",
        },
      ]}
      lessonPlanUseCases={[
        "Keep lesson plans as first-class teaching assets inside the same workspace as quizzes and assignments.",
        "Reuse saved lesson plans and connect them to class workflow instead of exporting and losing context.",
        "Turn lesson plans into follow-up quizzes or intervention actions when needed.",
      ]}
      quizSamplePrompt="Create a Grade 9 history quiz on the industrial revolution that I can keep in my teacher workspace and assign to one class this week."
      lessonPlanSamplePrompt="Create a Grade 9 history lesson plan on the industrial revolution that fits into my teacher workspace and can support a follow-up quiz."
      faq={[
        {
          question: "Is this only a generator?",
          answer: "No. QuizMintAI now works as a teacher workspace for planning, assigning, reviewing, and following up on class work.",
        },
        {
          question: "Can I reuse saved teaching materials later?",
          answer: "Yes. The library and workspace help teachers reopen, duplicate, reassign, and reuse quizzes, lesson plans, and follow-up assets.",
        },
      ]}
      ctaText="Open Teacher Workspace"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/classroom-intervention-workflow", label: "Classroom Intervention Workflow" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
