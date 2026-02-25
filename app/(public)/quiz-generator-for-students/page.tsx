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
