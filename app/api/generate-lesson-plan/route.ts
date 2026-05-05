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
import { createHash } from "crypto";
import { normalizeForEmbedding } from "@/lib/rag/embed";
import { checkFeatureBurstLimitDistributed } from "@/lib/abuse-guard";
import { createAsyncGenerationJob } from "@/lib/async-generation-jobs";
import { dispatchAsyncGenerationJob } from "@/lib/async-job-dispatch";
import { log } from "@/lib/logger";
import { enhanceLessonPlanWithContext } from "@/lib/lesson-plan-context-enhancer";
import {
  buildFrameworkPhaseModel,
  getLessonPlanFramework,
  normalizeLessonPlanFramework,
} from "@/lib/lesson-plan-frameworks";
import { attachLessonPlanArtifacts } from "@/lib/lesson-plan-artifacts";
import {
  buildFreeLessonPlanPointsStatusPayload,
  deductFreeLessonPlanPoints,
  getLessonPlanGenerationPointCost,
  isFreeLessonPlanPointLimited,
  restoreFreeLessonPlanPoints,
  type DeductFreeLessonPlanPointsResult,
} from "@/lib/free-tier-points";
import {
  runLessonPlanAssistiveRag,
  storeLessonPlanSemanticCache,
} from "@/lib/lesson-plan-rag-service";
import { invalidateDashboardSummarySnapshot } from "@/lib/dashboard-summary-snapshot";
import { invalidateInterventionSummarySnapshots } from "@/lib/intervention-summary-snapshot";
import { shouldQueueLessonPlanGeneration } from "@/lib/lesson-plan-workload-routing";
import { hasPremiumFeaturePlan } from "@/lib/organization-subscription";

const PROVIDER_ISSUE_MESSAGE =
  "Server issue - we're fixing it. Please try again in a few minutes.";

export const runtime = "nodejs";
const lessonPlanCache = new Map<string, any>();

