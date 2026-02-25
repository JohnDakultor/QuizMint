import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Exam Prep Quiz Generator for Students | QuizMint AI",
  description:
    "Help students prepare for exams with rapid AI-generated review quizzes across subjects and grade levels.",
  path: "/exam-prep-quiz-generator",
});

export default function ExamPrepQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI Exam Prep Quiz Generator"
      subtitle="Build focused review quizzes before exams using your target topics and question mix."
      featureTitle="Exam prep workflow"
      features={[
        "Generate review quizzes by chapter and subject.",
        "Create multiple sets to avoid repeated items.",
        "Mix question types for stronger retention.",
        "Use fast iterations while reviewing weak areas.",
      ]}
      useCasesTitle="Ideal for"
      useCases={[
        "Midterm and final review",
        "Weekly mastery checks",
        "Group study sessions",
        "Independent learner practice",
      ]}
      lessonPlanUseCases={[
        "Generate compressed review lesson plans for exam week with focused objectives per day.",
        "Align quiz outputs and lesson activities for high-retention exam preparation.",
        "Export review lesson plans for classroom, tutoring, or self-study schedules.",
      ]}
      quizSamplePrompt="Create a 25-item exam prep quiz for Grade 10 science with mixed formats and answer key."
      lessonPlanSamplePrompt="Create a 5-day Grade 10 science exam review lesson plan, 40 minutes per day, covering key competencies and quick checks."
      faq={[
        {
          question: "Can I request difficult questions only?",
          answer: "Yes, include hard difficulty and topic constraints in your prompt.",
        },
        {
          question: "Can I generate quizzes daily?",
          answer: "Yes, quiz generation is designed for repeat usage and quick turnaround.",
        },
      ]}
      ctaText="Start Exam Prep Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
