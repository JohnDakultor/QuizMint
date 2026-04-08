import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Teacher Quiz Workflow Platform | QuizMint AI",
  description:
    "Generate quizzes, assign them to classes, track submissions, review results, and launch reteach follow-up with QuizMintAI.",
  path: "/quiz-generator-for-teachers",
});

export default function QuizGeneratorForTeachersPage() {
  return (
    <LandingTemplate
      path="/quiz-generator-for-teachers"
      title="Teacher Quiz Workflow Platform"
      subtitle="Create quizzes quickly, assign them to classes, track missing students, and launch follow-up actions from one teacher workflow."
      featureTitle="Teacher workflow benefits"
      features={[
        "Generate quizzes by grade, subject, and class need.",
        "Assign quizzes directly to classes and student rosters.",
        "Track submissions, missing students, and assignment results.",
        "Launch reteach quizzes and follow-up lesson plans from performance data.",
      ]}
      useCasesTitle="Common teacher workflow use"
      useCases={[
        "Daily formative checks across multiple sections",
        "Weekly quizzes tied to real classes and rosters",
        "Result-driven remediation and reteach follow-up",
        "Reusable assignment workflows for recurring lessons",
      ]}
      workflowTitle="What happens after quiz generation"
      workflowSteps={[
        "Generate a quiz around a grade level, topic, or weak concept you need to check quickly.",
        "Assign the quiz to a class, roster, or specific classroom workflow instead of treating it as a standalone file.",
        "Review submissions, missing students, hardest questions, and class results after students complete the work.",
        "Launch reteach quizzes, follow-up lesson plans, or intervention actions from the same workflow.",
      ]}
      summaryCards={[
        {
          title: "Generate Fast",
          body: "Start with a quiz prompt, topic, or uploaded material so the first draft is ready quickly.",
        },
        {
          title: "Assign In Context",
          body: "Move the generated quiz into classes, rosters, and assignment tracking instead of losing it as a one-off asset.",
        },
        {
          title: "Act On Results",
          body: "Use the same platform to review outcomes, identify weak concepts, and launch reteach follow-up.",
        },
      ]}
      lessonPlanUseCases={[
        "Build lesson plans that connect directly to quiz follow-up and class interventions.",
        "Align generated quizzes with your lesson outcomes for clearer assessment loops.",
        "Export teacher-ready lesson plans to PDF, DOCX, or PPTX and keep them inside the same workflow.",
      ]}
      quizSamplePrompt="Create a 15-item Grade 8 history quiz on the industrial revolution with mixed MCQ, true/false, and fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 4-day Grade 8 history lesson plan on the industrial revolution, 40 minutes per day, with assessments and differentiation."
      faq={[
        {
          question: "Can I assign generated quizzes to a class?",
          answer: "Yes. QuizMintAI supports class-linked assignments, roster email delivery, and student submission tracking.",
        },
        {
          question: "Can I follow up after students submit?",
          answer: "Yes. You can review results, identify missing students, and launch reteach quizzes or follow-up lesson plans.",
        },
      ]}
      ctaText="Open Teacher Quiz Workflow"
      ctaHref="/generate-quiz"
      relatedLinks={[
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
        { href: "/classroom-intervention-workflow", label: "Classroom Intervention Workflow" },
      ]}
    />
  );
}
