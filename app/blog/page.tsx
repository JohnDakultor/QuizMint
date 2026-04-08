import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { format } from "date-fns";
import { ArrowRight, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  createdAt: Date;
};

const fallbackPosts = [
  {
    title: "How To Build A Classroom Quiz Workflow That Teachers Reuse",
    excerpt:
      "A practical workflow for moving from quiz generation to class assignment, results review, and reteach follow-up.",
    href: "/classroom-quiz-workflow",
  },
  {
    title: "Assignment Tracking For Teachers Without Spreadsheet Chaos",
    excerpt:
      "A teacher-friendly way to manage due dates, missing students, reminders, and assignment operations from one workflow.",
    href: "/assignment-tracking-for-teachers",
  },
  {
    title: "Quiz Results And Reteach Workflow That Saves The Next Class",
    excerpt:
      "Use weak-concept data, missing-student tracking, and follow-up generation to decide what to reteach next.",
    href: "/quiz-results-and-reteach-workflow",
  },
];

const workflowClusters = [
  { href: "/classroom-quiz-workflow", title: "Classroom Quiz Workflow" },
  { href: "/assignment-tracking-for-teachers", title: "Assignment Tracking for Teachers" },
  { href: "/student-roster-and-reminders", title: "Student Roster and Reminders" },
  { href: "/quiz-results-and-reteach-workflow", title: "Quiz Results and Reteach Workflow" },
  { href: "/teacher-workspace-for-quizzes-and-lessons", title: "Teacher Workspace for Quizzes and Lessons" },
  { href: "/classroom-intervention-workflow", title: "Classroom Intervention Workflow" },
];

export const metadata: Metadata = {
  title: "QuizMintAI Blog | Teacher Workflow, Quizzes, and Lesson Planning",
  description:
    "Read practical guides for teacher workflow, quiz generation, lesson planning, class assignments, results review, and classroom-ready AI usage.",
  alternates: {
    canonical: "https://www.quizmintai.com/blog",
  },
};

export default async function BlogPage() {
  const posts = (await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      createdAt: true,
    },
  })) as BlogPost[];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.quizmintai.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://www.quizmintai.com/blog",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50">
      <Script
        id="blog-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-4 text-center">
          <span className="bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            QuizMintAI Blog
          </span>
        </h1>
        <p className="mx-auto mb-12 max-w-3xl text-center text-base text-zinc-600">
          Practical articles and workflow guides for planning, assigning, reviewing results, following up, and reusing classroom assets.
        </p>

        <section className="mb-14 rounded-3xl border border-blue-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900">Featured Workflow Guides</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Start with these workflow guides if you want the clearest path from quiz and lesson generation into assignments, results, and classroom follow-up.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workflowClusters.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-blue-400 hover:text-blue-700"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>

        {posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <div className="border rounded-xl overflow-hidden hover:shadow-xl transition-all p-6 cursor-pointer bg-white">
                  <div className="flex gap-4 text-sm text-zinc-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(post.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                  <p className="text-zinc-600 line-clamp-3 mb-4">{post.excerpt}</p>
                  <div className="flex items-center text-blue-600 font-medium">
                    Read more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {fallbackPosts.map((post) => (
              <Link key={post.title} href={post.href}>
                <div className="border rounded-xl overflow-hidden hover:shadow-xl transition-all p-6 cursor-pointer bg-white">
                  <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                  <p className="text-zinc-600 line-clamp-3 mb-4">{post.excerpt}</p>
                  <div className="flex items-center text-blue-600 font-medium">
                    Read guide
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <section className="mt-16 rounded-3xl border border-blue-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900">Explore More Workflow Guides</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Browse the main workflow pages for assignments, results, intervention, workspace activity, and classroom operations.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workflowClusters.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-blue-400 hover:text-blue-700"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
