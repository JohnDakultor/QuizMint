import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Classroom Workflow Software | QuizMint AI",
  description:
    "QuizMintAI works as classroom workflow software for teachers who need planning, assignments, results tracking, reminders, and follow-up actions in one place.",
  path: "/classroom-workflow-software",
});

export default function ClassroomWorkflowSoftwarePage() {
  return (
    <LandingTemplate
      path="/classroom-workflow-software"
      title="Classroom Workflow Software"
      subtitle="Use QuizMintAI as classroom workflow software for planning, assigning, tracking submissions, reviewing results, and deciding what the class needs next."
      featureTitle="What classroom workflow software should handle"
      features={[
        "Planning and generation that connect directly to class delivery.",
        "Assignments, due dates, reminders, and roster-aware operations in one workflow.",
        "Results review, weak-concept detection, and reteach follow-up after submission.",
        "Reusable class assets that support the next lesson instead of forcing teachers to rebuild everything.",
      ]}
      useCasesTitle="Useful for classroom software needs such as"
      useCases={[
        "Running weekly assessment and follow-up routines across multiple classes",
        "Keeping assignment operations, reminders, and student tracking in one place",
        "Connecting lesson planning to class delivery and post-assessment follow-up",
        "Reducing manual teacher admin work around repeated class workflow",
      ]}
      workflowTitle="Typical classroom software flow"
      workflowSteps={[
        "Start with a class need such as a quiz, lesson, review check, or follow-up task.",
        "Create the material and attach it to classes, rosters, assignments, or classroom routines.",
        "Track who completed the work, who is missing, and what the results say about learning.",
        "Decide on reminders, reteach action, intervention, or reuse from the same software workflow.",
      ]}
      summaryCards={[
        {
          title: "Class Operations",
          body: "Handle assignments, rosters, reminders, and due-date work inside one classroom system.",
        },
        {
          title: "Assessment Follow-Through",
          body: "Go beyond creation and use results to drive the next instructional step.",
        },
        {
          title: "Reusable Process",
          body: "Create a repeatable classroom workflow that gets stronger as teaching assets accumulate.",
        },
      ]}
      lessonPlanUseCases={[
        "Keep lesson planning tied to classroom operations rather than disconnected from delivery.",
        "Use the same classroom software flow to move from planning into assignments and follow-up.",
        "Store lesson and quiz assets where they can be reused in future class cycles.",
      ]}
      quizSamplePrompt="Create a Grade 9 chemistry quiz on balancing equations that fits into my class workflow with assignment tracking and results review."
      lessonPlanSamplePrompt="Create a Grade 9 chemistry lesson plan on balancing equations that fits into classroom workflow software with follow-up checks."
      faq={[
        {
          question: "How is this different from a simple generator app?",
          answer: "Classroom workflow software supports planning, assignments, reminders, results, and follow-up. QuizMintAI includes those layers instead of stopping at generation.",
        },
        {
          question: "Can classroom workflow software help after students submit?",
          answer: "Yes. QuizMintAI supports result review, missing-student tracking, weak-concept follow-up, and intervention workflow after submission.",
        },
      ]}
      ctaText="Open Classroom Workflow"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/student-roster-and-reminders", label: "Student Roster and Reminders" },
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
      ]}
    />
  );
}
