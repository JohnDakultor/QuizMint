import LandingTemplate, {
  createLandingMetadata,
} from "../_components/landing-template";

export const metadata = createLandingMetadata({
  title: "AI Lesson Plan Generator for Teachers | QuizMint AI",
  description:
    "Generate structured 4A's lesson plans with editable content and export support for classroom delivery.",
  path: "/lesson-plan-generator-for-teachers",
});

export default function LessonPlanGeneratorForTeachersPage() {
  return (
    <LandingTemplate
      title="AI Lesson Plan Generator for Teachers"
      subtitle="Create complete lesson plans with objectives, activities, and time blocks aligned to your class schedule."
      featureTitle="Lesson planning features"
      features={[
        "Generate 4A's lesson plans per topic and grade.",
        "Configure number of days and minutes per day.",
        "Export plans in multiple formats.",
        "Reuse and revisit recent plans quickly.",
      ]}
      useCasesTitle="Useful for"
      useCases={[
        "Daily lesson preparation",
        "Weekly unit planning",
        "Substitute-ready lesson drafts",
        "Curriculum pacing support",
      ]}
      faq={[
        {
          question: "Can I edit the lesson before export?",
          answer: "Yes, generated plans can be reviewed and adjusted before downloading.",
        },
        {
          question: "Can I generate multi-day plans?",
          answer: "Yes, set your days and per-day duration in the input form.",
        },
      ]}
      ctaText="Generate Lesson Plan"
      ctaHref="/lessonPlan"
    />
  );
}
