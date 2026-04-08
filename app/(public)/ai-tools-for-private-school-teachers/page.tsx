import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Tools for Private School Teachers | QuizMint AI",
  description:
    "QuizMintAI gives private school teachers AI tools for quizzes, lesson plans, assignments, class tracking, and teacher workflow across multiple sections and routines.",
  path: "/ai-tools-for-private-school-teachers",
});

export default function AIToolsForPrivateSchoolTeachersPage() {
  return (
    <LandingTemplate
      path="/ai-tools-for-private-school-teachers"
      title="AI Tools for Private School Teachers"
      subtitle="Use QuizMintAI to speed up quiz creation, lesson planning, assignments, results review, and follow-up work across private school classes and sections."
      featureTitle="Why private school teachers use these AI tools"
      features={[
        "Create quizzes and lesson plans quickly for multiple sections and repeated teaching schedules.",
        "Keep assignments, rosters, and reminders tied to real classes instead of scattered documents.",
        "Review results and weak concepts before the next class session without rebuilding materials manually.",
        "Reuse strong teaching assets across sections while keeping classroom workflow organized.",
      ]}
      useCasesTitle="Common private school use cases"
      useCases={[
        "Running the same lesson or quiz flow across several sections",
        "Keeping class routines organized for daily and weekly teaching operations",
        "Turning results into fast reteach or intervention action",
        "Reducing repetitive prep work while preserving quality and consistency",
      ]}
      workflowTitle="Typical private school teacher workflow"
      workflowSteps={[
        "Generate a quiz or lesson plan for the topic you are teaching across one or more sections.",
        "Attach the work to classes, assignments, and roster-based delivery instead of sharing materials manually.",
        "Review missing students, due work, and class performance from the same workflow.",
        "Reuse, reteach, or revise proven materials across future lessons and sections.",
      ]}
      summaryCards={[
        {
          title: "Multi-Section Reuse",
          body: "Keep strong teaching assets ready for reuse when the same content needs to be delivered across different sections.",
        },
        {
          title: "Cleaner Operations",
          body: "Assignments, reminders, and results stay in one workflow instead of living across chats, docs, and spreadsheets.",
        },
        {
          title: "Faster Follow-Up",
          body: "Use class results to decide on reteach or support before the next section needs the lesson.",
        },
      ]}
      lessonPlanUseCases={[
        "Create lesson plans that can be reused and adapted across multiple private school sections.",
        "Keep planning tied to assignments, follow-up tasks, and class context.",
        "Build a reusable school-year library instead of recreating plans from scratch each term.",
      ]}
      quizSamplePrompt="Create a Grade 6 science quiz on ecosystems that I can reuse across three private school sections this week."
      lessonPlanSamplePrompt="Create a 3-day Grade 6 ecosystems lesson plan that I can adapt across several private school sections with one shared workflow."
      faq={[
        {
          question: "Are these AI tools useful for teachers handling multiple sections?",
          answer: "Yes. QuizMintAI is especially useful when teachers need to reuse quizzes, plans, assignments, and follow-up workflow across several classes.",
        },
        {
          question: "Can I keep private school class workflow in one system?",
          answer: "Yes. QuizMintAI supports generation, assignments, results, reminders, and follow-up inside one teacher workflow.",
        },
      ]}
      ctaText="Open AI Tools For Private School Teachers"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/teacher-workflow-platform", label: "Teacher Workflow Platform" },
        { href: "/classroom-workflow-software", label: "Classroom Workflow Software" },
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
      ]}
    />
  );
}
