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
      lessonPlanUseCases={[
        "Build multi-day math lesson plans that align directly with your quiz objectives.",
        "Create differentiated activities for remediation and enrichment in one plan.",
        "Generate printable/exportable lesson materials for algebra, geometry, and arithmetic topics.",
      ]}
      quizSamplePrompt="Create a 20-item Grade 9 math quiz on linear equations: 12 MCQ, 4 true/false, and 4 fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 4-day Grade 9 math lesson plan on linear equations, 40 minutes per day, with guided practice and assessment rubric."
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
