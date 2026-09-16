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
  points: number;
  image_path: string | null;
  audio_path: string | null;
  created_at: string;
};

export type DbBankItem = {
  id: string;
  teacher_id: string;
  label: string;
  subject: string | null;
  grade: string | null;
  snapshot: Record<string, unknown>;
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
  username: string | null;
  password_plain: string | null;
  self_signup: boolean;
  last_seen_at: string | null;
  created_at: string;
};

export type AttemptStatus = "in_progress" | "submitted" | "approved" | "needs_redo";

export type DbAttempt = {
  id: string;
  test_id: string;
  student_id: string;
  mode: "practice" | "exam";
  started_at: string;
  submitted_at: string | null;
  duration_used_sec: number | null;
  status: AttemptStatus;
  teacher_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  results_email_sent_at: string | null;
  feedback_read_at: string | null;
};

export type DbAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  response: unknown;
  explanation: string | null;
  note: string | null;
  is_correct: boolean | null;
  score: number | null;
  feedback: string | null;
  answered_at: string;
  explanation_file_path: string | null;
  explanation_mime: string | null;
  teacher_feedback: string | null;
  feedback_at: string | null;
};

export type DbAssignment = {
  id: string;
  teacher_id: string;
  test_id: string;
  student_id: string;
  due_at: string | null;
  priority: number;
  note: string | null;
  created_at: string;
};

export type NotificationKind = "student_joined" | "attempt_submitted";

export type DbNotification = {
  id: string;
  teacher_id: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};
