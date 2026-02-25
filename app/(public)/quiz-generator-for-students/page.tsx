import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Quiz Generator for Students | QuizMint AI",
  description:
    "Students can generate instant practice quizzes by topic, chapter, and difficulty to review smarter before exams.",
  path: "/quiz-generator-for-students",
});

export default function QuizGeneratorForStudentsPage() {
  return (
    <LandingTemplate
      title="AI Quiz Generator for Students"
      subtitle="Create self-review quizzes from your topics and study plan, then iterate fast on weak areas."
      featureTitle="Student learning advantages"
      features={[
        "Fast quiz generation from simple prompts.",
        "Practice with mixed question formats.",
        "Repeat generation for better retention.",
        "Use topic-focused review before exams.",
      ]}
      useCasesTitle="Student use cases"
      useCases={[
        "Night-before exam reviews",
        "Chapter mastery checks",
        "Group study sessions",
        "Self-paced revision",
      ]}
      lessonPlanUseCases={[
        "Generate student-friendly lesson plans for structured self-study by topic.",
        "Create short review plans before quizzes and long tests with daily goals.",
        "Pair lesson plan checkpoints with quizzes to track progress on weak chapters.",
      ]}
      quizSamplePrompt="Create a 12-item Grade 10 math quiz on linear equations with 6 MCQ, 3 true/false, and 3 fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 2-day Grade 10 math self-review lesson plan on linear equations, 35 minutes per day, with practice and quick checks."
      faq={[
        {
          question: "Can I choose question formats?",
          answer: "Yes, specify multiple choice, true/false, or a mixed set.",
        },
        {
          question: "Can I generate quizzes for one topic only?",
          answer: "Yes, provide a specific topic and desired question count.",
        },
      ]}
      ctaText="Generate Student Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
