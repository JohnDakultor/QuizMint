// app/blog/[slug]/generateMetadata.ts
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({ where: { slug: params.slug } });

  if (!post) {
    return { title: "Blog | QuizMintAI" };
  }

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
    },
  };
}
