// lib/lesson-plan-ai.ts - FIXED VERSION
interface LessonPlanInput {
  topic: string;
  subject: string;
  grade: string;
  duration: string;
  objectives: string;
  constraints: string;
  days: number;
  minutesPerDay: number;
  isProOrPremium: boolean;
}

export async function generateLessonPlanAI(input: LessonPlanInput) {
  console.log("Generating lesson plan for:", input);
  
  const systemPrompt = `You are Quizmints AI, a highly experienced DepEd-aligned lesson plan generator. You have 20+ years of teaching experience and create comprehensive, practical lesson plans that teachers can implement immediately.

IMPORTANT: You MUST return valid JSON in the exact format specified below. DO NOT include any additional text, explanations, or markdown code blocks outside the JSON.

OUTPUT FORMAT (STRICT JSON ONLY - NO OTHER TEXT):
{
  "title": "Comprehensive Lesson: [Topic] for [Grade] [Subject]",
  "grade": "[Exact grade level from input]",
  "duration": "[Duration from input]",
  "objectives": [
    "By the end of the lesson, students will be able to...",
    "Students will demonstrate understanding of...",
    "Learners will apply knowledge of..."
  ],
  "days": [
    {
      "day": 1,
      "topic": "Specific sub-topic for Day 1",
      "4asModel": [
        {
          "phase": "ACTIVITY",
          "title": "Engagement: Connecting to Real World",
          "timeMinutes": 10,
          "description": "Detailed description...",
          "teacherRole": "Specific actions...",
          "studentRole": "Specific actions...",
          "materials": ["Item 1", "Item 2"]
        },
        {
          "phase": "ANALYSIS",
          "title": "Exploration: Investigating Key Concepts",
          "timeMinutes": 10,
          "description": "Detailed description...",
          "teacherRole": "Specific actions...",
          "studentRole": "Specific actions...",
          "materials": ["Item 1", "Item 2"]
        },
        {
          "phase": "ABSTRACTION",
          "title": "Concept Development: Building Understanding",
          "timeMinutes": 10,
          "description": "Detailed description...",
          "teacherRole": "Specific actions...",
          "studentRole": "Specific actions...",
          "materials": ["Item 1", "Item 2"]
        },
        {
          "phase": "APPLICATION",
          "title": "Practice & Assessment: Using Knowledge",
          "timeMinutes": 10,
          "description": "Detailed description...",
          "teacherRole": "Specific actions...",
          "studentRole": "Specific actions...",
          "materials": ["Item 1", "Item 2"]
        }
      ],
      "specificActivities": {
        "ACTIVITY": {
          "type": "Reading Comprehension",
          "readingPassage": "A 100-150 word engaging passage...",
          "questions": [
            {"question": "Literal question...", "answer": "Detailed answer..."},
            {"question": "Inferential question...", "answer": "Detailed answer..."},
            {"question": "Critical question...", "answer": "Detailed answer..."}
          ]
        },
        "ANALYSIS": {
          "type": "True/False + Checklist",
          "trueFalse": [
            {"statement": "Statement...", "answer": "True/False", "explanation": "Brief explanation..."},
            {"statement": "Statement...", "answer": "True/False", "explanation": "Brief explanation..."},
            {"statement": "Statement...", "answer": "True/False", "explanation": "Brief explanation..."}
          ],
          "checklist": ["Item 1", "Item 2", "Item 3"]
        },
        "ABSTRACTION": {
          "type": "Matching Type",
          "pairs": [
            {"left": "Term 1", "right": "Definition 1"},
            {"left": "Term 2", "right": "Definition 2"},
            {"left": "Term 3", "right": "Definition 3"},
            {"left": "Term 4", "right": "Definition 4"},
            {"left": "Term 5", "right": "Definition 5"}
          ],
          "explanation": "Detailed explanation..."
        },
        "APPLICATION": {
          "type": "Multiple Choice + Identification",
          "multipleChoice": [
            {
              "question": "Scenario-based question...",
              "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
              "answer": "B",
              "explanation": "Detailed explanation..."
            }
          ],
          "identification": {
            "clues": ["Clue 1", "Clue 2", "Clue 3"],
            "wordBank": ["Term1", "Term2", "Term3", "Term4", "Term5"],
            "answers": ["Term1", "Term2", "Term3"]
          }
        }
      },
      "assessment": [
        {
          "criteria": "Understanding of Concepts",
          "description": "Assesses student's ability...",
          "rubricLevel": {
            "excellent": "Student demonstrates comprehensive understanding...",
            "satisfactory": "Student shows basic understanding...",
            "needsImprovement": "Student struggles with fundamental concepts..."
          }
        }
      ],
      "differentiation": "Concrete strategies for different learners...",
      "closure": "Specific end-of-lesson activity..."
    }
  ]
}`;

  const userPrompt = `Generate a ${input.days}-day lesson plan for ${input.topic} in ${input.subject} for ${input.grade} students. Each day should be ${input.minutesPerDay} minutes. Make it detailed, practical, and classroom-ready.

TOPIC: ${input.topic}
SUBJECT: ${input.subject}
GRADE: ${input.grade}
DURATION: ${input.days} days, ${input.minutesPerDay} minutes per day
OBJECTIVES: ${input.objectives || "No specific objectives provided"}
CONSTRAINTS: ${input.constraints || "No constraints"}

Generate ${input.days} days of content. Make sure each day has:
1. Different sub-topic for each day
2. Complete 4A's model with all 4 phases
3. Specific activities for each phase
4. Assessment criteria
5. Differentiation strategies
6. Lesson closure

Return ONLY valid JSON, no other text.`;

  const model = input.isProOrPremium
    ? process.env.OPENROUTER_MODEL_PRO ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera"
    : process.env.OPENROUTER_MODEL_FREE ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera";

  try {
    console.log("Calling OpenRouter API with model:", model);
    
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quizmints.com",
        "X-Title": "Quizmints Lesson Plan Generator"
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { 
            role: "system", 
            content: systemPrompt 
          },
          { 
            role: "user", 
            content: userPrompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("OpenRouter API Error:", res.status, errorText);
      throw new Error(`API request failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    console.log("OpenRouter response received");
    
    const raw = data?.choices?.[0]?.message?.content || "";
    
    if (!raw) {
      console.error("Empty response from AI");
      throw new Error("Empty response from AI");
    }

    console.log("Raw response length:", raw.length);
    console.log("First 500 chars:", raw.substring(0, 500));

    const lessonPlan = safeExtractJSON(raw);
    
    // Validate the lesson plan structure
    if (!lessonPlan.days || !Array.isArray(lessonPlan.days) || lessonPlan.days.length === 0) {
      console.error("Invalid lesson plan structure - no days array");
      throw new Error("Generated lesson plan has invalid structure");
    }
    
    return lessonPlan;
    
  } catch (error: any) {
    console.error("Error in generateLessonPlanAI:", error.message);
    // Return a minimal valid structure instead of falling back completely
    return createMinimalValidLessonPlan(input);
  }
}

function safeExtractJSON(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error: any) {
    console.warn("Direct JSON parsing failed:", error?.message);
    try {
      const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/\u0000/g, "")
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in AI response");
      }

      const jsonString = jsonMatch[0];
      try {
        return JSON.parse(jsonString);
      } catch {
        return attemptJSONRepair(jsonString);
      }
    } catch (repairError: any) {
      console.error("JSON parsing failed:", repairError?.message || repairError);
      console.error("Raw response sample:", raw.substring(0, 500));
      throw new Error("No valid JSON found in response");
    }
  }
}

function attemptJSONRepair(jsonString: string) {
  let repaired = jsonString;

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([\]}])/g, "$1");

  // Normalize common mojibake quotes
  repaired = repaired.replace(/[â€œâ€]/g, '"');
  repaired = repaired.replace(/[â€˜â€™]/g, "'");

  // Normalize escaped newlines
  repaired = repaired.replace(/\\n/g, "\n");
  repaired = repaired.replace(/\r\n/g, "\n");

  // If quotes are unbalanced, trim to the last complete quote
  const quoteCount = (repaired.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) {
    const lastQuote = repaired.lastIndexOf('"');
    if (lastQuote > -1) {
      repaired = repaired.slice(0, lastQuote + 1);
    }
  }

  // Balance braces/brackets if output is truncated
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;

  if (closeBraces < openBraces) {
    repaired += "}".repeat(openBraces - closeBraces);
  }
  if (closeBrackets < openBrackets) {
    repaired += "]".repeat(openBrackets - closeBrackets);
  }

  return JSON.parse(repaired);
}

function createMinimalValidLessonPlan(input: LessonPlanInput) {
  console.log("Creating minimal valid lesson plan for:", input);
  
  const days = [];
  for (let i = 0; i < input.days; i++) {
    days.push({
      day: i + 1,
      topic: `${input.topic} - Day ${i + 1}`,
      "4asModel": [
        {
          phase: "ACTIVITY",
          title: "Engagement Phase",
          timeMinutes: 10,
          description: `Activate prior knowledge about ${input.topic} through discussion and real-world examples.`,
          teacherRole: "Facilitate discussion, ask probing questions, provide examples",
          studentRole: "Participate in discussion, share experiences, ask questions",
          materials: ["Whiteboard", "Markers", "Visual aids"]
        },
        {
          phase: "ANALYSIS",
          title: "Exploration Phase",
          timeMinutes: 10,
          description: `Analyze key concepts of ${input.topic} through guided inquiry and group work.`,
          teacherRole: "Guide analysis, provide resources, facilitate group discussions",
          studentRole: "Analyze information, collaborate in groups, draw conclusions",
          materials: ["Case studies", "Graphic organizers", "Discussion prompts"]
        },
        {
          phase: "ABSTRACTION",
          title: "Concept Development",
          timeMinutes: 10,
          description: `Develop understanding of core ${input.topic} concepts through direct instruction.`,
          teacherRole: "Explain concepts, provide examples, address misconceptions",
          studentRole: "Take notes, ask clarifying questions, practice explanations",
          materials: ["Presentation slides", "Handouts", "Examples"]
        },
        {
          phase: "APPLICATION",
          title: "Practice & Assessment",
          timeMinutes: 10,
          description: `Apply knowledge of ${input.topic} to solve problems and demonstrate understanding.`,
          teacherRole: "Provide practice tasks, give feedback, assess understanding",
          studentRole: "Complete practice tasks, self-assess, demonstrate learning",
          materials: ["Practice worksheets", "Assessment tools", "Feedback forms"]
        }
      ],
      specificActivities: {
        ACTIVITY: {
          type: "Reading Comprehension",
          readingPassage: `This passage introduces ${input.topic} in the context of ${input.subject}. ${input.topic} is important for ${input.grade} students because it helps them understand ${input.subject} principles and their real-world applications.`,
          questions: [
            {
              question: `What is the main purpose of studying ${input.topic}?`,
              answer: `The main purpose is to understand how ${input.topic} functions and applies to real-world situations in ${input.subject}.`
            },
            {
              question: `Why is ${input.topic} relevant to ${input.grade} students?`,
              answer: `${input.topic} is relevant because it provides foundational knowledge that helps students understand broader concepts in ${input.subject} and apply them practically.`
            },
            {
              question: `How can you apply what you learn about ${input.topic}?`,
              answer: `You can apply ${input.topic} knowledge by solving problems, analyzing situations, and making connections to other areas of ${input.subject}.`
            }
          ]
        },
        ANALYSIS: {
          type: "True/False + Checklist",
          trueFalse: [
            {
              statement: `${input.topic} is only theoretical and has no practical applications.`,
              answer: "False",
              explanation: `${input.topic} has many practical applications in real-world ${input.subject} contexts.`
            },
            {
              statement: `Understanding ${input.topic} requires both memorization and critical thinking.`,
              answer: "True",
              explanation: `True understanding involves both knowing facts and applying critical thinking skills.`
            },
            {
              statement: `${input.topic} concepts are too advanced for ${input.grade} students.`,
              answer: "False",
              explanation: `${input.topic} concepts are appropriately leveled for ${input.grade} students with proper scaffolding.`
            }
          ],
          checklist: [
            `I can explain the main concepts of ${input.topic}`,
            `I can identify examples of ${input.topic} in real life`,
            `I can apply ${input.topic} knowledge to basic problems`
          ]
        },
        ABSTRACTION: {
          type: "Matching Type",
          pairs: [
            { left: "Core Concept", right: `The fundamental idea behind ${input.topic}` },
            { left: "Application", right: `How ${input.topic} is used in practice` },
            { left: "Analysis", right: `Examining ${input.topic} components and relationships` },
            { left: "Synthesis", right: `Combining ${input.topic} knowledge with other ideas` },
            { left: "Evaluation", right: `Assessing the value or effectiveness of ${input.topic}` }
          ],
          explanation: `These terms represent different aspects of understanding ${input.topic}. Mastering these connections helps build comprehensive knowledge that can be applied in various ${input.subject} contexts.`
        },
        APPLICATION: {
          type: "Multiple Choice + Identification",
          multipleChoice: [
            {
              question: `A ${input.grade} student needs to apply ${input.topic} knowledge. Which approach shows the best understanding?`,
              options: [
                "A. Memorizing definitions without understanding",
                "B. Applying concepts flexibly to new situations",
                "C. Guessing based on surface similarities",
                "D. Avoiding any attempt at application"
              ],
              answer: "B",
              explanation: `Applying concepts flexibly shows deep understanding rather than just memorization or guessing.`
            }
          ],
          identification: {
            clues: [
              `The main idea that defines ${input.topic}`,
              `A real-world use of ${input.topic} principles`,
              `The process of examining how ${input.topic} works`
            ],
            wordBank: ["Core Concept", "Application", "Analysis", "Theory", "Practice"],
            answers: ["Core Concept", "Application", "Analysis"]
          }
        }
      },
      assessment: [
        {
          criteria: `Understanding of ${input.topic}`,
          description: `Assesses student's comprehension and application of ${input.topic} concepts`,
          rubricLevel: {
            excellent: `Student demonstrates thorough understanding by accurately explaining concepts, providing relevant examples, and applying knowledge to new situations.`,
            satisfactory: `Student shows basic understanding with some ability to explain and apply concepts, but may need guidance with complex applications.`,
            needsImprovement: `Student struggles with fundamental concepts and has difficulty explaining or applying knowledge.`
          }
        }
      ],
      differentiation: `Differentiation for ${input.topic}:
• Struggling students: Provide graphic organizers, sentence starters, additional examples, partner work
• Advanced students: Offer extension problems, independent research opportunities, peer teaching
• ELL students: Use visual aids, bilingual vocabulary, translation tools, additional processing time
• Special needs: Break tasks into steps, provide checklists, allow alternative responses, frequent feedback`,
      closure: `Lesson closure:
1. Quick review: "Today we learned about ${input.topic} including..."
2. Connection: "Tomorrow we'll connect this to..."
3. Exit ticket: "One thing I learned and one question I still have"
4. Preview: "Look for examples of ${input.topic} in daily life"`
    });
  }
  
  return {
    title: `${input.topic} - ${input.subject} Lesson Plan`,
    grade: input.grade,
    duration: `${input.days} day(s), ${input.minutesPerDay} minutes per day`,
    objectives: input.objectives 
      ? input.objectives.split('\n').filter(obj => obj.trim())
      : [
          `Understand key concepts of ${input.topic} in ${input.subject}`,
          `Apply ${input.topic} knowledge to real-world situations`,
          `Analyze ${input.topic} principles and their significance`
        ],
    days
  };
}
