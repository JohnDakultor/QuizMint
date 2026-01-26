import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Optional: prevent duplicate seeds
  const existing = await prisma.blogPost.findUnique({
    where: { slug: "why-quizmintai-was-created" },
  });
  if (existing) {
    return NextResponse.json({ message: "Blog post already seeded." });
  }

  const post = await prisma.blogPost.create({
    data: {
      title: "Why QuizMintAI Was Created: Empowering Educators with AI",
      slug: "why-quizmintai-was-created",
      excerpt:
        "QuizMintAI was built to help educators save time, reduce burnout, and leverage AI to create better assessments—without replacing the human touch in teaching.",
      content: `
## Introduction

Education is evolving, but many educators are still burdened with repetitive, time-consuming tasks—especially when it comes to creating quizzes and assessments.

**QuizMintAI was created to change that.**

Not to replace teachers—but to **empower them** by using AI as a supportive tool, not a shortcut.

---

## The Problem Educators Face Today

Teachers, trainers, and instructors spend countless hours on:
- Writing quiz questions manually
- Adjusting difficulty levels
- Reformatting assessments for different audiences
- Repeating the same work every semester

This time could be better spent on:
- Teaching
- Mentoring students
- Improving lesson quality
- Personal growth and rest

QuizMintAI exists to **give that time back**.

---

## Why We Built QuizMintAI

QuizMintAI was built with a clear mission:

> **Help educators leverage AI to work smarter, not harder.**

Instead of fearing AI or seeing it as a threat, we designed QuizMintAI to be:
- A **co-pilot** for educators
- A **time-saving assistant**
- A tool that respects **educational intent and quality**

AI should enhance human expertise—not replace it.

---

## How QuizMintAI Helps Educators

### 1. Faster Quiz Creation
Generate quizzes in seconds from:
- Topics
- Text content
- Learning materials

No more starting from a blank page.

---

### 2. Educator-Controlled AI
You stay in control:
- Choose difficulty levels
- Select question types
- Edit and refine generated questions

AI assists—**you decide**.

---

### 3. Better Learning Outcomes
Well-structured quizzes:
- Reinforce understanding
- Improve engagement
- Save educators from burnout

When teachers are less overwhelmed, students benefit too.

---

## AI as an Advantage, Not a Replacement

QuizMintAI was intentionally designed to:
- Support human judgment
- Encourage review and refinement
- Respect educational standards

We believe the best results happen when **AI + educators work together**.

---

## Who QuizMintAI Is For

QuizMintAI is built for:
- Teachers
- Professors
- Corporate trainers
- Tutors
- EdTech creators

Anyone who values **quality education** and **efficient workflows**.

---

## Our Vision Going Forward

Our long-term vision is simple:

- Make AI accessible to educators
- Reduce repetitive work
- Improve assessment quality
- Keep educators at the center of learning

Education deserves tools that **serve people**, not replace them.

---

## Conclusion

QuizMintAI was created out of a real need—to help educators reclaim their time and confidently use AI to their advantage.

If you're an educator, QuizMintAI isn’t here to take over your role.
It’s here to **support you**, amplify your expertise, and make your work easier.

Welcome to smarter teaching—with AI on your side.
      `,
      metaTitle: "Why QuizMintAI Was Created | AI Tools for Educators",
      metaDescription:
        "Discover why QuizMintAI was created and how it empowers educators to leverage AI for faster, smarter quiz creation without losing educational quality.",
      published: true,
    },
  });

  return NextResponse.json({ message: "Blog post seeded!", post });
}
