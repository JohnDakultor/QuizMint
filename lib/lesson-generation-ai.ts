export async function generateLessonAI(
  lessonPlan: any,
  subscriptionPlan: string
) {
  const systemPrompt = `
You are an expert curriculum writer for Philippine public schools.

You are generating STUDENT-FACING LESSON CONTENT
based STRICTLY on a DepEd-compliant lesson plan.

STYLE RULES (VERY STRICT):
- Neutral, academic, instructional tone
- NOT a spoken script
- No role-playing as teacher
- No dialogue
- No commands or questions directed at learners
- No "you will", "let us", "students should"
- No objectives or meta commentary
- No AI narration
- No brackets, parentheses, or stage directions

STRUCTURE RULES:
- Use ONLY the following headings, in this exact order:
  Introduction
  Explanation
  Activity
  Assessment
  Homework

CONTENT RULES:
- Explain concepts clearly and factually
- Describe activities and assessments objectively
- Do NOT ask questions
- Do NOT instruct teachers
- Do NOT include answers
- Content must be suitable for DepEd classrooms

OUTPUT:
- Plain text only
- Section headings with content under each
`;

  const userPrompt = `
Generate a complete lesson using the lesson plan below.

LESSON INFORMATION
Title: ${lessonPlan.title}
Grade Level: ${lessonPlan.grade}
Subject: ${lessonPlan.subject}
Duration: ${lessonPlan.days} day(s), ${lessonPlan.minutesPerDay} minutes per day

INTRODUCTION:
${lessonPlan.introduction}

LESSON PROPER:
Presentation:
${lessonPlan.lessonProper.presentation}

Discussion:
${lessonPlan.lessonProper.discussion}

Guided Practice:
${lessonPlan.lessonProper.guidedPractice}

ACTIVITIES (ALL REQUIRED):
Reading Comprehension Text:
${lessonPlan.activities.readingComprehension.text}

Reading Comprehension Levels:
Literal: ${lessonPlan.activities.readingComprehension.levels.literal.join("; ")}
Inferential: ${lessonPlan.activities.readingComprehension.levels.inferential.join("; ")}
Evaluative: ${lessonPlan.activities.readingComprehension.levels.evaluative.join("; ")}
Applied: ${lessonPlan.activities.readingComprehension.levels.applied.join("; ")}
Creative: ${lessonPlan.activities.readingComprehension.levels.creative.join("; ")}

Checklist:
${lessonPlan.activities.checklist.join("; ")}

True or False:
${lessonPlan.activities.trueOrFalse
  .map((t: any) => t.question)
  .join("; ")}

Matching Type:
${lessonPlan.activities.matchingType
  .map((m: any) => `${m.left} - ${m.right}`)
  .join("; ")}

Multiple Choice:
${lessonPlan.activities.multipleChoice
  .map((m: any) => m.question)
  .join("; ")}

Identification:
Word Bank: ${lessonPlan.activities.identification.wordBank.join(", ")}
Questions: ${lessonPlan.activities.identification.questions.join("; ")}

ASSESSMENT:
${lessonPlan.assessment.join("; ")}

HOMEWORK:
${lessonPlan.assignment.join("; ")}
`;

  const model =
    subscriptionPlan === "free"
      ? "tngtech/deepseek-r1t-chimera:free"
      : "tngtech/deepseek-r1t2-chimera:free";

  const res = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        response_format: { type: "text" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error("AI lesson generation failed");
  }

  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content ??
    "Lesson could not be generated"
  );
}
