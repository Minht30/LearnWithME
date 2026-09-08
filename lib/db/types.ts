import type { QuestionType, Difficulty } from "@/lib/schemas/question";

export type DbTest = {
  id: string;
  teacher_id: string;
  source_doc_id: string | null;
  title: string;
  subject: string;
  grade: string;
  curriculum_ref: string | null;
  source_prompt: string | null;
  duration_min: number;
  created_at: string;
  updated_at: string;
};

export type DbQuestion = {
  id: string;
  test_id: string;
  type: QuestionType;
  prompt: string;
  choices: string[] | null;
  correct: string | number | string[];
  rubric: string | null;
  difficulty: Difficulty;
  strand: string | null;
  position: number;
  created_at: string;
};

export type DbClass = {
  id: string;
  teacher_id: string;
  name: string;
  grade: string;
  join_code: string;
  created_at: string;
};

export type DbStudent = {
  id: string;
  class_id: string;
  display_name: string;
  anon_token: string;
  created_at: string;
};

export type DbAttempt = {
  id: string;
  test_id: string;
  student_id: string;
  mode: "practice" | "exam";
  started_at: string;
  submitted_at: string | null;
  duration_used_sec: number | null;
};

export type DbAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  response: unknown;
  note: string | null;
  is_correct: boolean | null;
  score: number | null;
  feedback: string | null;
  answered_at: string;
};
