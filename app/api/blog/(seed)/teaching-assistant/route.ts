import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Prevent duplicate seeds
  const existing = await prisma.blogPost.findUnique({
    where: { slug: "ai-is-not-cheating-its-a-teaching-assistant" },
  });

  if (existing) {
    return NextResponse.json({ message: "Blog post already seeded." });
  }

  const post = await prisma.blogPost.create({
    data: {
      title: "AI Is Not Cheating — It’s a Teaching Assistant",
      slug: "ai-is-not-cheating-its-a-teaching-assistant",
      excerpt:
        "AI in education isn’t about cutting corners. It’s about helping educators focus on what matters most—teaching, creativity, and student growth.",
      content: `
## Introduction

AI in education often sparks debate.

Some see it as “cheating.”
Others fear it will replace teachers.

At QuizMintAI, we believe neither is true.

**AI is a teaching assistant—not a replacement, and not a shortcut.**

---

## The Misconception Around AI in Education

AI is often misunderstood as:
- Doing the work for educators
- Lowering academic standards
- Removing human involvement

In reality, AI is best used as a **support system**, not a decision-maker.

Just like calculators didn’t replace math teachers, AI won’t replace educators.

---

## What AI Should Actually Do for Teachers

AI should help with:
- Drafting quiz questions
- Suggesting variations in difficulty
- Saving time on repetitive tasks
- Speeding up preparation work

And **nothing more**.

The educator remains responsible for:
- Reviewing content
- Setting learning goals
- Making final decisions
- Guiding students

---

## How QuizMintAI Uses AI Responsibly

QuizMintAI was built with clear boundaries:

- AI generates **draft questions**
- Educators review and refine
- Final output stays human-approved

We designed the platform so AI works **with** educators—not instead of them.

---

## Why This Matters for Students

When educators save time on repetitive work, they can:
- Give better feedback
- Improve lesson quality
- Focus on student understanding
- Reduce burnout

Better-supported teachers lead to **better learning outcomes**.

---

## AI as a Skill, Not a Threat

AI literacy is becoming an essential skill.

By using tools like QuizMintAI, educators:
- Stay ahead of change
- Model responsible AI use
- Teach students how to use AI ethically

Avoiding AI doesn’t stop progress—**learning to use it wisely does**.

---

## The Future of Teaching with AI

The future isn’t:
- AI-only classrooms
- Automated education
- Teacher replacement

The future is:
- Educators empowered by AI
- Smarter tools
- Better balance
- More time for real teaching

---

## Conclusion

AI is not cheating.
AI is not replacing teachers.
AI is not lowering standards.

When used correctly, AI is simply a **teaching assistant**—one that helps educators do their best work.

QuizMintAI exists to make that future practical, ethical, and educator-first.
      `,
      metaTitle: "AI in Education Is Not Cheating | QuizMintAI",
      metaDescription:
        "Learn why AI in education isn’t cheating but a powerful assistant for educators. Discover how QuizMintAI helps teachers save time while keeping human control.",
      published: true,
    },
  });

  return NextResponse.json({ message: "Blog post seeded!", post });
}
