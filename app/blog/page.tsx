import type { Metadata } from "next";
import Link from "next/link";
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
    title: "How To Build Better Quizzes In 10 Minutes",
    excerpt:
      "A practical framework teachers can use to create balanced quizzes with clear learning targets and fair difficulty.",
    href: "/quiz-generator-for-teachers",
  },
  {
    title: "Lesson Plan Workflow That Saves Prep Time",
    excerpt:
      "A step-by-step approach for generating lesson plans, validating accuracy, and exporting classroom-ready files.",
    href: "/ai-quiz-generator",
  },
  {
    title: "Student Study Prompts That Actually Work",
    excerpt:
      "Prompt examples students can copy and adapt to generate focused review quizzes by topic, grade level, and format.",
    href: "/quiz-generator-for-students",
  },
];

export const metadata: Metadata = {
  title: "QuizMintAI Blog | Teaching, Quiz, and Lesson Plan Guides",
  description:
    "Read practical guides for teachers and students on quiz generation, lesson planning, study workflows, and classroom-ready AI usage.",
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

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-12 text-center">
          <span className="bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            QuizMintAI Blog
          </span>
        </h1>

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
      </div>
    </div>
  );
}
