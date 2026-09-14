-- 0004_review_and_signup.sql
-- Adds: student self-signup (plain password recovery), teacher review flow
--       (per-question feedback + approve/redo), assignments with due dates,
--       and an in-app notification stream for teachers.

-- =========================================================================
-- Students: keep hashed password (login) + plain copy (teacher recovery view)
-- =========================================================================
alter table public.students
  add column if not exists password_plain text,
  add column if not exists self_signup boolean not null default false,
  add column if not exists last_seen_at timestamptz;

-- =========================================================================
-- Attempts: teacher review workflow
--   status : in_progress → submitted → (approved | needs_redo)
--   redoing an attempt bumps it back to in_progress; the row is reused
--   so the student can pick up where they left off.
-- =========================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'attempt_status') then
    create type attempt_status as enum ('in_progress', 'submitted', 'approved', 'needs_redo');
  end if;
end $$;

alter table public.attempts
  add column if not exists status attempt_status not null default 'in_progress',
  add column if not exists teacher_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.users(id) on delete set null;

-- backfill existing rows so historical data stays sane
update public.attempts
  set status = case
    when submitted_at is not null then 'submitted'::attempt_status
    else 'in_progress'::attempt_status
  end
where status is null or true;

-- =========================================================================
-- Answers: per-question teacher feedback
-- =========================================================================
alter table public.answers
  add column if not exists teacher_feedback text,
  add column if not exists feedback_at timestamptz;

-- =========================================================================
-- Assignments: teacher assigns a test to a student with a due date + priority
--   (a class-wide assignment is just N per-student rows; keeps the UI simple)
-- =========================================================================
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  test_id    uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  due_at     timestamptz,
  priority   int not null default 1,     -- 1=normal, 2=important, 3=urgent
  note       text,
  created_at timestamptz not null default now(),
  unique (test_id, student_id)
);
create index if not exists idx_assignments_student on public.assignments(student_id, due_at);
create index if not exists idx_assignments_teacher on public.assignments(teacher_id, created_at desc);

-- =========================================================================
-- Notifications: teacher inbox stream (new student joined, submission, etc.)
-- =========================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  kind text not null,                    -- 'student_joined' | 'attempt_submitted' | ...
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_teacher on public.notifications(teacher_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(teacher_id) where read_at is null;

-- =========================================================================
-- RLS: enable and allow the service role full access (admin client bypasses RLS).
-- =========================================================================
alter table public.assignments enable row level security;
alter table public.notifications enable row level security;

-- No permissive policies for anon; admin client uses service role.
-- Teachers reading these tables go through server actions using the admin client.
