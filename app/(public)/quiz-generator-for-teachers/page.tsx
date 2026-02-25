import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Quiz Generator for Teachers | QuizMint AI",
  description:
    "Help teachers create quizzes faster with AI-generated question sets, mixed formats, and reusable classroom templates.",
  path: "/quiz-generator-for-teachers",
});

export default function QuizGeneratorForTeachersPage() {
  return (
    <LandingTemplate
      title="AI Quiz Generator for Teachers"
      subtitle="Build classroom assessments quickly with mixed question types and level-appropriate prompts."
      featureTitle="Teacher-focused benefits"
      features={[
        "Generate quizzes by grade and subject.",
        "Mix multiple choice and true/false in one run.",
        "Create repeatable prompt templates per lesson.",
        "Save preparation time across multiple sections.",
      ]}
      useCasesTitle="Common classroom use"
      useCases={[
        "Daily formative checks",
        "Weekly quizzes",
        "Exam review worksheets",
        "Remediation and enrichment tasks",
      ]}
      faq={[
        {
          question: "Can I generate by exact item count?",
          answer: "Yes, include exact count and format mix in your request.",
        },
        {
          question: "Can this support different grade levels?",
          answer: "Yes, include the target grade in your prompt.",
        },
      ]}
      ctaText="Generate Teacher Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
