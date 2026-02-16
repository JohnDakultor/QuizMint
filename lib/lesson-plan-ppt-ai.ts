// lib/lesson-plan-ppt-ai.ts
interface LessonPlanPptInput {
  lessonPlan: any;
  topic: string;
  subject: string;
  grade: string;
  duration: string;
  isProOrPremium: boolean;
}

export interface PptSlide {
  title: string;
  bullets: string[];
  body?: string;
  notes?: string;
  imagePrompt?: string;
}

export interface PptDeck {
  title: string;
  subtitle?: string;
  slides: PptSlide[];
}

function trimText(text: string, max: number) {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function safeArray<T = any>(value: any): T[] {
  if (!Array.isArray(value)) return [];
  return value;
}

function extractRichContentFromLessonPlan(lessonPlan: any) {
  const days = safeArray<any>(lessonPlan?.days || []);
  
  if (days.length === 0) {
    return [];
  }
  
  return days.map((day: any, idx: number) => {
    const activities = day?.specificActivities || {};
    const dayTopic = day?.topic || `Day ${idx + 1}`;
    
    // Extract ALL possible content from lesson plan
    const keyConcepts: string[] = [];
    const examples: string[] = [];
    const practiceItems: string[] = [];
    
    // From ACTIVITY phase
    if (activities?.ACTIVITY) {
      // Reading passage
      if (activities.ACTIVITY.readingPassage) {
        keyConcepts.push(trimText(activities.ACTIVITY.readingPassage, 180));
      }
      
      // Questions from reading
      const readingQuestions = safeArray(activities.ACTIVITY.questions);
      readingQuestions.forEach((q: any) => {
        if (q?.question) {
          practiceItems.push(`📖 Question: ${trimText(q.question, 100)}`);
        }
      });
    }
    
    // From ANALYSIS phase
    if (activities?.ANALYSIS) {
      // True/False statements
      const trueFalse = safeArray(activities.ANALYSIS.trueFalse);
      trueFalse.forEach((tf: any) => {
        if (tf?.statement) {
          keyConcepts.push(`✓ ${trimText(tf.statement, 120)}`);
        }
      });
      
      // Checklist items
      const checklist = safeArray(activities.ANALYSIS.checklist);
      checklist.forEach((item: string) => {
        if (item) {
          keyConcepts.push(`✅ ${trimText(item, 100)}`);
        }
      });
    }
    
    // From ABSTRACTION phase
    if (activities?.ABSTRACTION) {
      // Explanation
      if (activities.ABSTRACTION.explanation) {
        keyConcepts.push(trimText(activities.ABSTRACTION.explanation, 200));
      }
      
      // Matching pairs
      const pairs = safeArray(activities.ABSTRACTION.pairs);
      pairs.forEach((pair: any) => {
        if (pair?.left && pair?.right) {
          keyConcepts.push(`${trimText(pair.left, 30)} → ${trimText(pair.right, 80)}`);
        }
      });
    }
    
    // From APPLICATION phase
    if (activities?.APPLICATION) {
      // Multiple choice questions
      const mcq = safeArray(activities.APPLICATION.multipleChoice);
      mcq.forEach((q: any) => {
        if (q?.question) {
          practiceItems.push(`❓ ${trimText(q.question, 100)}`);
        }
      });
      
      // Real world examples
      const realWorldExamples = safeArray(activities.APPLICATION.realWorldExamples);
      realWorldExamples.forEach((ex: any) => {
        if (ex?.example) {
          examples.push(trimText(ex.example, 120));
        }
      });
      
      // Identification clues
      const identification = activities.APPLICATION.identification;
      if (identification?.clues) {
        const clues = safeArray(identification.clues);
        clues.forEach((clue: string) => {
          examples.push(`🔍 ${trimText(clue, 100)}`);
        });
      }
    }
    
    // From 4asModel
    const fourAs = safeArray(day["4asModel"]);
    fourAs.forEach((phase: any) => {
      if (phase?.description) {
        keyConcepts.push(trimText(phase.description, 150));
      }
    });
    
    const assessment = safeArray<any>(day?.assessment).map((a: any) => ({
      criteria: trimText(a?.criteria || `Understanding`, 80),
      description: trimText(a?.description || `Demonstrates knowledge`, 120),
    }));

    return {
      day: day?.day ?? idx + 1,
      topic: trimText(dayTopic, 80),
      keyConcepts: keyConcepts.length > 0 ? keyConcepts : [`Key ideas about ${dayTopic}`],
      examples: examples.length > 0 ? examples : [`Examples related to ${dayTopic}`],
      practiceItems: practiceItems.length > 0 ? practiceItems : [`Practice applying ${dayTopic}`],
      assessment,
      closure: trimText(day?.closure || `Review and reflect on ${dayTopic}`, 180),
      differentiation: trimText(day?.differentiation || `Different approaches for different learners`, 150),
    };
  });
}

export async function generateLessonPlanPptAI(input: LessonPlanPptInput): Promise<PptDeck> {
  const extractedContent = extractRichContentFromLessonPlan(input.lessonPlan);
  
  // Build comprehensive outline from ALL available data
  const outline = {
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    duration: input.duration,
    title: trimText(input.lessonPlan?.title || `${input.topic} Lesson`, 100),
    days: extractedContent,
    objectives: safeArray<string>(input.lessonPlan?.objectives).map((o) => trimText(o, 120)),
    materials: safeArray<string>(input.lessonPlan?.materials).map((m) => trimText(m, 80)),
    standards: safeArray<string>(input.lessonPlan?.standards).map((s) => trimText(s, 100))
  };

  // Dynamic system prompt that doesn't hardcode topics
  const systemPrompt = `You are an expert teacher creating STUDENT-FACING presentation slides for ANY TOPIC.

CRITICAL RULES:
1. ALL slide content (title, bullets, body) MUST be written directly TO STUDENTS
2. Teacher instructions go ONLY in "notes" field
3. Generate SPECIFIC, CONTENT-RICH slides based on the provided lesson plan data
4. Use the extracted content from the lesson plan to create engaging educational material

SLIDE CONTENT REQUIREMENTS:
- Titles: Clear and descriptive
- Bullets: 3-5 concise points with ACTUAL LEARNING CONTENT (max 15 words each)
- Body: 2-3 sentences explaining concepts TO STUDENTS
- Notes: Optional instructional guidance FOR TEACHERS ONLY

OUTPUT FORMAT (ONLY VALID JSON):
{
  "title": "Lesson Title",
  "subtitle": "Subject • Grade",
  "slides": [
    {
      "title": "Slide Title",
      "bullets": ["Content point 1", "Content point 2", ...],
      "body": "Explanation for students...",
      "notes": "Optional teacher guidance"
    }
  ]
}`;

  // Dynamic user prompt that uses ALL available data
  const userPrompt = `Create a COMPLETE, CONTENT-RICH classroom presentation using this lesson plan data:

TOPIC: ${input.topic}
SUBJECT: ${input.subject}
GRADE LEVEL: ${input.grade}
DURATION: ${input.duration}

LESSON TITLE: ${outline.title}

LEARNING OBJECTIVES:
${outline.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n') || 'No specific objectives provided'}

MATERIALS/STANDARDS:
${outline.materials.map(m => `• ${m}`).join('\n')}
${outline.standards.map(s => `• ${s}`).join('\n')}

DAILY CONTENT (${outline.days.length} days):
${outline.days.map(day => `
DAY ${day.day}: ${day.topic}
• Key Concepts: ${day.keyConcepts.slice(0, 3).join('; ')}
• Examples: ${day.examples.slice(0, 2).join('; ')}
• Practice: ${day.practiceItems.slice(0, 2).join('; ')}
• Assessment: ${day.assessment.map(a => a.criteria).join(', ')}
• Closure: ${day.closure}
`).join('\n')}

INSTRUCTIONS:
1. Create student-facing slides that TEACH about "${input.topic}"
2. Use the provided content from each day to create specific slides
3. Make content age-appropriate for ${input.grade} grade
4. Include engaging examples and clear explanations
5. Structure: Title → Objectives → Daily content → Summary
6. Each slide should have ACTUAL EDUCATIONAL CONTENT

IMPORTANT: DO NOT make generic slides. Use the specific content provided above to create meaningful educational material about "${input.topic}".`;

  const model = input.isProOrPremium
    ? process.env.OPENROUTER_MODEL_PRO ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera"
    : process.env.OPENROUTER_MODEL_FREE ||
      process.env.OPENROUTER_MODEL ||
      "tngtech/deepseek-r1t2-chimera";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://quizmints.com",
        "X-Title": "Quizmints PPT Generator",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`PPT AI request failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const parsed = safeExtractJSON(raw);
    
    if (!parsed?.slides || !Array.isArray(parsed.slides)) {
      console.warn("Invalid PPT AI response, using content-rich fallback");
      return buildContentRichFallbackDeck(input, outline);
    }
    
    const deck = parsed as PptDeck;
    deck.slides = deck.slides.map((slide) => ({
      ...slide,
      imagePrompt:
        slide.imagePrompt ||
        [deck.title || outline.title, slide.title, slide.body]
          .filter(Boolean)
          .join(" - ")
          .slice(0, 300),
    }));
    
    // Validate we have enough content
    const totalContent = deck.slides.reduce((sum, slide) => {
      return sum + (slide.bullets?.join(' ').length || 0) + (slide.body?.length || 0);
    }, 0);
    
    if (totalContent < 500 || deck.slides.length < 6) {
      console.warn("AI generated insufficient content, using fallback");
      return buildContentRichFallbackDeck(input, outline);
    }

    deck.title = deck.title || outline.title;
    deck.subtitle = deck.subtitle || `${input.subject} • ${input.grade}`;
    
    return deck;
  } catch (err) {
    console.error("PPT AI generation failed:", err);
    return buildContentRichFallbackDeck(input, outline);
  }
}

function buildContentRichFallbackDeck(input: LessonPlanPptInput, outline: any): PptDeck {
  const slides: PptSlide[] = [];
  
  // Title Slide - dynamic
  slides.push({
    title: outline.title || `${input.topic} Lesson`,
    bullets: [
      `Subject: ${input.subject}`,
      `Grade: ${input.grade}`,
      `Duration: ${input.duration}`,
      `Focus: Comprehensive study of ${input.topic}`
    ],
    body: `Welcome to our lesson on ${input.topic}. We will explore key concepts, analyze examples, and develop practical understanding through engaging activities and discussions.`,
    notes: `Teacher: Begin with a hook question about ${input.topic}. Connect to students' experiences and prior knowledge.`,
  });

  // Objectives Slide - use actual objectives or create dynamic ones
  const objectives = outline.objectives?.length > 0 
    ? outline.objectives 
    : [
        `Understand the core principles of ${input.topic}`,
        `Apply knowledge of ${input.topic} to real-world situations`,
        `Analyze examples and case studies related to ${input.topic}`,
        `Develop critical thinking skills through ${input.topic}`
      ];
  
  slides.push({
    title: "What You Will Learn",
    bullets: objectives.slice(0, 5),
    body: "These objectives guide our learning journey. By the end of this lesson, you'll have practical skills and knowledge you can apply in various contexts.",
    notes: "Teacher: Review each objective. Explain how activities connect to learning goals.",
  });

  // Materials/Standards if available
  if (outline.materials?.length > 0 || outline.standards?.length > 0) {
    slides.push({
      title: "What You Need",
      bullets: [
        ...outline.materials.slice(0, 4).map((m: undefined | string) => `📚 ${m}`),
        ...outline.standards.slice(0, 2).map((s: any) => `🎯 ${s}`)
      ],
      body: "These materials will help us succeed, and these standards guide what we need to learn and demonstrate.",
      notes: "Teacher: Ensure all materials are ready. Explain relevance of standards.",
    });
  }

  // Daily content - USE ACTUAL EXTRACTED CONTENT
  outline.days.forEach((day: any) => {
    // Day Overview - dynamic
    slides.push({
      title: `Day ${day.day}: ${day.topic}`,
      bullets: [
        `Today's focus: ${day.topic}`,
        `Key questions we'll explore`,
        `Skills we'll practice`,
        `Real-world connections`
      ],
      body: `In today's session, we'll delve into ${day.topic}. We'll examine concepts, work with examples, and build understanding through guided practice.`,
      notes: `Teacher: Preview the day's activities. Connect ${day.topic} to broader theme of ${input.topic}.`,
    });

    // Key Concepts - USE ACTUAL CONTENT
    slides.push({
      title: "Essential Knowledge",
      bullets: day.keyConcepts?.slice(0, 5) || [
        `Fundamental principles of ${day.topic}`,
        `Key terminology and definitions`,
        `Important relationships and patterns`,
        `Core skills and competencies`
      ],
      body: "These are the building blocks of understanding. Pay close attention as we explore each of these important concepts.",
      notes: "Teacher: Present concepts clearly. Use examples and visuals. Check for understanding.",
    });

    // Examples - USE ACTUAL CONTENT
    slides.push({
      title: "Examples in Action",
      bullets: day.examples?.slice(0, 4) || [
        `Real-world application of ${day.topic}`,
        `Case study demonstrating key principles`,
        `Historical or contemporary example`,
        `Personal connection to ${day.topic}`
      ],
      body: "Let's see how these concepts work in practice. Examine each example and think about how it illustrates what we're learning.",
      notes: "Teacher: Guide analysis. Ask: 'What does this show?' 'How does this connect to concepts?'",
    });

    // Practice - USE ACTUAL CONTENT
    slides.push({
      title: "Practice & Application",
      bullets: day.practiceItems?.slice(0, 4) || [
        `Apply concepts to solve a problem`,
        `Analyze a scenario using ${day.topic}`,
        `Create an example demonstrating understanding`,
        `Discuss with peers to deepen learning`
      ],
      body: "Now it's your turn to apply what you've learned. Work through these activities to build confidence and mastery.",
      notes: "Teacher: Monitor and support. Encourage collaboration. Address misconceptions.",
    });

    // Assessment & Closure
    slides.push({
      title: "Show What You Know",
      bullets: [
        ...(day.assessment?.slice(0, 2).map((a: any) => `${a.criteria}: ${a.description}`) || []),
        day.closure ? "Closing reflection" : "Review key takeaways",
        "Prepare for next steps"
      ],
      body: "Demonstrate your understanding and reflect on today's learning. What insights did you gain? What questions remain?",
      notes: `Teacher: Conduct assessment. Review answers. Facilitate closure discussion about ${day.topic}.`,
    });
  });

  // Summary Slide - dynamic
  slides.push({
    title: "Lesson Summary",
    bullets: [
      `Key concepts covered about ${input.topic}`,
      `Skills developed through practice`,
      `Real-world applications explored`,
      `Connections to broader learning goals`
    ],
    body: `We've built a strong foundation in ${input.topic}. Remember these key ideas as you continue your learning journey and apply them in new contexts.`,
    notes: "Teacher: Review main points. Address remaining questions. Preview future learning.",
  });

  // Reflection/Next Steps
  slides.push({
    title: "Next Steps & Reflection",
    bullets: [
      "Review your notes and key concepts",
      "Identify areas for further exploration",
      "Apply learning to personal interests",
      "Prepare for continued learning"
    ],
    body: "Take a moment to reflect on what you've learned. Consider how you can apply this knowledge beyond the classroom.",
    notes: "Teacher: Provide extension resources. Encourage ongoing learning. Collect feedback.",
  });

  return {
    title: outline.title || `${input.topic} Lesson`,
    subtitle: `${input.subject} • ${input.grade}`,
    slides,
  };
}

function safeExtractJSON(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (innerErr) {
      console.error("Failed to extract JSON from AI response");
    }
    throw new Error("No valid JSON found in response");
  }
}
