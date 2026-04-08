import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.quizmintai.com";
  const now = new Date();
  const highPriorityWorkflowRoutes = new Set([
    "",
    "/resources",
    "/teacher-workflow-platform",
    "/ai-tools-for-teachers",
    "/classroom-workflow-software",
    "/ai-tools-for-private-school-teachers",
    "/ai-tools-for-tutors",
    "/teacher-workflow-for-training-centers",
    "/teacher-workflow-software-saudi-arabia",
    "/ai-tools-for-teachers-middle-east",
    "/classroom-quiz-workflow",
    "/assignment-tracking-for-teachers",
    "/quiz-results-and-reteach-workflow",
    "/teacher-workspace-for-quizzes-and-lessons",
    "/classroom-intervention-workflow",
    "/quiz-generator-for-teachers",
    "/lesson-plan-generator-for-teachers",
    "/blog",
  ]);

  const routes = [
    "",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/disclaimer",
    "/resources",
    "/teacher-workflow-platform",
    "/ai-tools-for-teachers",
    "/classroom-workflow-software",
    "/ai-tools-for-private-school-teachers",
    "/ai-tools-for-tutors",
    "/teacher-workflow-for-training-centers",
    "/teacher-workflow-software-saudi-arabia",
    "/ai-tools-for-teachers-middle-east",
    "/ai-quiz-generator",
    "/classroom-quiz-workflow",
    "/assignment-tracking-for-teachers",
    "/student-roster-and-reminders",
    "/quiz-results-and-reteach-workflow",
    "/teacher-workspace-for-quizzes-and-lessons",
    "/classroom-intervention-workflow",
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

  const staticRoutes: MetadataRoute.Sitemap = routes.map((path, index) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency:
      path === ""
        ? "daily"
        : highPriorityWorkflowRoutes.has(path)
          ? "weekly"
          : "monthly",
    priority:
      path === ""
        ? 1
        : highPriorityWorkflowRoutes.has(path)
          ? 0.85
          : 0.7,
  }));

  const publishedPosts = await prisma.blogPost.findMany({
    where: { published: true },
    select: {
      slug: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const blogRoutes: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.updatedAt || post.createdAt,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [...staticRoutes, ...blogRoutes];
}
