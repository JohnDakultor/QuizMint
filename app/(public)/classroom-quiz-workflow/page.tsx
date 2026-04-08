import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Classroom Quiz Workflow for Teachers | QuizMint AI",
  description:
    "Run a full classroom quiz workflow with QuizMintAI: generate quizzes, assign them to classes, track submissions, and launch follow-up actions.",
  path: "/classroom-quiz-workflow",
});

export default function ClassroomQuizWorkflowPage() {
  return (
    <LandingTemplate
      path="/classroom-quiz-workflow"
      title="Classroom Quiz Workflow for Teachers"
      subtitle="Move from quiz generation to class assignment, student submissions, and follow-up actions without leaving one platform."
      featureTitle="What the classroom quiz workflow includes"
      features={[
        "Generate quizzes by subject, grade, and class need.",
        "Assign quizzes directly to a class instead of copying links manually.",
        "Track missing students and recent submissions in one workflow.",
        "Launch reteach quizzes and follow-up lesson plans from results.",
      ]}
      useCasesTitle="Where this workflow helps most"
      useCases={[
        "Daily formative checks tied to real classes",
        "Weekly quizzes across multiple sections",
        "Post-lesson mastery checks with direct follow-up",
        "Reusable assignment flows for recurring classroom routines",
      ]}
      workflowTitle="Typical classroom quiz flow"
      workflowSteps={[
        "Generate a quiz for a specific grade, topic, or class need.",
        "Assign it directly to a class and share it with rostered students.",
        "Review submissions, missing students, and hardest questions.",
        "Launch reteach follow-up from the actual results.",
      ]}
      summaryCards={[
        {
          title: "Before Class",
          body: "Create a ready-to-assign quiz instead of building assessments manually from scratch.",
        },
        {
          title: "During Delivery",
          body: "Track which class the quiz belongs to and who still has not submitted.",
        },
        {
          title: "After Submission",
          body: "Use results to decide whether to reteach, remind, or move forward.",
        },
      ]}
      lessonPlanUseCases={[
        "Keep lesson plans and quizzes aligned inside the same teaching workflow.",
        "Turn weak quiz outcomes into follow-up lesson plans or reteach work.",
        "Reuse the same classroom workflow across topics and sections.",
      ]}
      quizSamplePrompt="Create a 12-item Grade 9 science quiz on ecosystems, then assign it to my class and emphasize food chains and energy transfer."
      lessonPlanSamplePrompt="Create a follow-up 2-day Grade 9 lesson plan on ecosystems focused on weak quiz areas around food chains and energy transfer."
      faq={[
        {
          question: "Can I assign the generated quiz to a class?",
          answer: "Yes. QuizMintAI supports class-linked quiz assignments and student submission tracking.",
        },
        {
          question: "Can I act on quiz results after students submit?",
          answer: "Yes. You can review results, identify missing students, and launch follow-up actions like reteach quizzes or lesson plans.",
        },
      ]}
      ctaText="Start Classroom Quiz Workflow"
      ctaHref="/generate-quiz"
      relatedLinks={[
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
