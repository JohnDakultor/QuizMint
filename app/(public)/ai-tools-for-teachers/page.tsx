import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Tools for Teachers | QuizMint AI",
  description:
    "Explore AI tools for teachers in QuizMintAI, including quiz generation, lesson planning, assignments, results review, classroom follow-up, and teacher workflow support.",
  path: "/ai-tools-for-teachers",
});

export default function AIToolsForTeachersPage() {
  return (
    <LandingTemplate
      path="/ai-tools-for-teachers"
      title="AI Tools for Teachers"
      subtitle="QuizMintAI gives teachers AI tools that support planning, quiz generation, assignments, results review, and classroom follow-up inside one workflow."
      featureTitle="What teachers need from AI tools"
      features={[
        "Fast quiz and lesson-plan generation from prompts, topics, and uploaded files.",
        "Assignments, classes, and rosters that keep generated work tied to real classroom delivery.",
        "Result summaries, weak-concept detection, and follow-up recommendations after students submit.",
        "Reusable teaching assets that compound value instead of disappearing after one output.",
      ]}
      useCasesTitle="Use AI tools for teaching work such as"
      useCases={[
        "Building classroom quizzes faster without losing quality control",
        "Creating lesson plans that stay connected to assignments and follow-up",
        "Turning student performance into reteach or intervention action",
        "Running class workflow with fewer manual admin steps",
      ]}
      workflowTitle="How AI tools become classroom workflow"
      workflowSteps={[
        "Use AI to create the first draft of a quiz, lesson plan, or follow-up material.",
        "Attach that output to a class, assignment, or roster instead of leaving it as an isolated document.",
        "Review what students completed, where they struggled, and what should happen next.",
        "Reuse, revise, or reteach from the same workflow instead of restarting every time.",
      ]}
      summaryCards={[
        {
          title: "Speed",
          body: "Teachers get to a usable first draft faster with AI-assisted generation and file-based creation.",
        },
        {
          title: "Context",
          body: "Outputs stay tied to class workflow so AI-generated work remains useful after the first click.",
        },
        {
          title: "Follow-Through",
          body: "The same platform supports review, follow-up, reminders, and intervention instead of stopping at creation.",
        },
      ]}
      lessonPlanUseCases={[
        "Generate lesson plans that support classroom delivery, assignment workflow, and later reteach decisions.",
        "Turn the same topic pipeline into quizzes, lessons, and follow-up work without rebuilding context.",
        "Keep AI-generated materials in one reusable teacher library.",
      ]}
      quizSamplePrompt="Create a 12-item Grade 7 math quiz on fractions with a mix of MCQ and short-answer questions, then prepare it for class assignment."
      lessonPlanSamplePrompt="Create a 3-day Grade 7 fractions lesson plan with clear objectives, checks for understanding, and follow-up quiz alignment."
      faq={[
        {
          question: "What AI tools for teachers does QuizMintAI include?",
          answer: "QuizMintAI includes quiz generation, lesson-plan generation, class assignments, results review, follow-up workflow, and reusable teaching assets.",
        },
        {
          question: "Are the AI tools separate products?",
          answer: "No. The value comes from keeping the AI tools inside one teacher workflow instead of scattering them across separate apps.",
        },
      ]}
      ctaText="Open AI Tools For Teachers"
      ctaHref="/generate-quiz"
      relatedLinks={[
        { href: "/teacher-workflow-platform", label: "Teacher Workflow Platform" },
        { href: "/quiz-generator-for-teachers", label: "Quiz Generator for Teachers" },
        { href: "/lesson-plan-generator-for-teachers", label: "Lesson Plan Generator for Teachers" },
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
      ]}
    />
  );
}
