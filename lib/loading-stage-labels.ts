export const QUIZ_GENERATION_PROGRESS = {
  stage: "Drafting",
  label: "Building quiz questions and instructions",
} as const;

export const LESSON_PLAN_GENERATION_PROGRESS = {
  stage: "Drafting",
  label: "Building lesson structure and daily activities",
} as const;

export const LESSON_PLAN_SLIDES_PROGRESS = {
  stage: "Preparing",
  label: "Preparing editable slides from your lesson plan",
} as const;

export const LESSON_PLAN_UPLOAD_SLIDES_PROGRESS = {
  stage: "Extracting",
  label: "Extracting file content and preparing editable slides",
} as const;

export const LESSON_PLAN_PPTX_EXPORT_PROGRESS = {
  stage: "Exporting",
  label: "Rendering PPTX download",
} as const;
