import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 md:px-8 lg:px-16">
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
