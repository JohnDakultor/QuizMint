import {
  decodeStoredAnswer,
  stripStructuredMeta,
  toPublicStructure,
} from "@/lib/quiz-structured";
import { inferQuizQuestionType } from "@/lib/quiz-question-types";

type PersistedQuestionLike = {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation?: string | null;
  hint?: string | null;
};

type PersistedQuizLike = {
  id: number;
  title: string;
  instructions: string;
  createdAt?: Date | string | null;
  questions: PersistedQuestionLike[];
};

export type QuizQuestionArtifact = {
  id: number;
  question: string;
  options: string[];
  answer: string;
  questionType: string;
  structure: ReturnType<typeof toPublicStructure>;
  explanation?: string | null;
  hint?: string | null;
};

export type QuizArtifacts = {
  version: 1;
  quizId: number;
  questionCount: number;
  title: string;
  instructions: string;
  createdAt: string | null;
  questions: QuizQuestionArtifact[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asQuestionArtifact(value: unknown): QuizQuestionArtifact | null {
  const object = asObject(value);
  if (!object) return null;
  if (
    typeof object.id !== "number" ||
    typeof object.question !== "string" ||
    !Array.isArray(object.options) ||
    typeof object.answer !== "string" ||
    typeof object.questionType !== "string"
  ) {
    return null;
  }
  return {
    id: object.id,
    question: object.question,
    options: object.options.filter((item): item is string => typeof item === "string"),
    answer: object.answer,
    questionType: object.questionType,
    structure: (object.structure as ReturnType<typeof toPublicStructure>) ?? null,
    explanation: typeof object.explanation === "string" ? object.explanation : null,
    hint: typeof object.hint === "string" ? object.hint : null,
  };
}

export function buildQuizArtifactsFromPersistedQuiz(
  quiz: PersistedQuizLike
): QuizArtifacts {
  return {
    version: 1,
    quizId: quiz.id,
    questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
    title: String(quiz.title || ""),
    instructions: String(quiz.instructions || ""),
    createdAt: quiz.createdAt ? new Date(quiz.createdAt).toISOString() : null,
    questions: (Array.isArray(quiz.questions) ? quiz.questions : []).map((question) => {
      const decoded = decodeStoredAnswer(question.answer);
      const structure = toPublicStructure(decoded.structure);
      return {
        id: question.id,
        question: question.question,
        options: Array.isArray(question.options) ? question.options : [],
        answer: stripStructuredMeta(question.answer),
        questionType: structure?.type ?? inferQuizQuestionType(question.question, question.options),
        structure,
        explanation: question.explanation ?? null,
        hint: question.hint ?? null,
      };
    }),
  };
}

export function getQuizArtifactsFromGenerationMetadata(metadata: unknown): QuizArtifacts | null {
  const object = asObject(metadata);
  const artifacts = asObject(object?.quizArtifacts);
  if (!artifacts) return null;
  if (
    artifacts.version !== 1 ||
    typeof artifacts.quizId !== "number" ||
    typeof artifacts.questionCount !== "number" ||
    typeof artifacts.title !== "string" ||
    typeof artifacts.instructions !== "string" ||
    !Array.isArray(artifacts.questions)
  ) {
    return null;
  }

  const questions = artifacts.questions
    .map((item) => asQuestionArtifact(item))
    .filter((item): item is QuizQuestionArtifact => Boolean(item));

  if (!questions.length) return null;

  return {
    version: 1,
    quizId: artifacts.quizId,
    questionCount: artifacts.questionCount,
    title: artifacts.title,
    instructions: artifacts.instructions,
    createdAt: typeof artifacts.createdAt === "string" ? artifacts.createdAt : null,
    questions,
  };
}
