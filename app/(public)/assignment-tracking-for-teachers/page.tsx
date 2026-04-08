import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Assignment Tracking for Teachers | QuizMint AI",
  description:
    "Track class assignments, due dates, missing students, reminder status, and assignment operations with QuizMintAI.",
  path: "/assignment-tracking-for-teachers",
});

export default function AssignmentTrackingForTeachersPage() {
  return (
    <LandingTemplate
      path="/assignment-tracking-for-teachers"
      title="Assignment Tracking for Teachers"
      subtitle="Keep quizzes and lesson-linked assignments connected to classes, due dates, reminders, and submission status."
      featureTitle="Assignment tracking workflow"
      features={[
        "Create class-linked assignments from quizzes and lesson plans.",
        "Track due dates, status, and missing students in one place.",
        "Send assignment links by email and manage reminder flow.",
        "Edit, reopen, close, duplicate, and reassign work as needed.",
      ]}
      useCasesTitle="What teachers use this for"
      useCases={[
        "Monitoring who has and has not submitted class work",
        "Managing due-soon, overdue, and draft assignments",
        "Resending links or reminders without losing workflow history",
        "Keeping repeated assignments organized across classes",
      ]}
      workflowTitle="Typical assignment operations flow"
      workflowSteps={[
        "Create an assignment from a quiz or lesson-linked workflow item.",
        "Attach it to a class, schedule dates, and send the link to students.",
        "Watch submission status, reminder need, and due-date pressure.",
        "Reopen, duplicate, reassign, or close the work as classroom needs change.",
      ]}
      summaryCards={[
        {
          title: "Operational Visibility",
          body: "Keep status, due dates, and class linkage in one assignment workflow instead of separate tools.",
        },
        {
          title: "Reminder Control",
          body: "Email the roster, then remind only the students who are still missing work.",
        },
        {
          title: "Reusable Operations",
          body: "Duplicate and reassign existing work instead of rebuilding every assignment manually.",
        },
      ]}
      lessonPlanUseCases={[
        "Keep lesson plans attached to class workflow even when they are not scored student activities.",
        "Use assignment history to connect planning, delivery, and follow-up actions.",
        "Reassign existing lesson-linked work to another class when needed.",
      ]}
      quizSamplePrompt="Create a 10-item Grade 8 history quiz on the French Revolution and prepare it for assignment tracking with a due date."
      lessonPlanSamplePrompt="Create a Grade 8 history lesson plan on the French Revolution that I can keep in assignment tracking and follow-up workflow."
      faq={[
        {
          question: "Can I see which students are missing?",
          answer: "Yes. QuizMintAI tracks submission counts, missing students, reminders, and recent assignment activity.",
        },
        {
          question: "Can I edit or reopen assignments later?",
          answer: "Yes. Teachers can update, reopen, duplicate, or reassign assignments as classroom needs change.",
        },
      ]}
      ctaText="Open Assignment Workflow"
      ctaHref="/workspace"
      relatedLinks={[
        { href: "/student-roster-and-reminders", label: "Student Roster and Reminders" },
        { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
        { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
