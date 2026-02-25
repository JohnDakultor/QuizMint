import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Biology Quiz Generator with AI | QuizMint AI",
  description:
    "Generate biology quizzes on cells, genetics, systems, and ecology for fast classroom assessments.",
  path: "/biology-quiz-generator",
});

export default function BiologyQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI Biology Quiz Generator"
      subtitle="Build biology assessments quickly for core topics like cells, genetics, and ecosystems."
      featureTitle="Biology teaching benefits"
      features={[
        "Prompt for one topic or an entire unit review.",
        "Mix question types for better retention checks.",
        "Use concise answer keys for quick grading.",
        "Generate consistent quiz sets across sections.",
      ]}
      useCasesTitle="Best for biology classes"
      useCases={[
        "Cell structure quizzes",
        "Genetics concept checks",
        "Ecology review tasks",
        "Unit-end summative assessments",
      ]}
      lessonPlanUseCases={[
        "Generate biology lesson plans with inquiry activities and concept checks for each day.",
        "Align daily biology objectives with lab-friendly or no-lab classroom strategies.",
        "Export biology lesson plans to editable formats for fast classroom prep.",
      ]}
      quizSamplePrompt="Create a 14-item Grade 9 biology quiz about cell structure and function with mixed MCQ, true/false, and fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 3-day Grade 9 biology lesson plan on cell structure and function, 45 minutes per day, with activities and formative assessment."
      faq={[
        {
          question: "Does it support grade-level prompts?",
          answer: "Yes, include grade level and desired difficulty in the prompt.",
        },
        {
          question: "Can this help with remediation?",
          answer: "Yes, generate easier targeted quizzes for specific weak topics.",
        },
      ]}
      ctaText="Create Biology Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
