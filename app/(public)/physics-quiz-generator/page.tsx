import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "Physics Quiz Generator Online | QuizMint AI",
  description:
    "Generate physics quizzes for motion, force, energy, and waves with AI-powered item generation.",
  path: "/physics-quiz-generator",
});

export default function PhysicsQuizGeneratorPage() {
  return (
    <LandingTemplate
      title="AI Physics Quiz Generator"
      subtitle="Create classroom-ready physics quizzes on core concepts with configurable question types."
      featureTitle="Physics-focused generation"
      features={[
        "Generate topic-specific concept questions quickly.",
        "Request true/false and multiple choice mix.",
        "Use consistent templates for weekly reviews.",
        "Save time preparing checks for each section.",
      ]}
      useCasesTitle="What teachers generate"
      useCases={[
        "Motion and kinematics checks",
        "Force and Newton's laws review",
        "Energy and work assessments",
        "Wave behavior concept quizzes",
      ]}
      lessonPlanUseCases={[
        "Generate physics lesson plans with demonstrations, guided problem-solving, and recap activities.",
        "Build day-by-day learning flow for motion, force, energy, and waves topics.",
        "Prepare physics teaching materials with export-ready lesson plan formats.",
      ]}
      quizSamplePrompt="Create an 18-item Grade 10 physics quiz on Newton's Laws with MCQ, true/false, and fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 3-day Grade 10 physics lesson plan on Newton's Laws, 45 minutes per day, with examples, activities, and assessment."
      faq={[
        {
          question: "Can I make higher-difficulty physics quizzes?",
          answer: "Yes, include advanced difficulty in your prompt settings.",
        },
        {
          question: "Can students use this for revision?",
          answer: "Yes, students can generate targeted review quizzes by topic.",
        },
      ]}
      ctaText="Create Physics Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
