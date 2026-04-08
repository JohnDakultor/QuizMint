import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Teacher Workflow for Training Centers | QuizMint AI",
  description:
    "Use QuizMintAI as a teacher workflow platform for training centers, review centers, and structured teaching teams that need quizzes, lesson plans, assignments, and follow-up workflow.",
  path: "/teacher-workflow-for-training-centers",
});

export default function TeacherWorkflowForTrainingCentersPage() {
  return (
    <LandingTemplate
      path="/teacher-workflow-for-training-centers"
      title="Teacher Workflow for Training Centers"
      subtitle="QuizMintAI helps training centers and structured teaching teams run planning, quizzes, assignments, review, and follow-up in one workflow."
      featureTitle="What training centers need from workflow software"
      features={[
        "Fast quiz and lesson generation for repeated cohorts and programs.",
        "Assignment workflow that supports reminders, class organization, and tracking.",
        "Results review and follow-up steps that help instructors adjust quickly.",
        "Reusable teaching assets that can support repeat cycles across different groups.",
      ]}
      useCasesTitle="Useful for training center workflow such as"
      useCases={[
        "Running repeated assessment and review cycles for new learner cohorts",
        "Keeping instructors aligned on lesson prep and follow-up routines",
        "Reducing manual prep work for centers with repeated programs or modules",
        "Turning class performance into structured next-step teaching action",
      ]}
      workflowTitle="Typical training center workflow"
      workflowSteps={[
        "Create quizzes, lesson plans, or review materials for a program module or upcoming session.",
        "Deliver the work through a class or roster-based workflow and monitor completion.",
        "Review performance, weak areas, and missing work from the same system.",
        "Reuse the best assets and follow-up sequences when the next cohort reaches the same module.",
      ]}
      summaryCards={[
        {
          title: "Repeatable Delivery",
          body: "Centers can reuse strong assets across repeated program cycles instead of rebuilding materials each time.",
        },
        {
          title: "Instructor Workflow",
          body: "Planning, assignments, results, and follow-up stay organized inside one shared product model.",
        },
        {
          title: "Operational Clarity",
          body: "Teams can track what was assigned, what was completed, and what needs follow-up without manual sprawl.",
        },
      ]}
      lessonPlanUseCases={[
        "Create repeatable lesson plans that support multi-cohort training delivery.",
        "Keep lesson plans connected to assignments, quizzes, and follow-up support.",
        "Use the same workflow to refine materials after each cohort completes the module.",
      ]}
      quizSamplePrompt="Create a review-center quiz on workplace safety basics that we can reuse across several learner cohorts."
      lessonPlanSamplePrompt="Create a 3-session training-center lesson plan on workplace safety with checks for understanding and follow-up review."
      faq={[
        {
          question: "Is QuizMintAI useful for training centers and review centers?",
          answer: "Yes. The workflow is useful anywhere instructors need repeatable teaching assets, assignments, results review, and follow-up operations.",
        },
        {
          question: "Can teams reuse assets across future cohorts?",
          answer: "Yes. Reuse is one of the strongest workflow advantages for training centers that run repeated programs.",
        },
      ]}
      ctaText="Open Training Center Workflow"
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
