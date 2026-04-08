import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Tools for Teachers in the Middle East | QuizMint AI",
  description:
    "Explore QuizMintAI as AI tools for teachers in the Middle East, including quizzes, lesson plans, class assignments, results review, and follow-up workflow.",
  path: "/ai-tools-for-teachers-middle-east",
});

export default function AIToolsForTeachersMiddleEastPage() {
  return (
    <LandingTemplate
      path="/ai-tools-for-teachers-middle-east"
      title="AI Tools for Teachers in the Middle East"
      subtitle="QuizMintAI helps teachers in the Middle East use AI for planning, quiz generation, lesson delivery, assignments, results review, and classroom follow-up."
      featureTitle="What matters for AI tools in the region"
      features={[
        "AI-assisted quiz and lesson generation that supports real teacher workflow.",
        "Assignments, reminders, and class tracking that keep digital teaching work organized.",
        "Results review and follow-up action instead of stopping at content creation.",
        "Reusable teaching assets for repeated class and term-level routines.",
      ]}
      useCasesTitle="Regional use cases this supports"
      useCases={[
        "Teachers looking for AI support across the full planning-to-follow-up workflow",
        "Private schools, tutors, and training teams using digital teaching tools",
        "Teams that want one product for generation, assignments, and results review",
        "Educators who need a workflow-oriented AI tool instead of a novelty generator",
      ]}
      workflowTitle="How AI tools become teacher workflow in the Middle East"
      workflowSteps={[
        "Create quizzes, lesson plans, or follow-up materials from classroom topics and teaching needs.",
        "Attach them to assignments, classes, and reminders so the workflow stays organized.",
        "Review results, missing work, and weak concepts after students complete the task.",
        "Reuse or revise the best materials for future lessons, classes, or support work.",
      ]}
      summaryCards={[
        {
          title: "More Than Generation",
          body: "The strongest value comes from planning, assignments, results, and follow-up in one workflow rather than isolated AI outputs.",
        },
        {
          title: "Regional Fit",
          body: "The page is framed around digital teaching operations, private education, tutoring, and reusable class workflow in the region.",
        },
        {
          title: "Compounding Value",
          body: "Every quiz, plan, and follow-up asset becomes more useful when it stays inside one teacher workflow over time.",
        },
      ]}
      lessonPlanUseCases={[
        "Create lesson plans that remain tied to assignments and classroom follow-up workflow.",
        "Build reusable assets that work across repeated class cycles and subject areas.",
        "Use one AI-assisted teaching flow for planning, delivery, review, and reteach support.",
      ]}
      quizSamplePrompt="Create a Grade 9 math quiz on linear equations that supports class assignment, results review, and follow-up workflow in the Middle East."
      lessonPlanSamplePrompt="Create a 3-day Grade 9 lesson plan on linear equations with assessment checks and follow-up workflow for teachers in the Middle East."
      faq={[
        {
          question: "Are these AI tools positioned as a workflow product for the Middle East?",
          answer: "Yes. The value is framed around teacher workflow, digital class operations, and reusable teaching assets rather than one-off generation only.",
        },
        {
          question: "Who is this regional page best for?",
          answer: "It is best for teachers, private schools, tutors, and training teams looking for AI-assisted teaching workflow in the region.",
        },
      ]}
      ctaText="Open AI Tools For Teachers"
      ctaHref="/generate-quiz"
      relatedLinks={[
        { href: "/ai-tools-for-teachers", label: "AI Tools for Teachers" },
        { href: "/teacher-workflow-software-saudi-arabia", label: "Teacher Workflow Software in Saudi Arabia" },
        { href: "/teacher-workflow-platform", label: "Teacher Workflow Platform" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
