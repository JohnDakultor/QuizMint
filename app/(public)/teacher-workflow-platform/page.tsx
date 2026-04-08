import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Teacher Workflow Platform | QuizMint AI",
  description:
    "Use QuizMintAI as a teacher workflow platform for lesson planning, quiz generation, assignments, class results, follow-up actions, and reusable teaching assets.",
  path: "/teacher-workflow-platform",
});

export default function TeacherWorkflowPlatformPage() {
  return (
    <LandingTemplate
      path="/teacher-workflow-platform"
      title="Teacher Workflow Platform"
      subtitle="QuizMintAI helps teachers move from planning and generation into assignments, results, follow-up, and reusable classroom workflow from one web app."
      featureTitle="What a teacher workflow platform should bring together"
      features={[
        "Quiz generation, lesson planning, and file-assisted creation in one place.",
        "Class, roster, and assignment workflow tied to real teaching activity.",
        "Results review, weak-concept follow-up, and intervention planning inside the same flow.",
        "Reusable teaching assets that stay connected to class history instead of disappearing after one use.",
      ]}
      useCasesTitle="Best fit for teachers who need"
      useCases={[
        "A daily operating system for planning, assigning, and reviewing class work",
        "One place to manage generation, delivery, results, and reteach follow-up",
        "A reusable workflow across many classes, sections, and lessons",
        "AI support that speeds up teacher work instead of replacing teacher judgment",
      ]}
      workflowTitle="Typical teacher workflow platform loop"
      workflowSteps={[
        "Generate a quiz or lesson plan from a topic, prompt, or uploaded material.",
        "Assign the work to a class, roster, or classroom routine and monitor completion.",
        "Review class results, missing students, weak concepts, and follow-up needs.",
        "Launch reteach, intervention, reminders, or reusable next-step assets from the same context.",
      ]}
      summaryCards={[
        {
          title: "One Workflow",
          body: "Keep planning, assignments, results, and follow-up in one system instead of bouncing between separate tools.",
        },
        {
          title: "Teacher Context",
          body: "Use AI to speed up classroom work while keeping classes, rosters, and assignment history attached to every action.",
        },
        {
          title: "Reuse Over Time",
          body: "Build a library of quizzes, lesson plans, and proven follow-up assets that can be reused across future lessons.",
        },
      ]}
      lessonPlanUseCases={[
        "Build lesson plans that stay connected to classes, assignments, and follow-up workflow.",
        "Create quizzes and intervention-ready materials from the same planning context.",
        "Reuse saved lesson plans as classroom assets instead of exporting them into disconnected files.",
      ]}
      quizSamplePrompt="Create a Grade 8 science quiz on ecosystems that I can assign to one class and later review for weak concepts."
      lessonPlanSamplePrompt="Create a 4-day Grade 8 ecosystems lesson plan that fits into one teacher workflow with assignments, follow-up, and reteach actions."
      faq={[
        {
          question: "Is QuizMintAI only a quiz generator?",
          answer: "No. It works as a teacher workflow platform for planning, generation, assignments, results, follow-up, and reusable teaching assets.",
        },
        {
          question: "Why call this a workflow platform?",
          answer: "Because the product supports more than content creation. Teachers can generate, assign, review, reteach, remind, and reuse work from one system.",
        },
      ]}
      ctaText="Open Teacher Workflow Platform"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
        { href: "/classroom-intervention-workflow", label: "Classroom Intervention Workflow" },
      ]}
    />
  );
}
