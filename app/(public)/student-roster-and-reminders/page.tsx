import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Student Roster and Assignment Reminders | QuizMint AI",
  description:
    "Manage class rosters, validate student emails, email assignment links, and send reminder follow-up with QuizMintAI.",
  path: "/student-roster-and-reminders",
});

export default function StudentRosterAndRemindersPage() {
  return (
    <LandingTemplate
      path="/student-roster-and-reminders"
      title="Student Roster and Assignment Reminders"
      subtitle="Build a student roster, validate assignment identity, send quiz links by email, and remind only the students who still need to submit."
      featureTitle="Roster-driven classroom workflow"
      features={[
        "Add individual students or import a class roster in bulk.",
        "Use roster emails to validate who can submit assignments.",
        "Send quiz links to the whole roster from the teacher workflow.",
        "Send reminders only to missing students instead of emailing everyone again.",
      ]}
      useCasesTitle="Why teachers use roster and reminder workflows"
      useCases={[
        "Prevent assignment submissions from using the wrong student email",
        "Set up a class once and reuse it across repeated assignments",
        "Send reminder emails to only the students who still have missing work",
        "Keep a cleaner connection between rosters, assignments, and results",
      ]}
      workflowTitle="Typical roster and reminder flow"
      workflowSteps={[
        "Create a class and add students manually or import a roster file.",
        "Use roster emails to match assignment submissions to the right students.",
        "Send assignment links to the class roster from the teacher side.",
        "Send reminder follow-up only to missing students when needed.",
      ]}
      summaryCards={[
        {
          title: "Roster Identity",
          body: "Keep teacher-side student records tied to assignments without forcing student signup.",
        },
        {
          title: "Cleaner Email Flow",
          body: "Start with a roster email blast, then use targeted reminders for students who still need to submit.",
        },
        {
          title: "Better Result Matching",
          body: "Reduce confusion in class tracking by validating assignment email identity against the roster.",
        },
      ]}
      lessonPlanUseCases={[
        "Keep class rosters in place while lesson plans and quizzes move through the same workflow.",
        "Use roster context to make class-linked assignments easier to manage over time.",
        "Support teacher follow-up without adding student signup requirements too early.",
      ]}
      quizSamplePrompt="Create a 10-item Grade 7 biology quiz on plant reproduction that I can send to my class roster by email."
      lessonPlanSamplePrompt="Create a Grade 7 biology lesson plan on plant reproduction with a follow-up quiz workflow for my rostered class."
      faq={[
        {
          question: "Do students need to create accounts?",
          answer: "No. Teachers can use rosters and shared assignment links without requiring student signup.",
        },
        {
          question: "Can I remind only the students who are missing?",
          answer: "Yes. QuizMintAI supports reminder flows that target missing students instead of resending to everyone.",
        },
      ]}
      ctaText="Set Up Class Roster Workflow"
      ctaHref="/classes"
      relatedLinks={[
        { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
        { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
        { href: "/resources", label: "All Guides" },
      ]}
    />
  );
}
