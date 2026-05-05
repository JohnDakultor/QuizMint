export type LessonPlanFrameworkId =
  | "four_as"
  | "five_e"
  | "ubd"
  | "gradual_release"
  | "project_based"
  | "blooms"
  | "direct_instruction";

export type LessonPlanFrameworkPhase = {
  phase: string;
  title: string;
  subtitle: string;
  description: string;
  teacherRole: string;
  studentRole: string;
  materialsHint: string[];
};

export type LessonPlanFrameworkCard = {
  phase: string;
  title: string;
  subtitle: string;
  desc: string;
  shell: string;
  badge: string;
  titleColor: string;
};

export type LessonPlanFrameworkConfig = {
  id: LessonPlanFrameworkId;
  label: string;
  shortLabel: string;
  description: string;
  sectionTitle: string;
  sectionBadgeText: string;
  specificActivitiesTitle: string;
  specificActivitiesBadge: string;
  supportsSpecificActivities: boolean;
  focusInputLabel: string;
  focusInputPlaceholder: string;
  objectiveHint: string;
  constraintHint: string;
  cards: LessonPlanFrameworkCard[];
  phases: LessonPlanFrameworkPhase[];
};

const sharedShells = {
  blue:
    "border-blue-200/80 bg-gradient-to-br from-blue-50 to-white shadow-[0_10px_24px_-18px_rgba(37,99,235,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  emerald:
    "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white shadow-[0_10px_24px_-18px_rgba(16,185,129,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  violet:
    "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white shadow-[0_10px_24px_-18px_rgba(139,92,246,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  amber:
    "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-[0_10px_24px_-18px_rgba(245,158,11,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  rose:
    "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white shadow-[0_10px_24px_-18px_rgba(244,63,94,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  cyan:
    "border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-white shadow-[0_10px_24px_-18px_rgba(6,182,212,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
};

