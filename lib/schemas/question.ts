import { z } from "zod";

export const QuestionType = z.enum(["mcq", "short", "long", "numeric"]);
export type QuestionType = z.infer<typeof QuestionType>;

export const Difficulty = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const Question = z.object({
  type: QuestionType,
  prompt: z.string().min(1),
  choices: z.array(z.string()).optional(),
  correct: z.union([z.string(), z.number(), z.array(z.string())]),
  rubric: z.string().optional(),
  difficulty: Difficulty.default("medium"),
  strand: z.string().optional(),
});
export type Question = z.infer<typeof Question>;

export const GeneratedTest = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  duration_min: z.number().int().min(1).max(240),
  questions: z.array(Question).min(1),
});
export type GeneratedTest = z.infer<typeof GeneratedTest>;

export const TestRequest = z.object({
  prompt: z.string().min(5, "Describe the test in a sentence or two."),
  subject: z.string().min(1),
  grade: z.string().min(1),
  count: z.number().int().min(1).max(100).default(20),
  duration_min: z.number().int().min(5).max(240).default(30),
  types: z.array(QuestionType).min(1).default(["mcq", "short"]),
  curriculum_ref: z.string().optional(),
});
export type TestRequest = z.infer<typeof TestRequest>;
