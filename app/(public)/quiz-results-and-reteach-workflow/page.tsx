import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Quiz Results and Reteach Workflow | QuizMint AI",
  description:
    "Review quiz results, spot weak concepts, identify missing students, and generate reteach follow-up with QuizMintAI.",
  path: "/quiz-results-and-reteach-workflow",
});

export default function QuizResultsAndReteachWorkflowPage() {
  return (
    <LandingTemplate
      path="/quiz-results-and-reteach-workflow"
      title="Quiz Results and Reteach Workflow"
      subtitle="Turn quiz results into teaching action with missing-student tracking, weak concept summaries, and one-click reteach follow-up."
      featureTitle="Results-to-follow-up workflow"
      features={[
        "Review assignment results by class, student, and question difficulty.",
        "See missing students, recent submissions, and hardest questions.",
        "Generate reteach quizzes and follow-up lesson plans from weak areas.",
        "Track intervention history and follow-up impact over time.",
      ]}
      useCasesTitle="Best for"
      useCases={[
        "Responding to low scores before the next class session",
        "Finding which concepts are repeatedly weak across assignments",
        "Building reteach work directly from classroom results",
        "Tracking whether follow-up work actually improved outcomes",
      ]}
      workflowTitle="Typical results and reteach flow"
      workflowSteps={[
        "Open assignment results to review scores, missing students, and hard questions.",
        "Identify weak concepts and which learners need targeted support.",
        "Generate reteach quizzes or follow-up lesson plans from those weak areas.",
        "Track whether the next round of work improved outcomes.",
      ]}
      summaryCards={[
        {
          title: "Weak Concept Detection",
          body: "Use assignment results to see what the class is missing instead of guessing what to reteach.",
        },
        {
          title: "Actionable Follow-Up",
          body: "Launch remediation work directly from the results page rather than starting over in another tool.",
        },
        {
          title: "Measured Improvement",
          body: "Compare follow-up impact over time so interventions become reusable and evidence-based.",
        },
      ]}
      lessonPlanUseCases={[
        "Create follow-up lesson plans from actual weak concepts instead of generic reteach ideas.",
        "Keep intervention history linked to class and assignment results.",
        "Use the same workflow to move from results into new instruction.",
      ]}
      quizSamplePrompt="Create a reteach quiz for Grade 8 science focused on the weak areas from my recent ecosystems assignment, especially food chains and energy flow."
      lessonPlanSamplePrompt="Create a follow-up Grade 8 science lesson plan based on weak quiz performance in ecosystems, especially food chains and energy flow."
      faq={[
        {
          question: "Can I see which questions were hardest?",
          answer: "Yes. QuizMintAI highlights weak concepts, hard questions, missing students, and class-level performance trends.",
        },
        {
          question: "Can I generate reteach work directly from results?",
          answer: "Yes. Teachers can launch reteach quizzes and follow-up lesson plans from the results workflow.",
        },
      ]}
      ctaText="Open Results Workflow"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/classroom-intervention-workflow", label: "Classroom Intervention Workflow" },
        { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