export const LESSON_PLAN_FRAMEWORKS: Record<LessonPlanFrameworkId, LessonPlanFrameworkConfig> = {
  four_as: {
    id: "four_as",
    label: "4A's Instructional Model",
    shortLabel: "4A's",
    description:
      "Generate comprehensive lesson plans using the 4A's instructional model with clear separation between pedagogical framework and activity types.",
    sectionTitle: "4A's Pedagogical Framework",
    sectionBadgeText: "4 Phases",
    specificActivitiesTitle: "Specific Activity Types",
    specificActivitiesBadge: "Linked to 4A's phases",
    supportsSpecificActivities: true,
    focusInputLabel: "4A's Activity Focus",
    focusInputPlaceholder:
      "Optional: describe the opening activity, local context, or practice product you want the 4A's plan to build toward.",
    objectiveHint: "Use observable objectives that move from activity to analysis, abstraction, and application.",
    constraintHint: "Mention available materials, class size, time pressure, learner needs, or required activity types.",
    cards: [
      {
        phase: "ACTIVITY",
        title: "Activity",
        subtitle: "Engagement Phase",
        desc: "Activate prior knowledge",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-blue-600",
        titleColor: "text-blue-700",
      },
      {
        phase: "ANALYSIS",
        title: "Analysis",
        subtitle: "Exploration Phase",
        desc: "Develop critical thinking",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        titleColor: "text-emerald-700",
      },
      {
        phase: "ABSTRACTION",
        title: "Abstraction",
        subtitle: "Concept Development",
        desc: "Present concepts & principles",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-violet-600",
        titleColor: "text-violet-700",
      },
      {
        phase: "APPLICATION",
        title: "Application",
        subtitle: "Practice & Assessment",
        desc: "Apply real-world skills",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
    ],
    phases: [
      {
        phase: "ACTIVITY",
        title: "Engagement Phase",
        subtitle: "Activate prior knowledge",
        description: "Connect learners to the lesson through hooks, prior knowledge, and relevant context.",
        teacherRole: "Motivate, connect, and spark curiosity.",
        studentRole: "Recall prior ideas, participate, and engage.",
        materialsHint: ["Hook prompt", "Visual aids", "Starter task"],
      },
      {
        phase: "ANALYSIS",
        title: "Exploration Phase",
        subtitle: "Develop critical thinking",
        description: "Guide students to investigate examples, patterns, and relationships.",
        teacherRole: "Facilitate inquiry and guide discussion.",
        studentRole: "Explore, compare, discuss, and analyze.",
        materialsHint: ["Case examples", "Guided questions", "Group worksheet"],
      },
      {
        phase: "ABSTRACTION",
        title: "Concept Development",
        subtitle: "Formalize understanding",
        description: "Consolidate the key concepts, principles, and takeaways from the exploration.",
        teacherRole: "Explain, model, and clarify misconceptions.",
        studentRole: "Synthesize understanding and take notes.",
        materialsHint: ["Slides", "Concept map", "Worked examples"],
      },
      {
        phase: "APPLICATION",
        title: "Practice & Assessment",
        subtitle: "Apply learning",
        description: "Have learners demonstrate understanding through guided or independent application.",
        teacherRole: "Coach, assess, and provide feedback.",
        studentRole: "Apply, practice, and demonstrate mastery.",
        materialsHint: ["Practice task", "Rubric", "Exit ticket"],
      },
    ],
  },
  five_e: {
    id: "five_e",
    label: "5E Instructional Model",
    shortLabel: "5E",
    description:
      "Generate inquiry-driven lesson plans using the 5E model for structured exploration, explanation, and evaluation.",
    sectionTitle: "5E Learning Sequence",
    sectionBadgeText: "5 Phases",
    specificActivitiesTitle: "Framework Activities",
    specificActivitiesBadge: "Optional framework-linked activities",
    supportsSpecificActivities: false,
    focusInputLabel: "Inquiry Focus",
    focusInputPlaceholder:
      "Optional: describe the phenomenon, investigation, data set, or question students should explore.",
    objectiveHint: "Use objectives that include inquiry, explanation, transfer, and evidence of understanding.",
    constraintHint: "Mention lab limits, materials, safety concerns, grouping, or assessment requirements.",
    cards: [
      {
        phase: "ENGAGE",
        title: "Engage",
        subtitle: "Spark curiosity",
        desc: "Hook learners into the topic",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "EXPLORE",
        title: "Explore",
        subtitle: "Investigate concepts",
        desc: "Hands-on inquiry and discovery",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
      {
        phase: "EXPLAIN",
        title: "Explain",
        subtitle: "Build meaning",
        desc: "Clarify and formalize learning",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "ELABORATE",
        title: "Elaborate",
        subtitle: "Extend understanding",
        desc: "Transfer learning to new cases",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
      {
        phase: "EVALUATE",
        title: "Evaluate",
        subtitle: "Check mastery",
        desc: "Assess understanding and growth",
        shell: sharedShells.rose,
        badge: "bg-gradient-to-r from-rose-500 to-pink-500",
        titleColor: "text-rose-700",
      },
    ],
    phases: [
      {
        phase: "ENGAGE",
        title: "Engage",
        subtitle: "Hook and activate thinking",
        description: "Capture interest and connect the topic to prior knowledge or real-life context.",
        teacherRole: "Present an engaging stimulus and activate prior knowledge.",
        studentRole: "Observe, respond, predict, and connect ideas.",
        materialsHint: ["Prompt", "Hook media", "Starter question"],
      },
      {
        phase: "EXPLORE",
        title: "Explore",
        subtitle: "Inquiry and discovery",
        description: "Let learners investigate, experiment, or gather evidence through guided exploration.",
        teacherRole: "Facilitate exploration and guide without over-explaining.",
        studentRole: "Investigate, collaborate, and gather evidence.",
        materialsHint: ["Lab/task sheet", "Data source", "Manipulatives"],
      },
      {
        phase: "EXPLAIN",
        title: "Explain",
        subtitle: "Clarify the concept",
        description: "Develop shared meaning and explicitly connect student discoveries to core content.",
        teacherRole: "Clarify concepts and connect findings to formal ideas.",
        studentRole: "Discuss findings and articulate understanding.",
        materialsHint: ["Slides", "Examples", "Anchor chart"],
      },
      {
        phase: "ELABORATE",
        title: "Elaborate",
        subtitle: "Extend learning",
        description: "Transfer the concept to new contexts, more complex situations, or interdisciplinary tasks.",
        teacherRole: "Provide extension tasks and scaffold transfer.",
        studentRole: "Apply ideas in new situations and deepen reasoning.",
        materialsHint: ["Extension task", "Scenario cards", "Challenge prompt"],
      },
      {
        phase: "EVALUATE",
        title: "Evaluate",
        subtitle: "Measure understanding",
        description: "Assess conceptual understanding, skills, and misconceptions with reflective checks.",
        teacherRole: "Assess, give feedback, and surface misconceptions.",
        studentRole: "Demonstrate understanding and reflect on learning.",
        materialsHint: ["Quiz", "Rubric", "Reflection prompt"],
      },
    ],
  },
  ubd: {
    id: "ubd",
    label: "Understanding by Design (UbD)",
    shortLabel: "UbD",
    description:
      "Generate backward-designed lesson plans using UbD so learning goals, evidence, and lesson flow stay tightly aligned.",
    sectionTitle: "UbD Backward Design Flow",
    sectionBadgeText: "3 Stages",
    specificActivitiesTitle: "Learning Plan Extensions",
    specificActivitiesBadge: "Optional stage-linked activities",
    supportsSpecificActivities: false,
    focusInputLabel: "Transfer Goal",
    focusInputPlaceholder:
      "Optional: describe the enduring understanding, essential question, or performance task students should prepare for.",
    objectiveHint: "Write objectives as desired results, essential understandings, and evidence of transfer.",
    constraintHint: "Mention assessment evidence, rubric requirements, standards, or performance-task conditions.",
    cards: [
      {
        phase: "DESIRED_RESULTS",
        title: "Desired Results",
        subtitle: "Learning goals",
        desc: "Clarify outcomes and big ideas",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "EVIDENCE",
        title: "Evidence",
        subtitle: "Success criteria",
        desc: "Define how mastery is shown",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "LEARNING_PLAN",
        title: "Learning Plan",
        subtitle: "Instructional path",
        desc: "Sequence teaching and practice",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
    ],
    phases: [
      {
        phase: "DESIRED_RESULTS",
        title: "Desired Results",
        subtitle: "Outcomes and understandings",
        description: "Clarify the enduring understandings, essential questions, and targeted learning outcomes.",
        teacherRole: "Define outcomes and focus the lesson on transfer-worthy learning.",
        studentRole: "Understand goals, success targets, and the purpose of learning.",
        materialsHint: ["Success criteria", "Essential questions", "Goal board"],
      },
      {
        phase: "EVIDENCE",
        title: "Evidence",
        subtitle: "Assessment planning",
        description: "Specify what evidence will show understanding, transfer, and skill mastery.",
        teacherRole: "Design assessment checkpoints and exemplars.",
        studentRole: "Examine criteria and prepare to demonstrate mastery.",
        materialsHint: ["Rubric", "Performance task", "Checklist"],
      },
      {
        phase: "LEARNING_PLAN",
        title: "Learning Plan",
        subtitle: "Daily learning experiences",
        description: "Sequence the learning experiences, scaffolds, and practice that lead students to mastery.",
        teacherRole: "Sequence instruction, modeling, and practice.",
        studentRole: "Participate, practice, reflect, and improve.",
        materialsHint: ["Lesson sequence", "Practice tasks", "Reflection prompts"],
      },
    ],
  },
  gradual_release: {
    id: "gradual_release",
    label: "Gradual Release of Responsibility",
    shortLabel: "I Do, We Do, You Do",
    description:
      "Generate scaffolded lessons that move from teacher modeling to guided practice, collaborative practice, and independent mastery.",
    sectionTitle: "Gradual Release Sequence",
    sectionBadgeText: "4 Phases",
    specificActivitiesTitle: "Practice Supports",
    specificActivitiesBadge: "Scaffolded practice",
    supportsSpecificActivities: false,
    focusInputLabel: "Skill or Strategy to Release",
    focusInputPlaceholder:
      "Optional: name the exact skill, procedure, thinking routine, or worked-example pattern students should master independently.",
    objectiveHint: "Use objectives that specify what students first observe, practice with support, and then do independently.",
    constraintHint: "Mention prerequisite gaps, grouping, modeling needs, practice volume, or independent-task expectations.",
    cards: [
      {
        phase: "I_DO",
        title: "I Do",
        subtitle: "Model the skill",
        desc: "Teacher demonstrates expert thinking",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "WE_DO",
        title: "We Do",
        subtitle: "Guided practice",
        desc: "Class practices with prompts",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
      {
        phase: "YOU_DO_TOGETHER",
        title: "You Do Together",
        subtitle: "Collaborative practice",
        desc: "Peers apply with support",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "YOU_DO_ALONE",
        title: "You Do Alone",
        subtitle: "Independent mastery",
        desc: "Students demonstrate transfer",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
    ],
    phases: [
      {
        phase: "I_DO",
        title: "I Do",
        subtitle: "Teacher modeling",
        description: "Model the target skill with think-alouds, worked examples, and explicit success criteria.",
        teacherRole: "Demonstrate expert thinking and name each decision clearly.",
        studentRole: "Observe, annotate, ask clarifying questions, and notice success criteria.",
        materialsHint: ["Worked example", "Think-aloud script", "Success criteria"],
      },
      {
        phase: "WE_DO",
        title: "We Do",
        subtitle: "Guided practice",
        description: "Practice the skill together with prompts, checks for understanding, and immediate correction.",
        teacherRole: "Prompt, question, correct misconceptions, and gradually reduce support.",
        studentRole: "Respond, try steps with support, explain reasoning, and revise.",
        materialsHint: ["Guided practice items", "Mini whiteboards", "Prompt cards"],
      },
      {
        phase: "YOU_DO_TOGETHER",
        title: "You Do Together",
        subtitle: "Collaborative practice",
        description: "Let pairs or groups apply the skill while using peer discussion and light teacher coaching.",
        teacherRole: "Monitor, confer, and target support where needed.",
        studentRole: "Collaborate, justify choices, compare approaches, and support peers.",
        materialsHint: ["Partner task", "Checklist", "Discussion stems"],
      },
      {
        phase: "YOU_DO_ALONE",
        title: "You Do Alone",
        subtitle: "Independent application",
        description: "Have each learner demonstrate independent mastery and reflect on next steps.",
        teacherRole: "Assess mastery, give feedback, and assign next-step support or extension.",
        studentRole: "Complete the task independently and reflect on confidence and accuracy.",
        materialsHint: ["Independent task", "Exit ticket", "Rubric"],
      },
    ],
  },
  project_based: {
    id: "project_based",
    label: "Project-Based Learning (PBL)",
    shortLabel: "PBL",
    description:
      "Generate lessons around an authentic driving question, sustained inquiry, creation, critique, and public presentation.",
    sectionTitle: "PBL Learning Cycle",
    sectionBadgeText: "5 Phases",
    specificActivitiesTitle: "Project Milestones",
    specificActivitiesBadge: "Inquiry and product milestones",
    supportsSpecificActivities: false,
    focusInputLabel: "Driving Question or Product",
    focusInputPlaceholder:
      "Optional: add the driving question, audience, final product, community problem, or presentation format.",
    objectiveHint: "Use objectives that combine content mastery, inquiry skills, collaboration, and product quality.",
    constraintHint: "Mention available tools, product format, audience, group size, deadlines, or presentation limits.",
    cards: [
      {
        phase: "ENTRY_EVENT",
        title: "Entry Event",
        subtitle: "Launch the challenge",
        desc: "Create need-to-know questions",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "DRIVING_QUESTION",
        title: "Driving Question",
        subtitle: "Plan inquiry",
        desc: "Define goals and roles",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
      {
        phase: "INQUIRY",
        title: "Inquiry",
        subtitle: "Research and learn",
        desc: "Gather evidence and content",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "CREATE_CRITIQUE",
        title: "Create and Critique",
        subtitle: "Build and revise",
        desc: "Improve products with feedback",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
      {
        phase: "PRESENT_REFLECT",
        title: "Present and Reflect",
        subtitle: "Share learning",
        desc: "Present, assess, and reflect",
        shell: sharedShells.rose,
        badge: "bg-gradient-to-r from-rose-500 to-pink-500",
        titleColor: "text-rose-700",
      },
    ],
    phases: [
      {
        phase: "ENTRY_EVENT",
        title: "Entry Event",
        subtitle: "Authentic launch",
        description: "Introduce an authentic problem or scenario that creates curiosity and a need to learn.",
        teacherRole: "Launch the scenario and collect student questions.",
        studentRole: "React, ask questions, identify what they need to know, and connect to purpose.",
        materialsHint: ["Scenario", "Video/image prompt", "Need-to-know chart"],
      },
      {
        phase: "DRIVING_QUESTION",
        title: "Driving Question and Plan",
        subtitle: "Define the project path",
        description: "Clarify the driving question, success criteria, roles, timeline, and first inquiry steps.",
        teacherRole: "Facilitate planning and make expectations explicit.",
        studentRole: "Unpack the question, plan roles, and set product goals.",
        materialsHint: ["Project brief", "Rubric", "Planning board"],
      },
      {
        phase: "INQUIRY",
        title: "Sustained Inquiry",
        subtitle: "Research and skill building",
        description: "Build content knowledge through research, mini-lessons, interviews, data, or investigation.",
        teacherRole: "Teach just-in-time skills, curate sources, and coach evidence use.",
        studentRole: "Research, collect evidence, practice skills, and refine questions.",
        materialsHint: ["Sources", "Research organizer", "Mini-lesson materials"],
      },
      {
        phase: "CREATE_CRITIQUE",
        title: "Create and Critique",
        subtitle: "Prototype and revise",
        description: "Create the product or solution, receive critique, and revise using criteria.",
        teacherRole: "Structure feedback cycles and support revision.",
        studentRole: "Draft, critique, revise, and document decisions.",
        materialsHint: ["Prototype tools", "Feedback protocol", "Revision checklist"],
      },
      {
        phase: "PRESENT_REFLECT",
        title: "Present and Reflect",
        subtitle: "Public product and reflection",
        description: "Present the product, assess against criteria, and reflect on content and process learning.",
        teacherRole: "Facilitate presentation, assessment, and reflection.",
        studentRole: "Present, answer questions, self-assess, and reflect.",
        materialsHint: ["Presentation format", "Audience questions", "Reflection prompt"],
      },
    ],
  },
  blooms: {
    id: "blooms",
    label: "Bloom's Taxonomy Progression",
    shortLabel: "Bloom's",
    description:
      "Generate lessons that intentionally climb from recall and understanding to application, analysis, evaluation, and creation.",
    sectionTitle: "Bloom's Cognitive Progression",
    sectionBadgeText: "6 Levels",
    specificActivitiesTitle: "Cognitive Tasks",
    specificActivitiesBadge: "Level-aligned tasks",
    supportsSpecificActivities: false,
    focusInputLabel: "Target Thinking Level",
    focusInputPlaceholder:
      "Optional: name the highest thinking level, final task, or cognitive verbs students should demonstrate.",
    objectiveHint: "Use measurable verbs across Bloom's levels, especially the highest level you want assessed.",
    constraintHint: "Mention required cognitive level, product type, assessment verbs, or support for struggling learners.",
    cards: [
      {
        phase: "REMEMBER",
        title: "Remember",
        subtitle: "Recall facts",
        desc: "Define, list, identify",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "UNDERSTAND",
        title: "Understand",
        subtitle: "Explain meaning",
        desc: "Summarize and classify",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
      {
        phase: "APPLY",
        title: "Apply",
        subtitle: "Use the idea",
        desc: "Solve and demonstrate",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "ANALYZE",
        title: "Analyze",
        subtitle: "Break apart",
        desc: "Compare and infer",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
      {
        phase: "EVALUATE",
        title: "Evaluate",
        subtitle: "Judge with criteria",
        desc: "Defend and critique",
        shell: sharedShells.rose,
        badge: "bg-gradient-to-r from-rose-500 to-pink-500",
        titleColor: "text-rose-700",
      },
      {
        phase: "CREATE",
        title: "Create",
        subtitle: "Produce new work",
        desc: "Design, compose, build",
        shell: sharedShells.cyan,
        badge: "bg-gradient-to-r from-cyan-500 to-sky-500",
        titleColor: "text-cyan-700",
      },
    ],
    phases: [
      {
        phase: "REMEMBER",
        title: "Remember",
        subtitle: "Retrieve key knowledge",
        description: "Surface key vocabulary, facts, formulas, steps, or examples needed for the lesson.",
        teacherRole: "Cue recall and verify prerequisite knowledge.",
        studentRole: "Identify, list, define, label, or recall essential information.",
        materialsHint: ["Vocabulary list", "Flash prompts", "Quick check"],
      },
      {
        phase: "UNDERSTAND",
        title: "Understand",
        subtitle: "Explain meaning",
        description: "Help students explain ideas in their own words and connect examples to meaning.",
        teacherRole: "Clarify relationships and ask students to explain thinking.",
        studentRole: "Summarize, classify, explain, and give examples.",
        materialsHint: ["Concept map", "Examples/non-examples", "Sentence frames"],
      },
      {
        phase: "APPLY",
        title: "Apply",
        subtitle: "Use knowledge",
        description: "Have students use the concept, procedure, or rule in a meaningful task.",
        teacherRole: "Provide practice situations and coach accurate use.",
        studentRole: "Solve, demonstrate, use, or implement the learning.",
        materialsHint: ["Practice task", "Problem set", "Scenario"],
      },
      {
        phase: "ANALYZE",
        title: "Analyze",
        subtitle: "Examine relationships",
        description: "Ask students to compare, categorize, infer, or explain how parts relate to the whole.",
        teacherRole: "Prompt reasoning and make evidence use visible.",
        studentRole: "Compare, organize, distinguish, and infer from evidence.",
        materialsHint: ["Comparison chart", "Data set", "Sorting task"],
      },
      {
        phase: "EVALUATE",
        title: "Evaluate",
        subtitle: "Judge with criteria",
        description: "Guide students to critique choices, justify conclusions, and defend judgments with criteria.",
        teacherRole: "Provide criteria and facilitate evidence-based judgment.",
        studentRole: "Critique, justify, defend, and recommend.",
        materialsHint: ["Rubric", "Criteria chart", "Debate prompt"],
      },
      {
        phase: "CREATE",
        title: "Create",
        subtitle: "Produce or design",
        description: "Have students synthesize learning into an original product, explanation, solution, or plan.",
        teacherRole: "Support synthesis and assess originality, accuracy, and purpose.",
        studentRole: "Design, build, compose, propose, or present new work.",
        materialsHint: ["Product template", "Design brief", "Presentation tools"],
      },
    ],
  },
  direct_instruction: {
    id: "direct_instruction",
    label: "Explicit Direct Instruction",
    shortLabel: "EDI",
    description:
      "Generate highly structured lessons with clear objectives, modeling, checks for understanding, guided practice, and independent practice.",
    sectionTitle: "Explicit Direct Instruction Flow",
    sectionBadgeText: "6 Steps",
    specificActivitiesTitle: "Instructional Checks",
    specificActivitiesBadge: "CFU and practice checkpoints",
    supportsSpecificActivities: false,
    focusInputLabel: "Exact Skill and Success Criteria",
    focusInputPlaceholder:
      "Optional: state the exact skill, key vocabulary, common misconception, or success criteria students must master.",
    objectiveHint: "Use precise, measurable objectives with clear success criteria and checks for understanding.",
    constraintHint: "Mention pacing, prerequisite vocabulary, misconceptions, practice item count, or assessment format.",
    cards: [
      {
        phase: "OBJECTIVE",
        title: "Objective",
        subtitle: "Set purpose",
        desc: "State learning target",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "INPUT",
        title: "Input",
        subtitle: "Teach content",
        desc: "Explain key knowledge",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
      {
        phase: "MODEL",
        title: "Model",
        subtitle: "Show the process",
        desc: "Think aloud with examples",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "CHECK_UNDERSTANDING",
        title: "Check",
        subtitle: "Verify learning",
        desc: "Catch misconceptions early",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
      {
        phase: "GUIDED_PRACTICE",
        title: "Guided Practice",
        subtitle: "Practice together",
        desc: "Coach accurate attempts",
        shell: sharedShells.rose,
        badge: "bg-gradient-to-r from-rose-500 to-pink-500",
        titleColor: "text-rose-700",
      },
      {
        phase: "INDEPENDENT_PRACTICE",
        title: "Independent Practice",
        subtitle: "Prove mastery",
        desc: "Apply without prompts",
        shell: sharedShells.cyan,
        badge: "bg-gradient-to-r from-cyan-500 to-sky-500",
        titleColor: "text-cyan-700",
      },
    ],
    phases: [
      {
        phase: "OBJECTIVE",
        title: "Objective and Purpose",
        subtitle: "Learning target",
        description: "State the objective, relevance, vocabulary, and success criteria in student-friendly language.",
        teacherRole: "Clarify what students will learn, why it matters, and how success will be judged.",
        studentRole: "Restate the goal, connect to prior learning, and prepare to participate.",
        materialsHint: ["Learning target", "Vocabulary", "Success criteria"],
      },
      {
        phase: "INPUT",
        title: "Input",
        subtitle: "Teach new content",
        description: "Present the essential facts, concepts, rules, or steps with concise explanations and examples.",
        teacherRole: "Explain content clearly and highlight key features.",
        studentRole: "Listen actively, annotate, answer prompts, and track key ideas.",
        materialsHint: ["Slides", "Anchor chart", "Example set"],
      },
      {
        phase: "MODEL",
        title: "Model",
        subtitle: "Demonstrate expert thinking",
        description: "Model the procedure or reasoning with a think-aloud and at least one worked example.",
        teacherRole: "Demonstrate each step and verbalize decision-making.",
        studentRole: "Observe, predict next steps, and identify why each step matters.",
        materialsHint: ["Worked example", "Think-aloud", "Document camera"],
      },
      {
        phase: "CHECK_UNDERSTANDING",
        title: "Check for Understanding",
        subtitle: "Diagnose before practice",
        description: "Use quick checks to confirm students are ready and address misconceptions immediately.",
        teacherRole: "Ask targeted questions and respond to data.",
        studentRole: "Show responses, explain thinking, and correct errors.",
        materialsHint: ["Mini whiteboards", "Hinge question", "Poll"],
      },
      {
        phase: "GUIDED_PRACTICE",
        title: "Guided Practice",
        subtitle: "Practice with feedback",
        description: "Lead structured practice with feedback until students can work accurately with less support.",
        teacherRole: "Prompt, coach, release support, and give corrective feedback.",
        studentRole: "Practice, explain steps, and revise after feedback.",
        materialsHint: ["Guided practice", "Checklist", "Sample responses"],
      },
      {
        phase: "INDEPENDENT_PRACTICE",
        title: "Independent Practice and Closure",
        subtitle: "Demonstrate mastery",
        description: "Assign independent practice, assess mastery, and close with reflection or exit ticket.",
        teacherRole: "Assess accuracy and set next steps.",
        studentRole: "Apply independently, submit evidence, and reflect.",
        materialsHint: ["Independent task", "Exit ticket", "Rubric"],
      },
    ],
  },
};

export function normalizeLessonPlanFramework(value: unknown): LessonPlanFrameworkId {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  if (normalized === "5e" || normalized === "five_e") return "five_e";
  if (normalized === "ubd") return "ubd";
  if (normalized === "gradual_release" || normalized === "i_do_we_do_you_do") return "gradual_release";
  if (normalized === "project_based" || normalized === "pbl" || normalized === "project_based_learning") return "project_based";
  if (normalized === "blooms" || normalized === "bloom" || normalized === "bloom_s_taxonomy") return "blooms";
  if (normalized === "direct_instruction" || normalized === "explicit_direct_instruction" || normalized === "edi") return "direct_instruction";
  return "four_as";
}

export function getLessonPlanFramework(value: unknown): LessonPlanFrameworkConfig {
  return LESSON_PLAN_FRAMEWORKS[normalizeLessonPlanFramework(value)];
}

export function buildFrameworkPhaseModel(
  frameworkValue: unknown,
  args: { topic: string; subject: string; grade: string; minutesPerDay: number }
) {
  const framework = getLessonPlanFramework(frameworkValue);
  const phaseCount = framework.phases.length || 1;
  const baseMinutes = Math.max(1, Math.floor(args.minutesPerDay / phaseCount));
  const remainder = Math.max(0, args.minutesPerDay - baseMinutes * phaseCount);

  return framework.phases.map((phase, index) => ({
    phase: phase.phase,
    title: phase.title,
    timeMinutes: baseMinutes + (index < remainder ? 1 : 0),
    description: `${phase.description} Focus the work on ${args.topic} within ${args.subject} for ${args.grade} learners.`,
    teacherRole: phase.teacherRole,
    studentRole: phase.studentRole,
    materials: phase.materialsHint,
  }));
}
