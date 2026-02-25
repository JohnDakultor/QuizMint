import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "History Quiz Generator for Classrooms | QuizMint AI",
  description:
    "Generate world history and local history quizzes from prompts or source materials using QuizMint AI.",
  path: "/history-quiz-generator",
});

export default function HistoryQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI History Quiz Generator"
      subtitle="Create engaging history quizzes for timelines, key events, and historical figures."
      featureTitle="Built for history instruction"
      features={[
        "Create quizzes aligned to a specific era or chapter.",
        "Request true/false, multiple choice, or mixed format.",
        "Generate faster from your own lesson context.",
        "Support recurring review routines.",
      ]}
      useCasesTitle="Use this for"
      useCases={[
        "Timeline checks",
        "Chapter-end assessments",
        "Review before unit exams",
        "Independent study packets",
      ]}
      faq={[
        {
          question: "Can I focus on one event only?",
          answer: "Yes. Specify the event and year range in the prompt.",
        },
        {
          question: "Can I request 20 questions?",
          answer: "Yes, include exact item count and format mix in your prompt.",
        },
      ]}
      ctaText="Create a History Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
