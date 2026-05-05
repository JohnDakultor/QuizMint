# Architecture Split Notes

## Completed (Phase 1)
- Removed legacy commented implementation block from `app/api/generate-quiz/route.ts`.
- Extracted lesson-plan context enhancer into `lib/lesson-plan-context-enhancer.ts`.
- Extracted quiz tour configuration into `app/(home)/generate-quiz/tour-steps.ts`.
- Added split lesson-plan UI components:
  - `components/lesson-plan/input-form.tsx`
  - `components/lesson-plan/output-panel.tsx`
  - `components/lesson-plan/export-controls.tsx`
  - `components/lesson-plan/day-sections.tsx`
  - `components/lesson-plan/activity-cards.tsx`
- Added split quiz page UI components:
  - `components/quiz/quiz-page-header.tsx`
  - `components/quiz/adaptive-suggestions-panel.tsx`
  - `components/quiz/subscribe-modal.tsx`
- Added Google Drive Picker integration pieces:
  - `components/google/google-drive-picker-button.tsx`
  - `app/api/google/picker-config/route.ts`
  - `app/api/google/drive/link/route.ts`

## Next Split Targets (Phase 2)
- `app/api/generate-quiz/route.ts`
  - Move source extraction (`extractTextFromURL`, YouTube transcript/metadata) to `lib/quiz-source-service.ts`.
  - Move adaptive guidance aggregation to `lib/quiz-adaptive-service.ts`.
  - Keep route as transport/orchestration only.
- `app/api/generate-lesson-plan/route.ts`
  - Move quota/counter logic to `lib/usage-counters.ts`.
  - Move RAG orchestration to `lib/lesson-plan-rag-service.ts`.
- `app/(home)/generate-quiz/page.tsx`
  - Split into `components/quiz/quiz-input-card.tsx`, `components/quiz/quiz-output-card.tsx`, `components/quiz/share-modal.tsx`.
- `app/(home)/lessonPlan/page.tsx`
  - Split into `components/lesson-plan/input-form.tsx`, `components/lesson-plan/output-panel.tsx`, `components/lesson-plan/export-controls.tsx`.

## Rule for New Work
- New feature logic should go into `lib/*-service.ts` (domain layer), not directly into route/page files.
- Route/page files should handle request parsing, auth, response rendering, and high-level orchestration only.
