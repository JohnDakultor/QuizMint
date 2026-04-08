import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Teacher Workflow Software in Saudi Arabia | QuizMint AI",
  description:
    "QuizMintAI can be used as teacher workflow software in Saudi Arabia for lesson planning, quiz generation, assignments, class results, and follow-up workflow.",
  path: "/teacher-workflow-software-saudi-arabia",
});

export default function TeacherWorkflowSoftwareSaudiArabiaPage() {
  return (
    <LandingTemplate
      path="/teacher-workflow-software-saudi-arabia"
      title="Teacher Workflow Software in Saudi Arabia"
      subtitle="QuizMintAI helps teachers in Saudi Arabia move from quiz and lesson generation into assignments, results review, and follow-up workflow inside one web app."
      featureTitle="Where this fits teacher workflow in Saudi Arabia"
      features={[
        "Quiz and lesson-plan generation that speeds up planning and classroom preparation.",
        "Assignments, results, reminders, and follow-up workflow in one product flow.",
        "Reusable teaching assets for teachers handling repeated class and subject routines.",
        "A workflow model that supports digital teaching operations instead of one-off file generation.",
      ]}
      useCasesTitle="Best fit for use cases such as"
      useCases={[
        "Private school and international school teacher workflow",
        "Teachers who need Arabic- or English-ready planning and assessment flow",
        "Teams that want one system for generation, assignments, and follow-up",
        "Educators looking for digital teaching workflow instead of isolated generator tools",
      ]}
      workflowTitle="Typical workflow for teachers in Saudi Arabia"
      workflowSteps={[
        "Generate a quiz or lesson plan for the class topic, subject, or weak area you need next.",
        "Attach the work to a class, assignment, or follow-up routine instead of leaving it as a separate document.",
        "Review student results, missing work, and weak concepts from the same workflow.",
        "Reuse strong assets and launch reteach or intervention actions for the next class session.",
      ]}
      summaryCards={[
        {
          title: "Digital Teaching Workflow",
          body: "Move beyond isolated generator tools and keep teaching activity connected from planning into follow-up.",
        },
        {
          title: "Reusable Assets",
          body: "Save quizzes, lesson plans, and follow-up materials for reuse across repeated class needs.",
        },
        {
          title: "Operational Support",
          body: "Assignments, results, reminders, and next-step teaching actions stay tied together in one product flow.",
        },
      ]}
      lessonPlanUseCases={[
        "Create lesson plans that stay connected to class workflow and follow-up needs.",
        "Use the same topic pipeline for lessons, quizzes, and intervention-ready work.",
        "Keep reusable teaching materials inside one system instead of scattered exports.",
      ]}
      quizSamplePrompt="Create a Grade 8 science quiz on ecosystems that fits a teacher workflow for class assignment and results review in Saudi Arabia."
      lessonPlanSamplePrompt="Create a 4-day Grade 8 ecosystems lesson plan that supports planning, assignment, and follow-up workflow in Saudi Arabia."
      faq={[
        {
          question: "Why does this page focus on teacher workflow software in Saudi Arabia?",
          answer: "Because the strongest value is not only quiz generation. The product supports planning, assignments, results, follow-up, and reusable teaching workflow in one system.",
        },
        {
          question: "Is this page meant for real localized use, not just a country keyword swap?",
          answer: "Yes. The positioning is based on teacher workflow, digital teaching operations, and reusable planning and assessment flow relevant to the region.",
        },
      ]}
      ctaText="Open Teacher Workflow Software"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/teacher-workflow-platform", label: "Teacher Workflow Platform" },
        { href: "/ai-tools-for-teachers-middle-east", label: "AI Tools for Teachers in the Middle East" },
        { href: "/ai-tools-for-private-school-teachers", label: "AI Tools for Private School Teachers" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
