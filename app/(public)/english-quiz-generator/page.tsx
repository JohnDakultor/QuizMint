import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "English Quiz Generator for Grammar and Reading | QuizMint AI",
  description:
    "Create English quizzes for grammar, reading comprehension, and vocabulary for middle and high school learners.",
  path: "/english-quiz-generator",
});

export default function EnglishQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI English Quiz Generator"
      subtitle="Generate grammar, vocabulary, and reading quizzes with instructions tailored to your class level."
      featureTitle="English language teaching use"
      features={[
        "Generate quizzes from grammar topics and passages.",
        "Request specific item formats and answer keys.",
        "Adapt quiz difficulty by grade and learner level.",
        "Create repeatable weekly language checks.",
      ]}
      useCasesTitle="Used by teachers for"
      useCases={[
        "Grammar drills",
        "Vocabulary checks",
        "Reading comprehension tasks",
        "Remedial and enrichment practice",
      ]}
      lessonPlanUseCases={[
        "Build complete English lesson plans with grammar focus, reading passage tasks, and writing outputs.",
        "Plan language activities per day with explicit objectives and scaffolding.",
        "Generate exportable lesson plans for grammar, vocabulary, and reading units.",
      ]}
      quizSamplePrompt="Create a 15-item Grade 8 English quiz on subject-verb agreement: 8 MCQ, 4 true/false, and 3 fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 2-day Grade 8 English lesson plan on subject-verb agreement, 45 minutes per day, with warm-up, guided practice, and assessment."
      faq={[
        {
          question: "Can I generate from a custom passage?",
          answer: "Yes, include the passage context in your prompt for targeted questions.",
        },
        {
          question: "Can I include true/false items?",
          answer: "Yes, specify the exact number of true/false and multiple choice questions.",
        },
      ]}
      ctaText="Generate English Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
