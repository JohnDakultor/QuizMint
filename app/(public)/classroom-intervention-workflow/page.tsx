import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Classroom Intervention Workflow | QuizMint AI",
  description:
    "Use QuizMintAI for classroom intervention workflow: identify weak concepts, group support needs, launch reteach actions, and track follow-up impact.",
  path: "/classroom-intervention-workflow",
});

export default function ClassroomInterventionWorkflowPage() {
  return (
    <LandingTemplate
      path="/classroom-intervention-workflow"
      title="Classroom Intervention Workflow"
      subtitle="Use performance data, adaptive follow-up, and intervention review to decide what your class needs next."
      featureTitle="Intervention workflow capabilities"
      features={[
        "Group students by support level and identify recurring weaknesses.",
        "Launch reteach bundles and recovery follow-up from real results.",
        "Summarize intervention steps for class, assignment, and workspace views.",
        "Track whether post-intervention work improved scores and reduced missing submissions.",
      ]}
      useCasesTitle="What this helps teachers do"
      useCases={[
        "Decide which concept needs reteaching first",
        "Identify which students need intensive or targeted support",
        "Turn results into adaptive follow-up plans",
        "Reuse interventions that proved effective in similar classes",
      ]}
      workflowTitle="Typical intervention workflow"
      workflowSteps={[
        "Review class and assignment performance trends to spot repeated weaknesses.",
        "Group students by support level and identify who needs the most help.",
        "Launch reteach bundles, recovery work, or follow-up lessons from those signals.",
        "Review impact later to see whether the intervention actually helped.",
      ]}
      summaryCards={[
        {
          title: "Support Grouping",
          body: "Move from broad class averages into clearer support bands for intensive, targeted, or monitor follow-up.",
        },
        {
          title: "Intervention Bundles",
          body: "Launch recovery or reteach actions from the same workflow instead of assembling them manually.",
        },
        {
          title: "Proven Follow-Up",
          body: "Keep track of which interventions worked well enough to reuse with confidence later.",
        },
      ]}
      lessonPlanUseCases={[
        "Generate follow-up lesson plans that target weak concepts revealed by class results.",
        "Keep intervention history and teacher notes tied to the same class workflow.",
        "Move from performance review into the next lesson with clearer evidence.",
      ]}
      quizSamplePrompt="Create a recovery quiz for Grade 8 science based on recurring weak concepts from recent assignments, with scaffolded support."
      lessonPlanSamplePrompt="Create an intervention lesson plan for Grade 8 science focused on recurring weak concepts and targeted reteach steps."
      faq={[
        {
          question: "Can QuizMintAI help me decide what to reteach?",
          answer: "Yes. The intervention workflow highlights weak concepts, support bands, follow-up actions, and later impact signals.",
        },
        {
          question: "Can I track whether the intervention helped?",
          answer: "Yes. QuizMintAI surfaces follow-up impact and intervention review so teachers can see whether scores improved afterward.",
        },
      ]}
      ctaText="Open Intervention Workflow"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
