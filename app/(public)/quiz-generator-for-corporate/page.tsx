import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Quiz Generator for Corporate Training | QuizMint AI",
  description:
    "Create professional training quizzes for onboarding, compliance, and workshops with AI-powered generation.",
  path: "/quiz-generator-for-corporate",
});

export default function QuizGeneratorForCorporatePage() {
  return (
    <LandingTemplate
      title="AI Quiz Generator for Corporate Training"
      subtitle="Generate fast assessments for workforce learning, onboarding modules, and professional development."
      featureTitle="Corporate training benefits"
      features={[
        "Create assessments from internal training topics.",
        "Generate repeatable quiz sets per module.",
        "Support mixed-format checks for engagement.",
        "Reduce manual quiz authoring time.",
      ]}
      useCasesTitle="Best for teams running"
      useCases={[
        "Onboarding assessments",
        "Compliance refreshers",
        "Workshop knowledge checks",
        "L&D program evaluations",
      ]}
      faq={[
        {
          question: "Can this be used for workshop quizzes?",
          answer: "Yes, it works for short workshop checks and recurring programs.",
        },
        {
          question: "Can I request different difficulty levels?",
          answer: "Yes, include target difficulty in the generation prompt.",
        },
      ]}
      ctaText="Generate Corporate Quiz"
      ctaHref="/generate-quiz"
    />
  );
}
