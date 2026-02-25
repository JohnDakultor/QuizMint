import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Chemistry Quiz Generator for Teachers | QuizMint AI",
  description:
    "Create chemistry quizzes for atoms, compounds, reactions, and periodic trends with AI assistance.",
  path: "/chemistry-quiz-generator",
});

export default function ChemistryQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI Chemistry Quiz Generator"
      subtitle="Generate chemistry quizzes aligned to your lessons on matter, reactions, and equations."
      featureTitle="Chemistry-ready workflow"
      features={[
        "Generate questions by topic and grade level.",
        "Request exact number of multiple choice and true/false items.",
        "Create short checks and long review sets.",
        "Reuse prompt templates for recurring assessments.",
      ]}
      useCasesTitle="Classroom use cases"
      useCases={[
        "Reaction type checks",
        "Periodic table review",
        "Stoichiometry concept checks",
        "Exam prep quizzes",
      ]}
      lessonPlanUseCases={[
        "Create chemistry lesson plans with concept development and practice problems per session.",
        "Plan chemistry classes by day with clear objectives, activities, and closure.",
        "Generate lesson outputs you can export to PDF, DOCX, or PPTX for teaching.",
      ]}
      quizSamplePrompt="Create a 16-item Grade 10 chemistry quiz on chemical reactions with 8 MCQ, 4 true/false, and 4 fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 3-day Grade 10 chemistry lesson plan on chemical reactions, 50 minutes per day, including assessment criteria."
      faq={[
        {
          question: "Can I make quick 5-item quizzes?",
          answer: "Yes, set exact count directly in your prompt.",
        },
        {
          question: "Can this support mixed formats?",
          answer: "Yes, you can request both multiple choice and true/false in one run.",
        },
      ]}
      ctaText="Generate Chemistry Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
