// app/api/generate-lesson-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { generateLessonPlanAIWithMeta } from "@/lib/lesson-plan-ai";
import { generateLessonPlanPDF } from "@/lib/lessonPlan-gen-pdf-dl";
import { generateLessonPlanDocx } from "@/lib/generate-lesson-plan-docx";
import { generateLessonPlanPptAIWithMeta } from "@/lib/lesson-plan-ppt-ai";
import { generateLessonPlanPptx } from "@/lib/generate-lesson-plan-pptx";
import { extractProviderErrorDetails, trackGenerationEvent } from "@/lib/generation-events";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";

const FREE_PLAN_LIMIT = 3;
const RESET_HOURS = 3;

const PROVIDER_ISSUE_MESSAGE =
  "Server issue - we're fixing it. Please try again in a few minutes.";

export const runtime = "nodejs";
const lessonPlanCache = new Map<string, any>();

function isProviderIssueError(err: unknown): boolean {
  const message = String((err as { message?: string })?.message || "");
  return (
    message.includes("AI response failed:") ||
    message.includes("Quota exceeded") ||
    message.includes('"code":402') ||
    message.includes("Provider returned error")
  );
}

function enhanceLessonPlanWithContext(lessonPlan: any, topic: string, subject: string, grade: string, dayIndex: number) {
  if (!lessonPlan.days || !Array.isArray(lessonPlan.days)) return lessonPlan;
  
  lessonPlan.days.forEach((day: any, index: number) => {
    const dayNumber = index + 1;
    
    // Enhance 4A's model with more context
    if (day["4asModel"] && Array.isArray(day["4asModel"])) {
      day["4asModel"] = day["4asModel"].map((phase: any, phaseIndex: number) => {
        // Add more detailed descriptions if they're too generic
        if (!phase.description || phase.description.length < 100) {
          switch (phase.phase) {
            case "ACTIVITY":
              phase.description = `Begin by engaging students with a thought-provoking question about ${topic}. Show real-world examples related to ${subject} at the ${grade} level. Have students share prior experiences with ${topic} through think-pair-share. The purpose is to build curiosity and connect to students' existing knowledge about ${topic.split(' ')[0]}.`;
              break;
            case "ANALYSIS":
              phase.description = `Guide students through analyzing key aspects of ${topic}. Present a mini-case study or data set related to ${subject}. Students work in small groups to identify patterns, ask questions, and formulate initial hypotheses. The teacher circulates to probe thinking with questions like "What evidence supports that?" and "How does this connect to what we learned previously?"`;
              break;
            case "ABSTRACTION":
              phase.description = `Direct instruction on core concepts of ${topic}. Use visual aids like diagrams or charts to explain relationships. Address common misconceptions students have about ${topic} in ${subject}. Provide mnemonic devices or strategies to help ${grade} students remember key information. Include worked examples showing step-by-step thinking.`;
              break;
            case "APPLICATION":
              phase.description = `Students apply their understanding of ${topic} to solve problems or complete tasks. Begin with guided practice where the teacher models thinking aloud. Then move to independent practice with scaffolded support. Use formative assessment strategies like exit tickets or quick checks to gauge understanding of ${topic} concepts.`;
              break;
          }
        }
        
        // Enhance teacher role
        if (!phase.teacherRole || phase.teacherRole.split(' ').length < 10) {
          phase.teacherRole = `Facilitate discussions about ${topic}, model thinking processes, provide clear examples from ${subject}, ask probing questions to deepen understanding, differentiate instruction for various learners, and provide immediate feedback on student work.`;
        }
        
        // Enhance student role
        if (!phase.studentRole || phase.studentRole.split(' ').length < 10) {
          phase.studentRole = `Actively participate in discussions, collaborate with peers to analyze ${topic}, take notes on key concepts, ask clarifying questions, apply learning to new situations, and self-assess understanding of ${subject} content.`;
        }
        
        // Enhance materials
        if (!phase.materials || phase.materials.length < 2) {
          phase.materials = [
            `Whiteboard or chart paper for ${topic} concepts`,
            `Printed resources about ${subject}`,
            `Student notebooks for ${grade} level work`,
            `Visual aids related to ${topic}`,
            `Technology for multimedia presentation (if available)`
          ];
        }
        
        return phase;
      });
    }
    
    // Enhance specific activities
    if (day.specificActivities) {
      // Reading Comprehension
      if (day.specificActivities.ACTIVITY) {
        if (!day.specificActivities.ACTIVITY.readingPassage || 
            day.specificActivities.ACTIVITY.readingPassage.length < 100) {
          day.specificActivities.ACTIVITY.readingPassage = `In the study of ${subject}, understanding ${topic} is crucial. For ${grade} students, this means examining how ${topic} functions in real-world contexts. Recent studies show that mastery of ${topic} concepts leads to better understanding of broader ${subject} principles. Students who engage deeply with ${topic} demonstrate improved critical thinking skills and application abilities.`;
        }
        
        // Enhance questions
        if (!day.specificActivities.ACTIVITY.questions || 
            day.specificActivities.ACTIVITY.questions.length < 3) {
          day.specificActivities.ACTIVITY.questions = [
            {
              question: `What is the main focus when studying ${topic} in ${subject}?`,
              answer: `The main focus is understanding how ${topic} functions within the broader context of ${subject}, including its key components, relationships, and practical applications for ${grade} level students.`
            },
            {
              question: `Why is understanding ${topic} important for students at the ${grade} level?`,
              answer: `Understanding ${topic} is important because it provides foundational knowledge for more advanced ${subject} concepts, helps develop critical thinking skills, and has practical applications in real-world situations relevant to ${grade} students.`
            },
            {
              question: `How might you apply your knowledge of ${topic} to a new situation in ${subject}?`,
              answer: `I could apply knowledge of ${topic} by identifying similar patterns in different contexts, using the principles learned to solve related problems, or explaining how ${topic} concepts connect to other areas of ${subject} study.`
            }
          ];
        }
      }
      
      // True/False + Checklist
      if (day.specificActivities.ANALYSIS) {
        if (!day.specificActivities.ANALYSIS.trueFalse || 
            day.specificActivities.ANALYSIS.trueFalse.length < 3) {
          day.specificActivities.ANALYSIS.trueFalse = [
            {
              statement: `${topic} is only relevant to advanced ${subject} studies and not important for ${grade} students.`,
              answer: "False",
              explanation: `${topic} provides foundational concepts essential for ${grade} students to understand broader ${subject} principles and real-world applications.`
            },
            {
              statement: `Understanding ${topic} requires memorizing complex formulas without understanding their meaning.`,
              answer: "False",
              explanation: `True understanding of ${topic} involves grasping underlying concepts and relationships, not just memorization. Application and analysis are key components.`
            },
            {
              statement: `${topic} concepts can be applied to solve real-world problems in ${subject}.`,
              answer: "True",
              explanation: `The principles of ${topic} have practical applications that help solve authentic problems, making the learning relevant and meaningful for ${grade} students.`
            }
          ];
        }
        
        if (!day.specificActivities.ANALYSIS.checklist || 
            day.specificActivities.ANALYSIS.checklist.length < 3) {
          day.specificActivities.ANALYSIS.checklist = [
            `I can explain the main concepts of ${topic} in my own words`,
            `I can identify examples of ${topic} principles in real-world ${subject} contexts`,
            `I can apply ${topic} knowledge to solve basic problems at the ${grade} level`
          ];
        }
      }
      
      // Matching Type
      if (day.specificActivities.ABSTRACTION) {
        if (!day.specificActivities.ABSTRACTION.pairs || 
            day.specificActivities.ABSTRACTION.pairs.length < 5) {
          day.specificActivities.ABSTRACTION.pairs = [
            { left: "Core Concept", right: `The fundamental idea that defines ${topic} in ${subject}` },
            { left: "Application", right: `How ${topic} principles are used in real ${subject} situations` },
            { left: "Analysis", right: `Breaking down ${topic} to understand its components and relationships` },
            { left: "Synthesis", right: `Combining ${topic} knowledge with other concepts to create new understanding` },
            { left: "Evaluation", right: `Assessing the effectiveness or validity of ${topic} applications` }
          ];
        }
        
        if (!day.specificActivities.ABSTRACTION.explanation || 
            day.specificActivities.ABSTRACTION.explanation.length < 100) {
          day.specificActivities.ABSTRACTION.explanation = `These matching pairs represent key aspects of understanding ${topic} in ${subject}. For ${grade} students, mastering these connections helps build a comprehensive framework for applying ${topic} knowledge. The relationships show how theoretical concepts translate to practical applications, which is essential for deep learning in ${subject}.`;
        }
      }
      
      // Multiple Choice + Identification
      if (day.specificActivities.APPLICATION) {
        if (!day.specificActivities.APPLICATION.multipleChoice || 
            day.specificActivities.APPLICATION.multipleChoice.length < 3) {
          day.specificActivities.APPLICATION.multipleChoice = [
            {
              question: `A ${grade} student is trying to apply ${topic} concepts to solve a ${subject} problem. Which approach demonstrates the best understanding?`,
              options: [
                "A. Memorizing the steps without understanding why they work",
                "B. Applying the concepts flexibly to the specific problem context",
                "C. Guessing based on similar-looking problems",
                "D. Asking for the answer without attempting to solve"
              ],
              answer: "B",
              explanation: `Option B demonstrates true understanding by applying ${topic} concepts flexibly to the specific context, showing comprehension rather than just memorization.`
            },
            {
              question: `When analyzing how ${topic} functions in different ${subject} scenarios, what is most important?`,
              options: [
                "A. Finding the fastest solution method",
                "B. Identifying patterns and relationships across contexts",
                "C. Memorizing all possible variations",
                "D. Avoiding any mistakes in calculation"
              ],
              answer: "B",
              explanation: `Identifying patterns and relationships (Option B) shows deeper understanding of ${topic} principles and their applications across different ${subject} contexts.`
            },
            {
              question: `How does understanding ${topic} help ${grade} students in other areas of ${subject}?`,
              options: [
                "A. It doesn't help with other areas",
                "B. It provides isolated knowledge for tests only",
                "C. It builds foundational thinking skills applicable to many topics",
                "D. It complicates other learning with unnecessary details"
              ],
              answer: "C",
              explanation: `Understanding ${topic} develops foundational thinking skills (Option C) that transfer to other areas of ${subject}, enhancing overall learning and problem-solving abilities.`
            }
          ];
        }
        
        if (!day.specificActivities.APPLICATION.identification || 
            !day.specificActivities.APPLICATION.identification.clues ||
            day.specificActivities.APPLICATION.identification.clues.length < 3) {
          day.specificActivities.APPLICATION.identification = {
            clues: [
              `The central idea that defines ${topic} in ${subject}`,
              `A practical use of ${topic} principles in real situations`,
              `The process of examining ${topic} components and their relationships`
            ],
            wordBank: ["Core Concept", "Application", "Analysis", "Synthesis", "Evaluation"],
            answers: ["Core Concept", "Application", "Analysis"]
          };
        }
      }
    }
    
    // Enhance assessment
    if (!day.assessment || day.assessment.length === 0) {
      day.assessment = [
        {
          criteria: `Understanding of ${topic} Concepts`,
          description: `Assesses student's ability to comprehend and apply key principles of ${topic} in ${subject} contexts appropriate for ${grade} level.`,
          rubricLevel: {
            excellent: `Student demonstrates comprehensive understanding by accurately explaining ${topic} concepts, providing multiple relevant examples from ${subject}, applying principles to novel situations, and making connections to broader ${subject} themes.`,
            satisfactory: `Student shows basic understanding by correctly defining ${topic} concepts, providing some relevant examples, applying principles with minor errors, and making limited connections to other ${subject} areas.`,
            needsImprovement: `Student struggles with fundamental ${topic} concepts, provides incorrect or irrelevant examples, makes significant errors in application, and shows difficulty connecting to other ${subject} learning.`
          }
        }
      ];
    }
    
    // Enhance differentiation
    if (!day.differentiation || day.differentiation.length < 50) {
      day.differentiation = `Differentiation strategies for ${topic}:\n- For struggling students: Provide graphic organizers for ${topic} concepts, use sentence starters for responses, offer additional worked examples from ${subject}, and allow partner work.\n- For advanced students: Offer extension problems applying ${topic} to complex ${subject} scenarios, encourage independent research on related topics, and provide opportunities to teach concepts to peers.\n- For ELL students: Use visual aids for ${topic} vocabulary, provide bilingual word banks, allow use of translation tools, and offer additional processing time.\n- For students with special needs: Break ${topic} tasks into smaller steps, provide checklist for task completion, allow alternative response methods, and offer frequent feedback.`;
    }
    
    // Enhance closure
    if (!day.closure || day.closure.length < 50) {
      day.closure = `Lesson closure for Day ${dayNumber}:\n1. Quick review: "Today we explored ${topic} concepts including..."\n2. Connection: "Tomorrow we'll build on this by examining how ${topic} relates to..."\n3. Exit ticket: "On a sticky note, write one thing you learned about ${topic} and one question you still have."\n4. Preview: "For homework, look for examples of ${topic} principles in your daily life or media."`;
    }
  });
  
  return lessonPlan;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  const requestId = createRequestId();
  try {
    const ensureNotAborted = () => {
      if (req.signal.aborted) {
        const abortedError = new Error("REQUEST_ABORTED");
        (abortedError as Error & { name: string }).name = "AbortError";
        throw abortedError;
      }
    };

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return apiError(404, "User not found", requestId);
    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";

    const plan = user.subscriptionPlan || "free";
    const isFree = plan === "free";
    const isPremium = plan === "premium";

    // Check if usage should be reset
    const now = new Date();
    const shouldResetUsage = user.lastLessonPlanAt 
      ? (now.getTime() - user.lastLessonPlanAt.getTime()) > (RESET_HOURS * 60 * 60 * 1000)
      : true;

    // Reset usage if 3 hours have passed
    if (isFree && shouldResetUsage && user.lessonPlanUsage > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lessonPlanUsage: 0,
          lastLessonPlanAt: null 
        },
      });
      
      user.lessonPlanUsage = 0;
      user.lastLessonPlanAt = null;
    }

    // Check if user has reached the limit
    if (isFree && user.lessonPlanUsage >= FREE_PLAN_LIMIT) {
      return NextResponse.json(
        {
          error: "Free limit reached",
          message: `You've reached your limit of ${FREE_PLAN_LIMIT} lesson plans. Please wait 3 hours for your limit to reset or upgrade to premium.`,
          resetTime: user.lastLessonPlanAt
            ? new Date(
                user.lastLessonPlanAt.getTime() + RESET_HOURS * 60 * 60 * 1000
              ).toISOString()
            : null,
          requestId,
        },
        {
          status: 403,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    const body = await req.json();
    const providedLessonPlan = body.lessonPlan;
    const topic = body.topic?.trim();
    const subject = body.subject?.trim();
    const grade = body.grade?.trim();
    const days = Number(body.days);
    const minutesPerDay = Number(body.minutesPerDay);
    const objectives = body.objectives || "";
    const constraints = body.constraints || "";
    const format = typeof body.format === "string" ? body.format.toLowerCase().trim() : "json";

    if (!topic || !subject || !grade || !days || !minutesPerDay) {
      return apiError(400, "Missing required fields", requestId);
    }

    if ((format === "docx" || format === "pdf" || format === "pptx") && !isPremium) {
      return NextResponse.json(
        {
          error: "Premium required",
          message: "Downloads and PPTX generation are available on the Premium plan.",
          requestId,
        },
        {
          status: 403,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }

    const duration = `${days} day(s), ${minutesPerDay} minutes per day`;

    // Create a cache key
    const cacheKey = `${session.user.email}:${topic}:${subject}:${grade}:${days}`;

    let lessonPlan: any;
    let lessonAiMeta: {
      retryCount: number;
      fallbackUsed: boolean;
      finalModel: string;
      finalProvider: string | null;
    } | null = null;
    const useProvidedPlan = Boolean(providedLessonPlan);

    if (useProvidedPlan) {
      lessonPlan = providedLessonPlan;
    } else if (format === "docx" && lessonPlanCache.has(cacheKey)) {
      // Check cache first
      lessonPlan = lessonPlanCache.get(cacheKey);
      console.log("Using cached lesson plan for DOCX generation");
    } else {
      try {
        // Generate lesson plan using 4A's format with separate sections
        console.log("Calling AI to generate lesson plan...");
        const lessonAIResult = await generateLessonPlanAIWithMeta({
          topic,
          subject,
          grade,
          duration,
          objectives,
          constraints,
          days,
          minutesPerDay,
          isProOrPremium: !isFree,
        });
        lessonPlan = lessonAIResult.lessonPlan;
        lessonAiMeta = lessonAIResult.meta;

        console.log("AI generated lesson plan with days:", lessonPlan.days?.length || 0);

        // ENHANCE THE LESSON PLAN WITH CONTEXT
        if (lessonPlan && lessonPlan.days && lessonPlan.days.length > 0) {
          lessonPlan = enhanceLessonPlanWithContext(lessonPlan, topic, subject, grade, 0);
          console.log("Lesson plan enhanced with context");
        }
        
        // Cache it
        lessonPlanCache.set(cacheKey, lessonPlan);
        
        // Set cache expiration (5 minutes)
        setTimeout(() => {
          lessonPlanCache.delete(cacheKey);
        }, 5 * 60 * 1000);
      } catch (aiError: any) {
        console.error("AI generation failed:", aiError);
        // Create a basic lesson plan structure when AI fails
        lessonPlan = {
          title: `${topic} - ${subject}`,
          grade: grade,
          duration: duration,
          objectives: objectives 
            ? objectives.split('\n').filter((obj: string) => obj.trim())
            : [
                `Understand key concepts of ${topic} in ${subject}`,
                `Apply ${topic} knowledge to real-world situations`,
                `Analyze ${topic} principles and their significance`,
                `Develop critical thinking skills through ${topic} exploration`
              ],
          days: Array.from({ length: days }, (_, i) => ({
            day: i + 1,
            topic: `${topic} - Day ${i + 1}`,
            "4asModel": [
              {
                phase: "ACTIVITY",
                title: "Engagement Phase",
                timeMinutes: 10,
                description: `Activate prior knowledge about ${topic} through discussion and real-world examples related to ${subject}. Engage ${grade} students with thought-provoking questions and interactive activities.`,
                teacherRole: `Facilitate discussion about ${topic}, ask probing questions, provide relevant examples from ${subject}, and connect to students' prior knowledge.`,
                studentRole: `Participate actively in discussions, share personal experiences related to ${topic}, ask questions, and make connections to previous learning in ${subject}.`,
                materials: [
                  `Whiteboard or chart paper for ${topic} concepts`,
                  `Printed resources about ${subject}`,
                  `Visual aids related to ${topic}`,
                  `Student notebooks`
                ]
              },
              {
                phase: "ANALYSIS",
                title: "Exploration Phase",
                timeMinutes: 10,
                description: `Guide ${grade} students through analyzing key aspects of ${topic}. Present case studies, data sets, or scenarios related to ${subject} for critical examination and collaborative problem-solving.`,
                teacherRole: `Provide analytical frameworks for examining ${topic}, facilitate small group discussions, ask guiding questions, and help students identify patterns and relationships in ${subject}.`,
                studentRole: `Work collaboratively to analyze ${topic} concepts, ask critical questions, examine evidence, and formulate initial hypotheses about ${subject} principles.`,
                materials: [
                  `Case studies about ${topic}`,
                  `Graphic organizers for analysis`,
                  `Discussion prompts on cards`,
                  `Data sets related to ${subject}`
                ]
              },
              {
                phase: "ABSTRACTION",
                title: "Concept Development",
                timeMinutes: 10,
                description: `Develop comprehensive understanding of ${topic} concepts through direct instruction, visual aids, and worked examples. Address common misconceptions about ${topic} in ${subject}.`,
                teacherRole: `Explain core concepts of ${topic} clearly, use visual representations, provide worked examples, address misconceptions, and offer mnemonic devices for ${grade} students.`,
                studentRole: `Take organized notes on ${topic} concepts, ask clarifying questions, practice explaining ideas to peers, and create visual summaries of ${subject} principles.`,
                materials: [
                  `Presentation slides on ${topic}`,
                  `Visual diagrams and charts`,
                  `Worked example handouts`,
                  `Concept cards for ${subject}`
                ]
              },
              {
                phase: "APPLICATION",
                title: "Practice & Assessment",
                timeMinutes: 10,
                description: `${grade} students apply their understanding of ${topic} to solve authentic problems, complete tasks, and demonstrate mastery. Include formative assessment to gauge learning progress.`,
                teacherRole: `Provide practice opportunities for applying ${topic} concepts, give immediate feedback, assess understanding through various methods, and differentiate support based on student needs.`,
                studentRole: `Apply ${topic} knowledge to solve problems, complete practice tasks, self-assess understanding, demonstrate learning through products or presentations in ${subject}.`,
                materials: [
                  `Practice worksheets for ${topic}`,
                  `Assessment tools and rubrics`,
                  `Exit tickets or quick checks`,
                  `Technology tools for application`
                ]
              }
            ],
            specificActivities: {
              ACTIVITY: {
                type: "Reading Comprehension",
                readingPassage: `Understanding ${topic} is essential in the study of ${subject}. For ${grade} students, this involves examining how ${topic} functions in various contexts and its real-world applications. Mastering ${topic} concepts provides a foundation for more advanced learning in ${subject} and develops critical thinking skills that transfer to other areas. Students who deeply engage with ${topic} demonstrate improved analytical abilities and practical application skills.`,
                questions: [
                  {
                    question: `What are the key components of ${topic} in ${subject}?`,
                    answer: `The key components include the fundamental principles, applications, relationships with other concepts, and practical implications within the broader context of ${subject}.`
                  },
                  {
                    question: `Why is understanding ${topic} particularly important for ${grade} students?`,
                    answer: `Understanding ${topic} is crucial for ${grade} students because it provides essential foundational knowledge, develops critical cognitive skills, and prepares them for more complex ${subject} concepts they will encounter.`
                  },
                  {
                    question: `How might you connect your learning about ${topic} to real-world situations?`,
                    answer: `I could connect ${topic} learning by identifying examples in daily life, applying principles to solve practical problems, and explaining how ${topic} concepts influence decisions and outcomes in ${subject}-related contexts.`
                  }
                ]
              },
              ANALYSIS: {
                type: "True/False + Checklist",
                trueFalse: [
                  {
                    statement: `${topic} knowledge is only useful for academic purposes and has no real-world value.`,
                    answer: "False",
                    explanation: `${topic} has significant real-world applications in ${subject} and provides practical skills that are valuable beyond academic settings.`
                  },
                  {
                    statement: `Mastering ${topic} requires both factual knowledge and critical thinking skills.`,
                    answer: "True",
                    explanation: `True mastery involves understanding facts while also developing the ability to analyze, evaluate, and apply ${topic} concepts in various contexts.`
                  },
                  {
                    statement: `${grade} students are too young to understand complex ${topic} concepts.`,
                    answer: "False",
                    explanation: `${grade} students are capable of understanding appropriately scaffolded ${topic} concepts that build foundational knowledge for future learning in ${subject}.`
                  }
                ],
                checklist: [
                  `I can accurately explain the main concepts of ${topic}`,
                  `I can identify real-world examples of ${topic} principles in ${subject}`,
                  `I can apply ${topic} knowledge to solve basic problems`,
                  `I can analyze how ${topic} concepts connect to broader ${subject} themes`
                ]
              },
              ABSTRACTION: {
                type: "Matching Type",
                pairs: [
                  { left: "Core Principle", right: `The fundamental rule or idea that defines ${topic}` },
                  { left: "Application", right: `How ${topic} concepts are used in practical ${subject} situations` },
                  { left: "Analysis", right: `The process of breaking down ${topic} to understand its components` },
                  { left: "Synthesis", right: `Combining ${topic} knowledge with other ideas to form new understanding` },
                  { left: "Evaluation", right: `Assessing the effectiveness or validity of ${topic} applications` }
                ],
                explanation: `These matching terms represent the different cognitive levels involved in mastering ${topic}. Understanding these connections helps ${grade} students develop comprehensive knowledge that can be applied flexibly across various ${subject} contexts, moving from basic comprehension to higher-order thinking skills.`
              },
              APPLICATION: {
                type: "Multiple Choice + Identification",
                multipleChoice: [
                  {
                    question: `A ${grade} student needs to solve a ${subject} problem using ${topic} concepts. Which strategy demonstrates deep understanding?`,
                    options: [
                      "A. Memorizing formulas without understanding their meaning",
                      "B. Applying concepts flexibly based on the specific problem context",
                      "C. Guessing based on similar-looking previous problems",
                      "D. Avoiding complex problems and focusing only on simple ones"
                    ],
                    answer: "B",
                    explanation: `Applying concepts flexibly shows true understanding and the ability to adapt knowledge to new situations, which is the hallmark of deep learning in ${subject}.`
                  },
                  {
                    question: `When evaluating different approaches to ${topic} in ${subject}, what should students prioritize?`,
                    options: [
                      "A. Speed of completion above all else",
                      "B. Following procedures exactly as taught",
                      "C. Understanding the underlying principles and reasoning",
                      "D. Getting the same answer as classmates"
                    ],
                    answer: "C",
                    explanation: `Understanding principles and reasoning leads to true mastery that can be applied to new situations, rather than just procedural compliance or speed.`
                  },
                  {
                    question: `How does learning about ${topic} help students in other areas of ${subject}?`,
                    options: [
                      "A. It provides isolated facts that only apply to specific tests",
                      "B. It develops thinking skills that transfer to many topics",
                      "C. It complicates learning by adding unnecessary details",
                      "D. It has no connection to other subject areas"
                    ],
                    answer: "B",
                    explanation: `${topic} develops foundational thinking skills like analysis, problem-solving, and critical evaluation that transfer to and enhance learning in many other areas of ${subject}.`
                  }
                ],
                identification: {
                  clues: [
                    `The fundamental idea that governs how ${topic} works`,
                    `A practical situation where ${topic} principles would be useful`,
                    `The process of examining how different aspects of ${topic} relate to each other`
                  ],
                  wordBank: ["Core Principle", "Application", "Analysis", "Synthesis", "Evaluation", "Theory", "Practice"],
                  answers: ["Core Principle", "Application", "Analysis"]
                }
              }
            },
            assessment: [
              {
                criteria: `Understanding of ${topic} Concepts`,
                description: `Evaluates student comprehension and application of key ${topic} principles within ${subject} contexts appropriate for ${grade} level.`,
                rubricLevel: {
                  excellent: `Student demonstrates comprehensive mastery by accurately explaining ${topic} concepts in their own words, providing multiple relevant examples from ${subject}, applying principles correctly to novel situations, making insightful connections to broader ${subject} themes, and articulating the significance of ${topic} learning.`,
                  satisfactory: `Student shows solid understanding by correctly defining ${topic} concepts, providing some relevant examples, applying principles with occasional minor errors, making basic connections to other ${subject} areas, and explaining the importance of ${topic} in general terms.`,
                  needsImprovement: `Student struggles with fundamental ${topic} concepts, provides few or inaccurate examples, makes significant errors in application, shows difficulty connecting to other learning, and demonstrates limited understanding of ${topic}'s importance in ${subject}.`
                }
              },
              {
                criteria: `Critical Thinking and Analysis`,
                description: `Assesses student ability to analyze ${topic} concepts, evaluate evidence, and think critically about ${subject} applications.`,
                rubricLevel: {
                  excellent: `Student demonstrates sophisticated analytical skills by identifying subtle patterns in ${topic} data, evaluating multiple perspectives on ${subject} issues, drawing well-supported conclusions, and proposing innovative applications of ${topic} concepts.`,
                  satisfactory: `Student shows basic analytical ability by identifying obvious patterns, considering limited perspectives, drawing reasonable conclusions with some support, and applying ${topic} concepts to familiar situations.`,
                  needsImprovement: `Student struggles with analysis, identifies few or incorrect patterns, considers only one perspective, draws conclusions without adequate support, and has difficulty applying ${topic} concepts even to familiar contexts.`
                }
              }
            ],
            differentiation: `Differentiation strategies for ${topic} in ${subject}:
• For struggling students: 
  - Provide graphic organizers specifically designed for ${topic} concepts
  - Use sentence starters and structured response frames
  - Offer additional worked examples with step-by-step thinking aloud
  - Allow partner work and peer support during activities
  - Provide vocabulary lists with visual supports for ${subject} terms

• For advanced students:
  - Offer extension problems applying ${topic} to complex, real-world ${subject} scenarios
  - Encourage independent research on related topics or current events involving ${topic}
  - Provide opportunities to teach ${topic} concepts to peers or younger students
  - Challenge with open-ended problems requiring creative application of ${topic}
  - Suggest connections between ${topic} and other subject areas or interdisciplinary topics

• For ELL students:
  - Use visual aids, diagrams, and realia to illustrate ${topic} concepts
  - Provide bilingual vocabulary lists and glossaries for ${subject} terms
  - Allow use of translation tools and bilingual dictionaries
  - Offer additional processing time and opportunities for repetition
  - Use simplified language and check frequently for comprehension

• For students with special needs:
  - Break ${topic} tasks into smaller, manageable steps with clear checkpoints
  - Provide checklists and visual schedules for task completion
  - Allow alternative response methods (verbal, digital, gestural)
  - Offer frequent, specific feedback and positive reinforcement
  - Provide preferential seating and minimize distractions during ${subject} activities`,
            closure: `Lesson closure for Day ${i + 1} - ${topic}:
1. Quick review: "Today we explored ${topic} concepts including [list 2-3 key ideas]. Let's summarize what we learned about how these work in ${subject}."
2. Connection to prior learning: "This connects to what we previously studied about [related concept] because..."
3. Preview of next steps: "Tomorrow we'll build on this foundation by examining how ${topic} relates to [next day's topic]. We'll explore [specific aspect] in more depth."
4. Exit ticket/Reflection: "On your exit ticket, please write: 
   a) One specific thing you learned today about ${topic}
   b) One question you still have or something you'd like to explore further
   c) One real-world situation where you might apply this ${subject} knowledge"
5. Homework/Extension: "For tonight, look for examples of ${topic} principles in your daily life, media, or other subjects. Be prepared to share one observation tomorrow."`
          }))
        }
      }
    }

    // Validate and ensure proper separation
    if (lessonPlan.days && Array.isArray(lessonPlan.days)) {
      lessonPlan.days.forEach((day: any, index: number) => {
        // Ensure 4A's model exists
        if (!day["4asModel"] || !Array.isArray(day["4asModel"])) {
          day["4asModel"] = [
            {
              phase: "ACTIVITY",
              title: "Engagement Phase",
              timeMinutes: 10,
              description: `Activate prior knowledge about ${topic} and generate interest through interactive discussion.`,
              teacherRole: "Facilitator, motivator",
              studentRole: "Active participants, questioners",
              materials: ["Whiteboard", "Markers"]
            },
            {
              phase: "ANALYSIS",
              title: "Exploration Phase",
              timeMinutes: 10,
              description: `Develop critical thinking through guided exploration of ${topic} concepts.`,
              teacherRole: "Questioner, guide",
              studentRole: "Critical thinkers, collaborators",
              materials: ["Whiteboard", "Markers"]
            },
            {
              phase: "ABSTRACTION",
              title: "Concept Development Phase",
              timeMinutes: 10,
              description: `Formal presentation of ${topic} concepts and principles with examples.`,
              teacherRole: "Expert, explainer",
              studentRole: "Concept mappers, note-takers",
              materials: ["Whiteboard", "Markers"]
            },
            {
              phase: "APPLICATION",
              title: "Practice & Assessment Phase",
              timeMinutes: 10,
              description: `Apply ${topic} knowledge and demonstrate understanding through practice.`,
              teacherRole: "Coach, assessor",
              studentRole: "Problem solvers, demonstrators",
              materials: ["Whiteboard", "Markers"]
            }
          ];
        }

        // Ensure specific activities exist and are properly linked
        if (!day.specificActivities || typeof day.specificActivities !== "object") {
          day.specificActivities = {
            ACTIVITY: {
              type: "Reading Comprehension",
              readingPassage: `Passage about ${topic} for Day ${index + 1} in ${subject}`,
              questions: [
                { question: "What is the main idea?", answer: "Main idea..." },
                { question: "What are the key points?", answer: "Key points..." },
                { question: "How does this relate to...?", answer: "Relation..." }
              ]
            },
            ANALYSIS: {
              type: "True/False + Checklist",
              trueFalse: [
                { statement: "Statement 1...", answer: "True" },
                { statement: "Statement 2...", answer: "False" },
                { statement: "Statement 3...", answer: "True" }
              ],
              checklist: ["I understand...", "I can explain...", "I can apply..."]
            },
            ABSTRACTION: {
              type: "Matching Type",
              pairs: [
                { left: "Term 1", right: "Definition 1" },
                { left: "Term 2", right: "Definition 2" },
                { left: "Term 3", right: "Definition 3" },
                { left: "Term 4", right: "Definition 4" },
                { left: "Term 5", right: "Definition 5" }
              ],
              explanation: "These connections help understand the relationships between concepts..."
            },
            APPLICATION: {
              type: "Multiple Choice + Identification",
              multipleChoice: [
                {
                  question: "Multiple choice question 1?",
                  options: ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
                  answer: "A"
                },
                {
                  question: "Multiple choice question 2?",
                  options: ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
                  answer: "B"
                },
                {
                  question: "Multiple choice question 3?",
                  options: ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
                  answer: "C"
                }
              ],
              identification: {
                clues: ["Clue 1...", "Clue 2...", "Clue 3..."],
                wordBank: ["Term1", "Term2", "Term3"],
                answers: ["Term1", "Term2", "Term3"]
              }
            }
          };
        }

        // Ensure all 4 phases have corresponding activities
        const phases = ["ACTIVITY", "ANALYSIS", "ABSTRACTION", "APPLICATION"];
        phases.forEach(phase => {
          if (!day.specificActivities[phase]) {
            // Create default activity for missing phase
            switch (phase) {
              case "ACTIVITY":
                day.specificActivities[phase] = {
                  type: "Reading Comprehension",
                  readingPassage: `Default passage about ${topic}...`,
                  questions: Array(3).fill({ question: "...", answer: "..." })
                };
                break;
              case "ANALYSIS":
                day.specificActivities[phase] = {
                  type: "True/False + Checklist",
                  trueFalse: Array(3).fill({ statement: "...", answer: "True" }),
                  checklist: Array(3).fill("Checklist item")
                };
                break;
              case "ABSTRACTION":
                day.specificActivities[phase] = {
                  type: "Matching Type",
                  pairs: Array(5).fill({ left: "...", right: "..." }),
                  explanation: "Default explanation..."
                };
                break;
              case "APPLICATION":
                day.specificActivities[phase] = {
                  type: "Multiple Choice + Identification",
                  multipleChoice: Array(3).fill({
                    question: "...",
                    options: ["A. ...", "B. ...", "C. ...", "D. ..."],
                    answer: "A"
                  }),
                  identification: {
                    clues: Array(3).fill("Clue..."),
                    wordBank: ["Term1", "Term2", "Term3"],
                    answers: ["Term1", "Term2", "Term3"]
                  }
                };
                break;
            }
          }
        });
      });
    }

    // Set defaults for overall lesson plan
    if (!lessonPlan.title) lessonPlan.title = `${topic} - ${subject}`;
    if (!lessonPlan.grade) lessonPlan.grade = grade;
    if (!lessonPlan.duration) lessonPlan.duration = duration;
    if (!lessonPlan.objectives || !Array.isArray(lessonPlan.objectives)) {
      lessonPlan.objectives = objectives 
        ? objectives.split('\n').filter((obj: string) => obj.trim())
        : [
            `Understand ${topic} in ${subject} through the 4A's instructional model`,
            `Apply ${topic} concepts to real-world situations`,
            `Analyze the significance of ${topic} in ${subject}`,
            `Develop critical thinking skills through ${topic} exploration`
          ];
    }

    ensureNotAborted();

    // Increment usage for free users (only for JSON requests, not DOCX downloads)
    if (isFree && format === "json" && !useProvidedPlan) {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lessonPlanUsage: user.lessonPlanUsage + 1, 
          lastLessonPlanAt: now 
        },
      });
    }

    // Handle DOCX format
    if (format === "docx") {
      try {
        const docxBuffer = await generateLessonPlanDocx(lessonPlan);
        await trackGenerationEvent({
          userId: user.id,
          eventType: "lesson_generated",
          feature: "lesson_plan_docx",
          status: "success",
          plan: eventPlan,
          latencyMs: Date.now() - startedAt,
        });
        return new Response(new Uint8Array(docxBuffer), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${topic.replace(/\s+/g, "_")}_Lesson_Plan.docx"`,
          },
        });
      } catch (docxError: any) {
        console.error("DOCX Generation Error:", docxError);
        if (isProviderIssueError(docxError)) {
          return apiError(503, PROVIDER_ISSUE_MESSAGE, requestId);
        }
        return apiError(500, `Failed to generate DOCX: ${docxError.message}`, requestId);
      }
    }

    if (format === "pptx") {
      try {
        const pptAIResult = await generateLessonPlanPptAIWithMeta({
          lessonPlan,
          topic,
          subject,
          grade,
          duration,
          isProOrPremium: !isFree,
        });
        const pptDeck = pptAIResult.deck;
        const pptxBuffer = await generateLessonPlanPptx(pptDeck);
        await trackGenerationEvent({
          userId: user.id,
          eventType: "pptx_generated",
          feature: "lesson_plan_pptx",
          status: "success",
          plan: eventPlan,
          latencyMs: Date.now() - startedAt,
          metadata: {
            retryCount: pptAIResult.meta.retryCount,
            fallbackUsed: pptAIResult.meta.fallbackUsed,
            finalModel: pptAIResult.meta.finalModel,
            finalProvider: pptAIResult.meta.finalProvider,
            slideCount: Array.isArray(pptDeck?.slides) ? pptDeck.slides.length : 0,
          },
        });
        return new Response(new Uint8Array(pptxBuffer), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "Content-Disposition": `attachment; filename="${topic.replace(/\s+/g, "_")}_Lesson_Plan.pptx"`,
          },
        });
      } catch (pptError: any) {
        console.error("PPTX Generation Error:", pptError);
        if (isProviderIssueError(pptError)) {
          return apiError(503, PROVIDER_ISSUE_MESSAGE, requestId);
        }
        return apiError(500, `Failed to generate PPTX: ${pptError.message}`, requestId);
      }
    }


    if (format === "pdf") {
      try {
        // Generate PDF
        const pdfBuffer = await generateLessonPlanPDF(lessonPlan, topic);
        await trackGenerationEvent({
          userId: user.id,
          eventType: "lesson_generated",
          feature: "lesson_plan_pdf",
          status: "success",
          plan: eventPlan,
          latencyMs: Date.now() - startedAt,
        });
        
        // Return PDF response
        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${topic.replace(/\s+/g, '_')}_Lesson_Plan.pdf"`
          },
        });
      } catch (pdfError: any) {
        console.error("PDF Generation Error:", pdfError);
        if (isProviderIssueError(pdfError)) {
          return apiError(503, PROVIDER_ISSUE_MESSAGE, requestId);
        }
        return apiError(500, `Failed to generate PDF: ${pdfError.message}`, requestId);
      }
    }

    ensureNotAborted();

    if (format === "json" && !useProvidedPlan) {
      try {
        await prisma.lessonPlan.create({
          data: {
            userId: user.id,
            title: lessonPlan.title || `${topic} - ${subject}`,
            topic,
            subject,
            grade,
            duration,
            days,
            minutesPerDay,
            data: lessonPlan,
          },
        });
      } catch (err) {
        console.error("Failed to save lesson plan history:", err);
      }
    }

    ensureNotAborted();

    // Return JSON response with usage info
    await trackGenerationEvent({
      userId: user.id,
      eventType: "lesson_generated",
      feature: "lesson_plan",
      status: "success",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      metadata: {
        days,
        minutesPerDay,
        fromProvidedPlan: useProvidedPlan,
        retryCount: lessonAiMeta?.retryCount ?? 0,
        fallbackUsed: lessonAiMeta?.fallbackUsed ?? false,
        finalModel: lessonAiMeta?.finalModel ?? null,
        finalProvider: lessonAiMeta?.finalProvider ?? null,
      },
    });
    return new Response(JSON.stringify({ 
      lessonPlan,
      usage: isFree ? {
        used: user.lessonPlanUsage + 1,
        limit: FREE_PLAN_LIMIT,
        resetsIn: RESET_HOURS * 60 * 60 * 1000,
        nextReset: new Date(now.getTime() + (RESET_HOURS * 60 * 60 * 1000)).toISOString()
      } : null
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.message === "REQUEST_ABORTED") {
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "pause_clicked",
        feature: "lesson_plan",
        status: "aborted",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Generation paused by user", requestId },
        {
          status: 499,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
    }
    logApiError(requestId, "generate-lesson-plan", err);
    if (isProviderIssueError(err)) {
      const providerError = extractProviderErrorDetails(err);
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "lesson_generated",
        feature: "lesson_plan",
        status: "failed",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        metadata: {
          providerIssue: true,
          provider: providerError.provider ?? "unknown",
          providerCode: providerError.code,
        },
      });
      return apiError(503, PROVIDER_ISSUE_MESSAGE, requestId);
    }
    await trackGenerationEvent({
      userId: eventUserId,
      eventType: "lesson_generated",
      feature: "lesson_plan",
      status: "failed",
      plan: eventPlan,
      latencyMs: Date.now() - startedAt,
      metadata: { message: String(err?.message || "unknown_error") },
    });
    return apiError(500, `Internal server error: ${err.message}`, requestId);
  }
}
