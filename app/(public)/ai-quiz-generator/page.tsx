import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Quiz and Lesson Plan Generator with File Upload | QuizMint AI",
  description:
    "Generate quizzes and lesson plans instantly with AI. Upload materials, set difficulty, and create classroom-ready outputs.",
  path: "/ai-quiz-generator",
});

export default function AIQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI Quiz and Lesson Plan Generator"
      subtitle="Create quizzes and lesson plans from text, topics, or uploaded materials in minutes."
      featureTitle="Why educators choose QuizMintAI"
      features={[
        "Generate quizzes instantly with AI.",
        "Upload lesson materials for context-aware results.",
        "Control question count, format, and difficulty.",
        "Use one platform for both quiz and lesson workflows.",
      ]}
      useCasesTitle="Who uses this"
      useCases={[
        "Teachers in schools and colleges",
        "Students preparing for tests",
        "Tutors and review centers",
        "Corporate trainers and facilitators",
      ]}
      faq={[
        {
          question: "Can I generate both quizzes and lesson plans?",
          answer: "Yes. QuizMintAI supports both in separate generator flows.",
        },
        {
          question: "Can I request mixed question formats?",
          answer: "Yes, include the exact mix in your prompt (MCQ + true/false).",
        },
      ]}
      ctaText="Try QuizMintAI"
      ctaHref="/generate-quiz"
    />
  );
}
