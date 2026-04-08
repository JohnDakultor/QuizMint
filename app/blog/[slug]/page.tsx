import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

type Params = { slug: string };

async function getPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      featuredImage: true,
      authorName: true,
      createdAt: true,
      published: true,
      metaTitle: true,
      metaDescription: true,
    },
  });
}

export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  });

  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || !post.published) {
    return {
      title: "Post Not Found | QuizMintAI Blog",
      robots: { index: false, follow: false },
    };
  }

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;
  const url = `https://www.quizmintai.com/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) {
    notFound();
  }

  const extractHeadings = (markdown: string) => {
    const regex = /^###?\s+(.*)$/gm;
    const matches = [...markdown.matchAll(regex)];
    return matches.map((m) => m[1]);
  };

  const headings = extractHeadings(post.content);
  const url = `https://www.quizmintai.com/blog/${post.slug}`;
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
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: url,
      },
    ],
  };
  const relatedWorkflowLinks = [
    { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
    { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
    { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
    { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 md:px-8 lg:px-16">
      <Script
        id="blog-post-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
        <div className="flex-1 bg-white shadow-lg rounded-xl overflow-hidden">
          {post.featuredImage && (
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-80 object-cover"
            />
          )}

          <div className="p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              {post.title}
            </h1>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 text-gray-500 text-sm">
              <span>
                {post.authorName || "QuizMintAI"} &middot;{" "}
                {format(new Date(post.createdAt), "MMM d, yyyy")}
              </span>
            </div>

            <p className="text-gray-700 text-lg mb-8">{post.excerpt}</p>

            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            <section className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <h2 className="text-2xl font-semibold text-zinc-900">Related Teacher Workflow Guides</h2>
              <p className="mt-2 text-sm text-zinc-700">
                Continue from this article into the public workflow pages that explain how QuizMintAI connects generation, assignments, results, and follow-up.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {relatedWorkflowLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-blue-400 hover:text-blue-700"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>

        {headings.length > 0 && (
          <aside className="hidden lg:block w-64 sticky top-24 self-start">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Table of Contents
            </h2>
            <ul className="space-y-2 text-gray-600 text-sm">
              {headings.map((h, i) => {
                const id = h.toLowerCase().replace(/\s+/g, "-");
                return (
                  <li key={`${id}-${i}`}>
                    <a
                      href={`#${id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {h}
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
