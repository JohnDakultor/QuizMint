import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Prevent duplicate seeds
  const existing = await prisma.blogPost.findUnique({
    where: { slug: "the-future-of-quizmintai-beyond-quizzes" },
  });

  if (existing) {
    return NextResponse.json({ message: "Blog post already seeded." });
  }

  const post = await prisma.blogPost.create({
    data: {
      title: "The Future of QuizMintAI: Beyond Quizzes",
      slug: "the-future-of-quizmintai-beyond-quizzes",
      excerpt:
        "QuizMintAI started with quizzes—but its future is about building a complete AI-powered toolkit for educators, from lesson plans to learning materials and beyond.",
      content: `
## Introduction

QuizMintAI began with a simple goal:
**Help educators create quizzes faster using AI.**

But quizzes are only the beginning.

As education continues to evolve, so does QuizMintAI—toward a future where educators have **powerful, ethical AI tools** that support every stage of teaching.

---

## Our Vision for QuizMintAI

The future of QuizMintAI is centered on one idea:

> **AI should support educators across the entire teaching workflow—not just assessments.**

We’re building toward a platform that helps with:
- Planning
- Content creation
- Assessment
- Engagement

All while keeping educators in control.

---

## Expanding Beyond Quiz Generation

### 1. AI-Powered Lesson Plan Generation

Future versions of QuizMintAI aim to help educators:
- Generate structured lesson plans
- Align objectives, activities, and assessments
- Adapt lessons to different learning levels

Lesson planning shouldn’t start from scratch every time.

---

### 2. AI-Assisted Learning Materials

We’re exploring ways to help educators generate:
- Study guides
- Practice exercises
- Summarized learning content

AI will assist with drafts—educators will refine and finalize.

---

### 3. AI-Generated Video Learning Materials

Looking ahead, QuizMintAI plans to support:
- AI-assisted educational videos
- Script generation for lessons
- Visual learning support for complex topics

These tools are designed to **enhance understanding**, not replace teaching.

---

## Built for Educators, Not Automation

Every future feature follows the same principles:
- Human-first design
- Educator control
- Review before publish
- Ethical AI use

Automation should remove friction—not responsibility.

---

## A Modular, Growing Platform

QuizMintAI is being built as a modular platform:
- Start with quizzes
- Add lesson planning
- Expand to learning materials
- Integrate multimedia support

Educators use only what they need—nothing more.

---

## Why This Future Matters

Educators are under pressure:
- Limited time
- Growing workloads
- Increasing expectations

By expanding QuizMintAI thoughtfully, we aim to:
- Reduce burnout
- Improve content quality
- Give educators better tools—not more work

---

## Looking Ahead

QuizMintAI’s future isn’t about rushing features.
It’s about **building the right tools, the right way**.

As AI evolves, QuizMintAI will continue to adapt—always guided by educators’ real needs.

---

## Conclusion

The future of QuizMintAI goes beyond quizzes.

It’s about creating a trusted AI-powered workspace where educators can plan, create, assess, and engage—without losing control or educational quality.

This is just the beginning.
      `,
      metaTitle: "The Future of QuizMintAI | AI Tools for Educators",
      metaDescription:
        "Explore the future of QuizMintAI—from AI-powered lesson plans to learning materials and video generation—built to support educators every step of the way.",
      published: true,
    },
  });

  return NextResponse.json({ message: "Blog post seeded!", post });
}
