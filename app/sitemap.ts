import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.quizmintai.com";
  const now = new Date();

  const routes = [
    "",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/disclaimer",
    "/resources",
    "/ai-quiz-generator",
    "/quiz-generator-for-teachers",
    "/quiz-generator-for-students",
    "/quiz-generator-for-corporate",
    "/science-quiz-generator",
    "/math-quiz-generator",
    "/history-quiz-generator",
    "/english-quiz-generator",
    "/biology-quiz-generator",
    "/chemistry-quiz-generator",
    "/physics-quiz-generator",
    "/exam-prep-quiz-generator",
    "/lesson-plan-generator-for-teachers",
    "/interactive-quiz-maker-for-students",
    "/blog",
  ];

  return routes.map((path, index) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: index === 0 ? "daily" : "weekly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