function hashString(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizeBoundedInt(value: unknown, min: number, max: number, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function splitNonEmptyLines(value: unknown) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFourAsSpecificActivities(input: {
  topic: string;
  subject: string;
  grade: string;
  dayIndex: number;
}) {
  const dayLabel = `Day ${input.dayIndex + 1}`;
  return {
    ACTIVITY: {
      type: "Reading Comprehension",
      readingPassage: `${dayLabel} introduces ${input.topic} through a short ${input.subject} scenario for ${input.grade} learners. Students identify what they already know, notice important vocabulary, and connect the lesson to a classroom or real-world situation.`,
      questions: [
        {
          question: `What prior knowledge helps students begin learning ${input.topic}?`,
          answer: `Students can connect earlier ${input.subject} ideas, vocabulary, and examples to the new focus on ${input.topic}.`,
        },
        {
          question: `Which detail from the opening situation is most important for understanding ${input.topic}?`,
          answer: `The most important detail is the one that shows how ${input.topic} appears or is used in a meaningful ${input.subject} context.`,
        },
        {
          question: `How does this opening activity prepare students for the rest of the lesson?`,
          answer: `It gives students a shared context, surfaces misconceptions, and prepares them to analyze the main concept.`,
        },
      ],
    },
    ANALYSIS: {
      type: "True/False + Checklist",
      trueFalse: [
        {
          statement: `${input.topic} should be understood through examples, explanations, and application.`,
          answer: "True",
          explanation: `A strong ${input.subject} lesson moves students from initial examples to usable understanding.`,
        },
        {
          statement: `Students can master ${input.topic} by memorizing isolated facts only.`,
          answer: "False",
          explanation: `Students also need to analyze relationships and apply ideas in context.`,
        },
        {
          statement: `Discussion can help reveal misconceptions about ${input.topic}.`,
          answer: "True",
          explanation: `Teacher questioning and student explanations make misconceptions visible.`,
        },
      ],
      checklist: [
        `I can identify key ideas about ${input.topic}.`,
        `I can explain how examples connect to the main ${input.subject} concept.`,
        `I can ask or answer questions that clarify misconceptions.`,
      ],
    },
    ABSTRACTION: {
      type: "Concept Matching",
      pairs: [
        { left: "Key Concept", right: `The central idea students must understand about ${input.topic}` },
        { left: "Example", right: `A concrete case that makes ${input.topic} easier to see` },
        { left: "Misconception", right: `A likely misunderstanding students may have about ${input.topic}` },
        { left: "Evidence", right: `A reason or detail that supports an explanation in ${input.subject}` },
        { left: "Application", right: `A task where students use ${input.topic} independently` },
      ],
      explanation: `This phase formalizes the meaning of ${input.topic}, connects vocabulary to examples, and prepares students to use the concept accurately.`,
    },
    APPLICATION: {
      type: "Practice + Identification",
      multipleChoice: [
        {
          question: `Which student action best shows understanding of ${input.topic}?`,
          options: [
            "A. Repeating a definition without an example",
            "B. Applying the idea correctly in a new situation",
            "C. Guessing based on keywords only",
            "D. Avoiding explanation of reasoning",
          ],
          answer: "B",
          explanation: `Using ${input.topic} accurately in a new situation shows transfer, not just recall.`,
        },
        {
          question: `What should the teacher check during application of ${input.topic}?`,
          options: [
            "A. Whether students can explain their reasoning",
            "B. Whether students finish without feedback",
            "C. Whether all answers look identical",
            "D. Whether students avoid challenging items",
          ],
          answer: "A",
          explanation: "Reasoning reveals whether students understand the concept and can correct mistakes.",
        },
      ],
      identification: {
        clues: [
          `The main idea students need to explain about ${input.topic}`,
          `A concrete situation where ${input.topic} is used`,
          `A common error students should avoid`,
        ],
        wordBank: ["Key Concept", "Application", "Misconception", "Evidence"],
        answers: ["Key Concept", "Application", "Misconception"],
      },
    },
  };
}

function buildLessonPrompt(input: {
  framework: string;
  topic: string;
  subject: string;
  grade: string;
  days: number;
  minutesPerDay: number;
  objectives?: string;
  constraints?: string;
  frameworkFocus?: string;
}) {
  const framework = getLessonPlanFramework(input.framework);
  return [
    `Create a ${input.days}-day lesson plan using the ${framework.label} for ${input.topic} in ${input.subject} for ${input.grade} students.`,
    `Each day should be ${input.minutesPerDay} minutes.`,
    `Objectives: ${input.objectives?.trim() || "None specified"}`,
    `Framework-specific focus: ${input.frameworkFocus?.trim() || "None specified"}`,
    `Constraints: ${input.constraints?.trim() || "None specified"}`,
  ].join("\n");
}

function normalizeFrameworkPhaseSequence(input: {
  phases: unknown;
  framework: string;
  topic: string;
  subject: string;
  grade: string;
  minutesPerDay: number;
}) {
  const frameworkConfig = getLessonPlanFramework(input.framework);
  const expectedPhases = frameworkConfig.phases.map((phase) => phase.phase);
  const generated = Array.isArray(input.phases) ? input.phases : [];
  const generatedByPhase = new Map(
    generated
      .filter((phase) => phase && typeof phase === "object")
      .map((phase) => [
        String((phase as Record<string, unknown>).phase || "").trim().toUpperCase(),
        phase as Record<string, unknown>,
      ])
  );

  const hasExactSequence =
    generated.length === expectedPhases.length &&
    generated.every(
      (phase, index) =>
        String((phase as Record<string, unknown>)?.phase || "").trim().toUpperCase() ===
        expectedPhases[index]
    );
  const basePhases = buildFrameworkPhaseModel(input.framework, {
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    minutesPerDay: input.minutesPerDay,
  });

  if (!hasExactSequence) {
    return basePhases.map((base) => {
      const existing = generatedByPhase.get(base.phase);
      if (!existing) return base;
      return {
        ...base,
        title: String(existing.title || base.title),
        description: String(existing.description || base.description),
        teacherRole: String(existing.teacherRole || base.teacherRole),
        studentRole: String(existing.studentRole || base.studentRole),
        materials: Array.isArray(existing.materials) && existing.materials.length
          ? existing.materials
          : base.materials,
      };
    });
  }

  const totalMinutes = generated.reduce(
    (sum, phase) => sum + Number((phase as Record<string, unknown>)?.timeMinutes || 0),
    0
  );
  if (totalMinutes !== input.minutesPerDay) {
    return generated.map((phase, index) => ({
      ...(phase as Record<string, unknown>),
      timeMinutes: basePhases[index]?.timeMinutes || 1,
    }));
  }

  return generated;
}

function isProviderIssueError(err: unknown): boolean {
  const message = String((err as { message?: string })?.message || "");
  return (
    message.includes("AI response failed:") ||
    message.includes("Quota exceeded") ||
    message.includes('"code":402') ||
    message.includes("Provider returned error")
  );
}

function parseLaunchContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const sourceType =
    typeof (value as Record<string, unknown>).sourceType === "string"
      ? String((value as Record<string, unknown>).sourceType)
      : null;
  const sourceId =
    typeof (value as Record<string, unknown>).sourceId === "string"
      ? String((value as Record<string, unknown>).sourceId)
      : null;
  const mode =
    typeof (value as Record<string, unknown>).mode === "string"
      ? String((value as Record<string, unknown>).mode)
      : null;
  if (!sourceType || !sourceId || !mode) return null;
  return {
    sourceType,
    sourceId,
    classId:
      typeof (value as Record<string, unknown>).classId === "string"
        ? String((value as Record<string, unknown>).classId)
        : null,
    className:
      typeof (value as Record<string, unknown>).className === "string"
        ? String((value as Record<string, unknown>).className)
        : null,
    assignmentTitle:
      typeof (value as Record<string, unknown>).assignmentTitle === "string"
        ? String((value as Record<string, unknown>).assignmentTitle)
        : null,
    mode,
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let eventUserId: string | null = null;
  let eventPlan: string | null = null;
  let deductedFreeLessonPlanPoints: DeductFreeLessonPlanPointsResult | null = null;
  const requestId = createRequestId();
  const stageMs: Record<string, number> = {
    ingest: 0,
    rag: 0,
    ai: 0,
    cacheWrite: 0,
    dbWrite: 0,
  };
  try {
    const ensureNotAborted = () => {
      if (req.signal.aborted) {
        const abortedError = new Error("REQUEST_ABORTED");
        (abortedError as Error & { name: string }).name = "AbortError";
        throw abortedError;
      }
    };

    const internalSecret =
      process.env.GENERATION_JOB_INTERNAL_SECRET ||
      process.env.INTERNAL_API_SECRET ||
      "";
    const isInternalTrusted =
      Boolean(internalSecret) &&
      req.headers.get("x-generation-job-secret") === internalSecret;
    const internalUserId = req.headers.get("x-async-user-id");

    let user = null as Awaited<ReturnType<typeof prisma.user.findUnique>>;
    if (isInternalTrusted && internalUserId) {
      user = await prisma.user.findUnique({ where: { id: internalUserId } });
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);
      user = await prisma.user.findUnique({ where: { email: session.user.email } });
    }
    if (!user) return apiError(404, "User not found", requestId);
    eventUserId = user.id;
    eventPlan = user.subscriptionPlan || "free";

    const plan = String(user.subscriptionPlan || "free").trim().toLowerCase();
    const isFree = isFreeLessonPlanPointLimited(plan);

    const burstCheck = await checkFeatureBurstLimitDistributed({
      userId: user.id,
      plan: user.subscriptionPlan,
      feature: "lesson_plan_generate",
    });
    if (!burstCheck.ok) {
      return apiError(
        429,
        `Too many lesson plan requests. Please wait ${burstCheck.retryAfterSec}s and try again.`,
        requestId,
        {
          retryAfterSec: burstCheck.retryAfterSec,
          limitPerMinute: burstCheck.limit,
        }
      );
    }
    const isPremium = hasPremiumFeaturePlan(plan);
    const liteMode = Boolean((user as any).liteMode);
    const debugCounters = process.env.DEBUG_LESSON_COUNTERS === "1";

    const body = await req.json();
    const isAsyncInternal = req.headers.get("x-async-internal") === "1";
    const queueRequested =
      body?.async === true || body?.async === "true" || body?.queue === true;
    const providedLessonPlan = body.lessonPlan;
    const topic = String(body.topic || "").trim();
    const subject = String(body.subject || "").trim();
    const grade = String(body.grade || "").trim();
    const days = normalizeBoundedInt(body.days, 1, 7);
    const minutesPerDay = normalizeBoundedInt(body.minutesPerDay, 10, 120);
    const objectives = body.objectives || "";
    const constraints = body.constraints || "";
    const frameworkFocus = String(body.frameworkFocus || "").trim();
    const framework = normalizeLessonPlanFramework(body.framework);
    const launchContext = parseLaunchContext(body.launchContext);
    const format = typeof body.format === "string" ? body.format.toLowerCase().trim() : "json";
    const frameworkConfig = getLessonPlanFramework(framework);
    const pointCost = getLessonPlanGenerationPointCost();
    const workloadDecision = shouldQueueLessonPlanGeneration(
      {
        topic,
        subject,
        grade,
        framework,
        objectives: [frameworkFocus, objectives].filter(Boolean).join("\n"),
        constraints,
        days,
        minutesPerDay,
        adaptiveLaunch: Boolean(launchContext),
        format,
        hasProvidedPlan: Boolean(providedLessonPlan),
      },
      Number(process.env.LESSON_PLAN_QUEUE_SCORE_THRESHOLD || 6)
    );
    const shouldQueueWorkload = workloadDecision.shouldQueue;

    if (!topic || !subject || !grade || !days || !minutesPerDay) {
      return apiError(400, "Missing required fields", requestId);
    }

    if ((queueRequested || shouldQueueWorkload) && !isAsyncInternal) {
      const queued = await createAsyncGenerationJob({
        userId: user.id,
        type: "lesson_plan_generate",
        request: { body },
        requestId,
      });
      if (!queued) return apiError(500, "Failed to queue generation job", requestId);
      const dispatched = await dispatchAsyncGenerationJob(req, queued.id, {
        subscriptionPlan: user.subscriptionPlan,
      });
      return NextResponse.json(
        {
          ok: true,
          queued: true,
          jobId: queued.id,
          status: queued.status,
          dispatched,
          requestId,
        },
        {
          status: 202,
          headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
        }
      );
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
    const cacheFingerprint = hashString(
      JSON.stringify({
        framework,
        topic,
        subject,
        grade,
        days,
        minutesPerDay,
        objectives,
        constraints,
        frameworkFocus,
      })
    );
    const cacheKey = `${user.id}:${cacheFingerprint}`;
    const basePrompt = buildLessonPrompt({
      framework,
      topic,
      subject,
      grade,
      days,
      minutesPerDay,
      objectives,
      constraints,
      frameworkFocus,
    });
    const namespaceSeed =
      normalizeForEmbedding(
        `${framework}|${frameworkFocus}|${topic}|${subject}|${grade}|${days}|${minutesPerDay}|${objectives}|${constraints}`
      ) ||
      `${framework}|${frameworkFocus}|${topic}|${subject}|${grade}|${days}|${minutesPerDay}`;
    const namespace = `lesson:${user.id}:${hashString(namespaceSeed)}`;

    let lessonPlan: any;
    let lessonAiMeta: {
      retryCount: number;
      fallbackUsed: boolean;
      finalModel: string;
      finalProvider: string | null;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
    } | null = null;
    let sources: { url: string; title?: string }[] = [];
    let sourceMode: "semantic_cache" | "documents" | "none" = "none";
    let cachedResponse: string | null = null;
    let hasContext = false;
    let ragMeta:
      | {
          promptForCache: string;
          embedding: number[];
          namespace: string;
        }
      | null = null;
    let cacheStored = false;
    const useProvidedPlan = Boolean(providedLessonPlan);
    if (isFree && format === "json" && !useProvidedPlan) {
      const pointStatus = buildFreeLessonPlanPointsStatusPayload(
        user,
        pointCost,
        new Date()
      );
      if (!pointStatus.canAfford) {
        return NextResponse.json(
          {
            error: "Not enough free lesson plan credits.",
            ...pointStatus,
            requestId,
          },
          {
            status: 403,
            headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
          }
        );
      }
      deductedFreeLessonPlanPoints = await deductFreeLessonPlanPoints(
        user.id,
        pointCost,
        new Date()
      );
      if (!deductedFreeLessonPlanPoints) {
        return NextResponse.json(
          {
            error: "Not enough free lesson plan credits.",
            ...pointStatus,
            requestId,
          },
          {
            status: 403,
            headers: { "x-request-id": requestId, "Cache-Control": "no-store" },
          }
        );
      }
    }

    if (useProvidedPlan) {
      lessonPlan = providedLessonPlan;
    } else if (format === "docx" && lessonPlanCache.has(cacheKey)) {
      // Check cache first
      lessonPlan = lessonPlanCache.get(cacheKey);
      log.debug("lesson_plan_using_cached_for_docx", { userId: user.id });
    } else {
      try {
        const ragStage = {
          ingest: stageMs.ingest,
          rag: stageMs.rag,
          cacheWrite: stageMs.cacheWrite,
        };
        const ragData = await runLessonPlanAssistiveRag({
          basePrompt,
          namespace,
          topic,
          subject,
          grade,
          liteMode,
          stageMs: ragStage,
        });
        stageMs.ingest = ragStage.ingest;
        stageMs.rag = ragStage.rag;
        stageMs.cacheWrite = ragStage.cacheWrite;
        let promptForGeneration = ragData.promptForGeneration;
        let ragContextText = ragData.ragContextText;
        cachedResponse = ragData.cachedResponse;
        ragMeta = ragData.ragMeta;
        hasContext = ragData.hasContext;
        sourceMode = ragData.sourceMode;
        sources = ragData.sources;

        // Generate lesson plan using 4A's format with separate sections
        log.debug("lesson_plan_ai_start", { userId: user.id, namespace });
        if (cachedResponse) {
          const parsedCached = JSON.parse(cachedResponse);
          const cachedFramework = normalizeLessonPlanFramework(parsedCached?.framework);
          if (cachedFramework === framework) {
            lessonPlan = parsedCached;
          } else {
            cachedResponse = null;
          }
        } else {
          const aiStartedAt = Date.now();
          const lessonAIResult = await generateLessonPlanAIWithMeta({
            framework,
            topic,
            subject,
            grade,
            duration,
            objectives,
            constraints,
            frameworkFocus,
            days,
            minutesPerDay,
            isProOrPremium: !isFree,
            ragContext: hasContext ? ragContextText || promptForGeneration : undefined,
          }, { liteMode });
          stageMs.ai = Date.now() - aiStartedAt;
          lessonPlan = lessonAIResult.lessonPlan;
          lessonAiMeta = lessonAIResult.meta;
        }

        log.debug("lesson_plan_ai_success", {
          userId: user.id,
          dayCount: lessonPlan.days?.length || 0,
        });

        const cacheStage = { cacheWrite: stageMs.cacheWrite };
        cacheStored = await storeLessonPlanSemanticCache({
          liteMode,
          ragMeta,
          cachedResponse,
          lessonPlan,
          namespace,
          stageMs: cacheStage,
        });
        stageMs.cacheWrite = cacheStage.cacheWrite;

        // ENHANCE THE LESSON PLAN WITH CONTEXT
        if (frameworkConfig.supportsSpecificActivities && lessonPlan && lessonPlan.days && lessonPlan.days.length > 0) {
          lessonPlan = enhanceLessonPlanWithContext(lessonPlan, topic, subject, grade);
          log.debug("lesson_plan_context_enhanced", { userId: user.id });
        }
        
        // Cache it
        lessonPlanCache.set(cacheKey, lessonPlan);
        
        // Set cache expiration (5 minutes)
        setTimeout(() => {
          lessonPlanCache.delete(cacheKey);
        }, 5 * 60 * 1000);
      } catch (aiError: any) {
        log.error("lesson_plan_ai_failed", { userId: user.id, err: aiError });
        // Create a basic lesson plan structure when AI fails
        lessonPlan = {
          title: `${topic} - ${subject}`,
          framework,
          frameworkLabel: frameworkConfig.label,
          grade: grade,
          duration: duration,
          objectives: objectives
            ? splitNonEmptyLines(objectives)
            : [
                `Understand key concepts of ${topic} in ${subject}`,
                `Apply ${topic} knowledge to real-world situations`,
                `Analyze ${topic} principles and their significance`,
                `Develop critical thinking skills through ${topic} exploration`
              ],
          days: Array.from({ length: days }, (_, i) => ({
            day: i + 1,
            topic: `${topic} - Day ${i + 1}`,
            "4asModel": buildFrameworkPhaseModel(framework, {
              topic,
              subject,
              grade,
              minutesPerDay,
            }),
            specificActivities: frameworkConfig.supportsSpecificActivities
              ? buildFourAsSpecificActivities({ topic, subject, grade, dayIndex: i })
              : {},
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
        day.framework = framework;
        day.frameworkLabel = frameworkConfig.label;
        day["4asModel"] = normalizeFrameworkPhaseSequence({
          phases: day["4asModel"],
          framework,
          topic,
          subject,
          grade,
          minutesPerDay,
        });

        // Ensure specific activities exist and are properly linked for 4A's only
        if (frameworkConfig.supportsSpecificActivities && (!day.specificActivities || typeof day.specificActivities !== "object")) {
          day.specificActivities = buildFourAsSpecificActivities({ topic, subject, grade, dayIndex: index });
        }

        if (!frameworkConfig.supportsSpecificActivities) {
          day.specificActivities = {};
        } else {
          // Ensure all 4A phases have corresponding activities
          const defaults = buildFourAsSpecificActivities({ topic, subject, grade, dayIndex: index });
          const phases = ["ACTIVITY", "ANALYSIS", "ABSTRACTION", "APPLICATION"];
          phases.forEach(phase => {
            if (!day.specificActivities[phase]) {
              day.specificActivities[phase] = defaults[phase as keyof typeof defaults];
            }
          });
        }
      });
    }

    // Set defaults for overall lesson plan
    if (!lessonPlan.title) lessonPlan.title = `${topic} - ${subject}`;
    lessonPlan.framework = framework;
    lessonPlan.frameworkLabel = frameworkConfig.label;
    lessonPlan.frameworkFocus = frameworkFocus;
    if (!lessonPlan.grade) lessonPlan.grade = grade;
    if (!lessonPlan.duration) lessonPlan.duration = duration;
    if (!lessonPlan.objectives || !Array.isArray(lessonPlan.objectives)) {
      lessonPlan.objectives = objectives
        ? splitNonEmptyLines(objectives)
        : [
            `Understand ${topic} in ${subject} through the ${frameworkConfig.label}`,
            `Apply ${topic} concepts to real-world situations`,
            `Analyze the significance of ${topic} in ${subject}`,
            `Develop critical thinking skills through ${topic} exploration`
          ];
    }

    lessonPlan = attachLessonPlanArtifacts({
      lessonPlan,
      topic,
      subject,
      grade,
      duration,
    });

    ensureNotAborted();

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
          costUsd: 0,
        });
        return new Response(new Uint8Array(docxBuffer), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${topic.replace(/\s+/g, "_")}_Lesson_Plan.docx"`,
          },
        });
      } catch (docxError: any) {
        log.error("lesson_plan_docx_generation_error", { userId: user.id, err: docxError });
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
        }, { liteMode });
        const pptDeck = pptAIResult.deck;
        const pptxBuffer = await generateLessonPlanPptx(pptDeck, { liteMode });
        await trackGenerationEvent({
          userId: user.id,
          eventType: "pptx_generated",
          feature: "lesson_plan_pptx",
          status: "success",
          plan: eventPlan,
          latencyMs: Date.now() - startedAt,
          costUsd: pptAIResult.meta.estimatedCostUsd ?? 0,
          metadata: {
            retryCount: pptAIResult.meta.retryCount,
            fallbackUsed: pptAIResult.meta.fallbackUsed,
            finalModel: pptAIResult.meta.finalModel,
            finalProvider: pptAIResult.meta.finalProvider,
            promptTokens: pptAIResult.meta.promptTokens ?? 0,
            completionTokens: pptAIResult.meta.completionTokens ?? 0,
            totalTokens: pptAIResult.meta.totalTokens ?? 0,
            costUsd: pptAIResult.meta.estimatedCostUsd ?? 0,
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
        log.error("lesson_plan_pptx_generation_error", { userId: user.id, err: pptError });
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
          costUsd: 0,
        });
        
        // Return PDF response
        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${topic.replace(/\s+/g, '_')}_Lesson_Plan.pdf"`
          },
        });
      } catch (pdfError: any) {
        log.error("lesson_plan_pdf_generation_error", { userId: user.id, err: pdfError });
        if (isProviderIssueError(pdfError)) {
          return apiError(503, PROVIDER_ISSUE_MESSAGE, requestId);
        }
        return apiError(500, `Failed to generate PDF: ${pdfError.message}`, requestId);
      }
    }

    ensureNotAborted();

    let savedLessonPlanRecord: { id: string; title: string } | null = null;

    if (format === "json" && !useProvidedPlan) {
      const lessonPlanForStorage =
        !liteMode && (sources?.length || sourceMode !== "none")
          ? {
              ...lessonPlan,
              __sources: sources ?? [],
              __sourceTrace: {
                mode: sourceMode ?? "none",
                fromCache: Boolean(cachedResponse),
                sourceCount: (sources ?? []).length,
              },
            }
          : lessonPlan;
      try {
        const dbWriteStartedAt = Date.now();
        savedLessonPlanRecord = await prisma.lessonPlan.create({
          data: {
            userId: user.id,
            title: lessonPlan.title || `${topic} - ${subject}`,
            topic,
            subject,
            grade,
            duration,
            days,
            minutesPerDay,
            data: lessonPlanForStorage,
          },
          select: {
            id: true,
            title: true,
          },
        });
        stageMs.dbWrite += Date.now() - dbWriteStartedAt;
      } catch (err) {
        log.error("lesson_plan_history_save_failed", { userId: user.id, err });
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
      costUsd: lessonAiMeta?.estimatedCostUsd ?? 0,
      metadata: {
        days,
        minutesPerDay,
        fromProvidedPlan: useProvidedPlan,
        sourceMode: sourceMode ?? "none",
        sourceCount: (sources ?? []).length,
        cacheHit: Boolean(cachedResponse),
        retryCount: lessonAiMeta?.retryCount ?? 0,
        fallbackUsed: lessonAiMeta?.fallbackUsed ?? false,
        finalModel: lessonAiMeta?.finalModel ?? null,
        finalProvider: lessonAiMeta?.finalProvider ?? null,
        promptTokens: lessonAiMeta?.promptTokens ?? 0,
        completionTokens: lessonAiMeta?.completionTokens ?? 0,
        totalTokens: lessonAiMeta?.totalTokens ?? 0,
        costUsd: lessonAiMeta?.estimatedCostUsd ?? 0,
        adaptiveLaunch: Boolean(launchContext),
        interventionSourceType: launchContext?.sourceType ?? null,
        interventionSourceId: launchContext?.sourceId ?? null,
        interventionClassId: launchContext?.classId ?? null,
        interventionClassName: launchContext?.className ?? null,
        interventionAssignmentTitle: launchContext?.assignmentTitle ?? null,
        interventionMode: launchContext?.mode ?? null,
        workloadScore: workloadDecision.score,
        workloadReasons: workloadDecision.reasons,
        stageMs,
      },
    });
    invalidateDashboardSummarySnapshot(user.id);
    invalidateInterventionSummarySnapshots(user.id);
    return new Response(JSON.stringify({ 
      lessonPlan,
      savedLessonPlan: savedLessonPlanRecord,
      request: {
        framework,
        topic,
        subject,
        grade,
        days,
        minutesPerDay,
        duration,
        frameworkFocus,
        objectives,
        constraints,
      },
      ...(liteMode
        ? {}
        : {
            sources: sources ?? [],
            sourceTrace: {
              mode: sourceMode ?? "none",
              fromCache: Boolean(cachedResponse),
              sourceCount: (sources ?? []).length,
            },
          }),
      usage: isFree ? {
        remainingPoints:
          deductedFreeLessonPlanPoints?.availablePoints ??
          buildFreeLessonPlanPointsStatusPayload(user, pointCost).remainingPoints,
        requiredPoints: pointCost,
        maxPoints:
          deductedFreeLessonPlanPoints?.maxPoints ??
          buildFreeLessonPlanPointsStatusPayload(user, pointCost).maxPoints,
        nextRechargeAt:
          deductedFreeLessonPlanPoints?.rechargeAt?.toISOString() ??
          buildFreeLessonPlanPointsStatusPayload(user, pointCost).nextRechargeAt,
      } : null,
      cache: {
        hit: Boolean(cachedResponse),
        stored: cacheStored,
        hasRagMeta: Boolean(ragMeta),
      },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (
      deductedFreeLessonPlanPoints?.userId &&
      deductedFreeLessonPlanPoints.spentPoints > 0
    ) {
      try {
        await restoreFreeLessonPlanPoints(
          deductedFreeLessonPlanPoints.userId,
          deductedFreeLessonPlanPoints.spentPoints
        );
      } catch (restoreErr) {
        log.warn("free_lesson_plan_points_restore_failed", {
          userId: deductedFreeLessonPlanPoints.userId,
          err: restoreErr,
        });
      }
    }

    if (err?.name === "AbortError" || err?.message === "REQUEST_ABORTED") {
      await trackGenerationEvent({
        userId: eventUserId,
        eventType: "pause_clicked",
        feature: "lesson_plan",
        status: "aborted",
        plan: eventPlan,
        latencyMs: Date.now() - startedAt,
        costUsd: 0,
        metadata: { stageMs },
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
        costUsd: 0,
        metadata: {
          providerIssue: true,
          provider: providerError.provider ?? "unknown",
          providerCode: providerError.code,
          stageMs,
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
      costUsd: 0,
      metadata: { message: String(err?.message || "unknown_error"), stageMs },
    });
    return apiError(500, `Internal server error: ${err.message}`, requestId);
  }
}
