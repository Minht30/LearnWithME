-- ============================================================================
-- LearnWithMe · migration 0002
-- Adds:
--   1. students.username + students.password_hash for teacher-created accounts
--   2. answers.explanation — required "show your work" text
--   3. attempts.results_email_sent_at — email delivery marker
--
-- Run in the Supabase SQL editor AFTER 0001_initial_schema.sql.
-- Safe to run more than once (uses IF NOT EXISTS everywhere).
-- ============================================================================

-- --- Students: local username/password (unique per class) --------------------
alter table public.students
  add column if not exists username text,
  add column if not exists password_hash text;

create unique index if not exists idx_students_class_username
  on public.students (class_id, username)
  where username is not null;

-- --- Answers: required explanation text --------------------------------------
alter table public.answers
  add column if not exists explanation text;

-- --- Attempts: mark when we've emailed the teacher ---------------------------
alter table public.attempts
  add column if not exists results_email_sent_at timestamptz;

-- --- (Optional) students may look up their assigned tests without leaking
-- other classes. We rely on service_role for reads/writes right now, so no
-- extra RLS policies are required — but keep the door open.
