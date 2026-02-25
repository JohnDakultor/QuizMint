import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Math Quiz Generator with AI | QuizMint AI",
  description:
    "Build math quizzes for algebra, geometry, and arithmetic with fast AI generation and classroom-ready outputs.",
  path: "/math-quiz-generator",
});

export default function MathQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI Math Quiz Generator"
      subtitle="Create practice and assessment quizzes for algebra, geometry, fractions, and equations in minutes."
      featureTitle="Math-focused features"
      features={[
        "Generate quizzes by strand and grade level.",
        "Request specific counts and question formats.",
        "Use the same prompt templates across classes.",
        "Save generated quizzes for later reuse.",
      ]}
      useCasesTitle="Common classroom flows"
      useCases={[
        "Pre-test and post-test pairs",
        "Spiral review quizzes",
        "Exit tickets",
        "Exam preparation sets",
      ]}
      faq={[
        {
          question: "Can I generate quizzes for one specific lesson?",
          answer: "Yes, include a narrow topic like factoring quadratic equations.",
        },
        {
          question: "Can students use this for review?",
          answer: "Yes, students can generate self-review quizzes from their topics.",
        },
      ]}
      ctaText="Generate a Math Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
