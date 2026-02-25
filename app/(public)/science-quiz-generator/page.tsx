import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Science Quiz Generator for Teachers and Students | QuizMint AI",
  description:
    "Create Grade 6-12 science quizzes in seconds with multiple choice and true/false formats using QuizMint AI.",
  path: "/science-quiz-generator",
});

export default function ScienceQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI Science Quiz Generator"
      subtitle="Generate science assessments from ecosystems, matter, cells, and earth science topics with editable outputs."
      featureTitle="Why science teachers use it"
      features={[
        "Generate topic-based science quizzes with level-appropriate wording.",
        "Mix multiple choice and true/false in one generation.",
        "Reuse saved quizzes and export when needed.",
        "Add context from your own lesson materials.",
      ]}
      useCasesTitle="Best for"
      useCases={[
        "Daily formative checks",
        "Weekly summative tests",
        "Science review sessions",
        "Homework quiz generation",
      ]}
      faq={[
        {
          question: "Can I request Grade 7 or Grade 10 difficulty?",
          answer: "Yes, include grade level and difficulty directly in your prompt.",
        },
        {
          question: "Can I include true/false questions?",
          answer: "Yes, specify the mix, for example: 6 multiple choice and 4 true/false.",
        },
      ]}
      ctaText="Create a Science Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
