import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Tools for Tutors | QuizMint AI",
  description:
    "QuizMintAI helps tutors create quizzes, lesson plans, follow-up work, and reusable tutoring workflow with AI-assisted teaching tools.",
  path: "/ai-tools-for-tutors",
});

export default function AIToolsForTutorsPage() {
  return (
    <LandingTemplate
      path="/ai-tools-for-tutors"
      title="AI Tools for Tutors"
      subtitle="Use QuizMintAI to create quizzes, lesson plans, follow-up checks, and reusable tutoring workflow for individual students or small groups."
      featureTitle="What tutors need from AI tools"
      features={[
        "Build quick quizzes and lesson plans for one-on-one or small-group tutoring sessions.",
        "Reuse proven prompts, lesson flow, and review checks across similar learners.",
        "Track weak concepts and follow-up needs after students complete practice work.",
        "Keep tutoring materials, assignments, and reteach workflow in one system.",
      ]}
      useCasesTitle="Best for tutoring work such as"
      useCases={[
        "Weekly mastery checks for recurring tutoring sessions",
        "Creating personalized follow-up work after practice quizzes",
        "Saving time on repeat prep across many students",
        "Keeping a more organized tutoring workflow with reusable assets",
      ]}
      workflowTitle="Typical tutor workflow"
      workflowSteps={[
        "Generate a quiz, lesson outline, or practice set around the learner's current weak area.",
        "Assign or share the work and keep it connected to the tutoring workflow instead of separate files.",
        "Review what the student missed, what improved, and what should be revisited next.",
        "Reuse the best tutoring assets and follow-up routines across similar students.",
      ]}
      summaryCards={[
        {
          title: "Personalized Prep",
          body: "Create targeted materials quickly without rebuilding everything from scratch for every tutoring session.",
        },
        {
          title: "Weak Area Focus",
          body: "Use results and follow-up prompts to decide what concept the learner needs next.",
        },
        {
          title: "Reusable Tutoring Workflow",
          body: "Build a repeatable system for prep, practice, review, and reteach across many learners.",
        },
      ]}
      lessonPlanUseCases={[
        "Create tutoring lesson plans that stay connected to quizzes and follow-up work.",
        "Use lesson plans as repeatable teaching templates for similar student needs.",
        "Turn weak-topic review into clearer next-session plans without starting over.",
      ]}
      quizSamplePrompt="Create a 10-item algebra quiz for a tutoring student who struggles with solving two-step equations."
      lessonPlanSamplePrompt="Create a 2-session tutoring lesson plan on two-step equations with practice checks and reteach follow-up."
      faq={[
        {
          question: "Can tutors use QuizMintAI without running a full classroom?",
          answer: "Yes. The workflow is useful for individual tutoring, small groups, and recurring learner support, not only traditional classrooms.",
        },
        {
          question: "Can I reuse tutoring materials later?",
          answer: "Yes. QuizMintAI helps tutors build reusable quizzes, lesson plans, and follow-up assets over time.",
        },
      ]}
      ctaText="Open AI Tools For Tutors"
      ctaHref="/generate-quiz"
      relatedLinks={[
        { href: "/ai-tools-for-teachers", label: "AI Tools for Teachers" },
        { href: "/quiz-generator-for-teachers", label: "Quiz Generator for Teachers" },
        { href: "/lesson-plan-generator-for-teachers", label: "Lesson Plan Generator for Teachers" },
        { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
      ]}
    />
  );
}
