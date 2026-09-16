-- 0008_feedback_read.sql
-- Track when the student first opened a reviewed attempt, so the home
-- page and result page can show a NEW badge on unread teacher feedback.

alter table public.attempts
  add column if not exists feedback_read_at timestamptz;

create index if not exists idx_attempts_unread_feedback
  on public.attempts(student_id)
  where reviewed_at is not null and feedback_read_at is null;
