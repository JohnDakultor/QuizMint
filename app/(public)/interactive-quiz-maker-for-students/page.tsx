import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Interactive Quiz Maker for Students | QuizMint AI",
  description:
    "Students can generate interactive quizzes by topic to practice, review, and prepare for class assessments.",
  path: "/interactive-quiz-maker-for-students",
});

export default function InteractiveQuizMakerForStudentsPage() {
  return (
    <LandingTemplate
      title="Interactive Quiz Maker for Students"
      subtitle="Generate self-practice quizzes in seconds to improve retention and exam confidence."
      featureTitle="Student-friendly capabilities"
      features={[
        "Instant quiz generation from short prompts.",
        "Mixed format questions for better recall.",
        "Repeat generation for weak topics.",
        "Simple, fast review workflow.",
      ]}
      useCasesTitle="Great for students who need"
      useCases={[
        "Night-before exam reviews",
        "Topic-by-topic self-assessments",
        "Practice between classes",
        "Independent progress checks",
      ]}
      lessonPlanUseCases={[
        "Turn weak topics into structured study lesson plans with daily checkpoints.",
        "Generate short review plans before quizzes, long tests, or oral recitations.",
        "Create a lesson + quiz loop so study sessions and practice tests stay aligned.",
      ]}
      quizSamplePrompt="Create a 12-item student practice quiz on photosynthesis with 6 MCQ, 3 true/false, and 3 fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 2-day student review lesson plan on photosynthesis, 35 minutes per day, with key points, activities, and quick assessment."
      faq={[
        {
          question: "Can I choose how many items to generate?",
          answer: "Yes, specify the item count directly in the prompt.",
        },
        {
          question: "Can I focus on one chapter only?",
          answer: "Yes, include chapter name and required formats in your request.",
        },
      ]}
      ctaText="Generate Student Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
