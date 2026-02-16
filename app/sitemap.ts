import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://quizmintai.com";
  const now = new Date();

  const routes = [
    "",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/ai-quiz-generator",
    "/quiz-generator-for-teachers",
    "/quiz-generator-for-students",
    "/quiz-generator-for-corporate",
    "/blog",
    "/sign-in",
    "/sign-up",
  ];

  return routes.map((path, index) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: index === 0 ? "daily" : "weekly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
