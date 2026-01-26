import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Optional: prevent duplicate seeds
  const existing = await prisma.blogPost.findUnique({
    where: { slug: "how-to-create-ai-powered-quizzes-in-minutes" },
  });
  if (existing) {
    return NextResponse.json({ message: "Blog post already seeded." });
  }

  const post = await prisma.blogPost.create({
    data: {
      title: "How to Create AI-Powered Quizzes in Minutes",
      slug: "how-to-create-ai-powered-quizzes-in-minutes",
      excerpt:
        "Discover how to create high-quality AI-powered quizzes quickly for students, teachers, and corporate training. Learn step-by-step best practices to boost engagement and learning outcomes.",
      content: `
## Introduction

Creating quizzes manually is time-consuming and often repetitive. With AI-powered quiz generators, you can save hours while creating high-quality, engaging quizzes for students, corporate training, or personal learning.

In this guide, we’ll show you **step-by-step how to create AI-powered quizzes** that are accurate, engaging, and ready to use.

---

## Why Use AI for Quizzes?

1. **Saves Time:** Generate multiple questions in seconds.
2. **Enhances Quality:** AI ensures questions are accurate and clear.
3. **Customizable Difficulty:** Adjust the complexity based on your audience.
4. **Engagement Boost:** Well-crafted questions keep learners motivated.

---

## Step-by-Step Guide to Creating AI Quizzes

### Step 1: Choose Your AI Quiz Platform
Select a platform like **QuizMintAI** that supports question generation from text or topics.

### Step 2: Input Content
Provide the AI with your source content:
- Textbooks
- Lecture notes
- Corporate training material

### Step 3: Configure Quiz Settings
Set parameters such as:
- Number of questions
- Difficulty level
- Question types (MCQ, true/false, short answer)

### Step 4: Generate Quiz
Click “Generate” and let the AI create the questions automatically.

### Step 5: Review and Publish
Always review the AI-generated questions for accuracy, clarity, and alignment with learning objectives. Once ready, publish your quiz to your platform.

---

## Best Practices for AI Quiz Creation

- Keep your source content **clear and concise**.
- **Mix question types** to maintain engagement.
- Include explanations for answers to enhance learning.
- Regularly update quizzes to stay relevant.

---

## Conclusion

AI-powered quiz creation is a **game-changer for educators, trainers, and learners**. By automating repetitive tasks, you save time while delivering **high-quality, engaging quizzes**.

Start creating AI-powered quizzes today and transform the way you teach and learn!
      `,
      metaTitle: "How to Create AI-Powered Quizzes in Minutes | QuizMintAI",
      metaDescription:
        "Learn the ultimate guide to creating quizzes with AI in minutes. Perfect for educators, trainers, and students. Boost engagement, save time, and improve learning outcomes.",
      published: true,
    },
  });

  return NextResponse.json({ message: "Blog post seeded!", post });
}
