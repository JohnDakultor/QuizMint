import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Teacher Workflow Platform with Quiz and Lesson Generation | QuizMint AI",
  description:
    "Generate quizzes and lesson plans from uploaded materials, then assign work, track results, and run follow-up interventions inside one teacher workflow.",
  path: "/ai-quiz-generator",
});

export default function AIQuizGeneratorPage() {
  return (
    <LandingTemplate
      path="/ai-quiz-generator"
      title="AI Teacher Workflow Platform"
      subtitle="Create quizzes and lesson plans from text, topics, or uploaded materials, then move directly into class assignments, results, and follow-up."
      featureTitle="Why educators choose QuizMintAI"
      features={[
        "Generate quizzes and lesson plans instantly with AI.",
        "Upload lesson materials for context-aware classroom outputs.",
        "Assign generated work to classes and student rosters.",
        "Use one platform for generation, results, and intervention workflow.",
      ]}
      useCasesTitle="Who uses this"
      useCases={[
        "Teachers in schools and colleges",
        "Tutors and review centers",
        "Departments managing repeated class workflows",
        "Trainers who need creation plus tracking in one flow",
      ]}
      lessonPlanUseCases={[
        "Generate complete lesson plans with day-by-day structure, activities, and assessments.",
        "Convert lesson plans into editable and exportable outputs for classroom and remote teaching.",
        "Use one topic pipeline to create both lesson flow and matching quizzes for mastery checks and follow-up.",
      ]}
      quizSamplePrompt="Create a 20-item Grade 9 science quiz on ecosystems with 10 MCQ, 5 true/false, and 5 fill-in-the-blank."
      lessonPlanSamplePrompt="Create a 3-day Grade 9 science lesson plan on ecosystems, 45 minutes per day, with objectives, activities, and assessment rubric."
      faq={[
        {
          question: "Can I generate both quizzes and lesson plans?",
          answer: "Yes. QuizMintAI supports both, then keeps them inside the same class, assignment, and follow-up workflow.",
        },
        {
          question: "Can I use uploaded materials?",
          answer: "Yes. You can upload materials for context-aware generation, then reuse the outputs inside your teacher workflow.",
        },
      ]}
      ctaText="Start Teacher Workflow"
      ctaHref="/generate-quiz"
    />
  );
}
