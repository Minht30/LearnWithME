-- ============================================================================
-- Quill · initial schema (9 tables + RLS)
-- Run this in the Supabase SQL editor after creating the project.
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USERS · one row per teacher (mirrors auth.users)
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-insert a users row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. CLASSES
-- ----------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  grade text not null,
  join_code char(6) not null unique,
  created_at timestamptz not null default now()
);
create index idx_classes_teacher on public.classes(teacher_id);
create index idx_classes_join on public.classes(join_code);

-- ----------------------------------------------------------------------------
-- 3. STUDENTS · guest sessions, no PII
-- ----------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  display_name text not null,
  anon_token text not null unique,
  created_at timestamptz not null default now()
);
create index idx_students_class on public.students(class_id);

-- ----------------------------------------------------------------------------
-- 4. SOURCE_DOCS · teacher-uploaded PDFs/DOCX
-- ----------------------------------------------------------------------------
create table public.source_docs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);
create index idx_source_docs_teacher on public.source_docs(teacher_id);

-- ----------------------------------------------------------------------------
-- 5. TESTS
-- ----------------------------------------------------------------------------
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  source_doc_id uuid references public.source_docs(id) on delete set null,
  title text not null,
  subject text not null,
  grade text not null,
  curriculum_ref text,
  source_prompt text,
  duration_min int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tests_teacher on public.tests(teacher_id);

-- ----------------------------------------------------------------------------
-- 6. QUESTIONS
-- ----------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  type text not null check (type in ('mcq', 'short', 'long', 'numeric')),
  prompt text not null,
  choices jsonb,
  correct jsonb not null,
  rubric text,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  strand text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_questions_test on public.questions(test_id, position);

-- ----------------------------------------------------------------------------
-- 7. CLASS_TESTS · assignments
-- ----------------------------------------------------------------------------
create table public.class_tests (
  class_id uuid not null references public.classes(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  mode text not null default 'practice' check (mode in ('practice', 'exam')),
  opens_at timestamptz,
  closes_at timestamptz,
  assigned_at timestamptz not null default now(),
  primary key (class_id, test_id)
);

-- ----------------------------------------------------------------------------
-- 8. ATTEMPTS
-- ----------------------------------------------------------------------------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  mode text not null default 'practice' check (mode in ('practice', 'exam')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_used_sec int
);
create index idx_attempts_test on public.attempts(test_id);
create index idx_attempts_student on public.attempts(student_id);

-- ----------------------------------------------------------------------------
-- 9. ANSWERS
-- ----------------------------------------------------------------------------
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response jsonb,
  note text,
  is_correct boolean,
  score numeric(4,3),
  feedback text,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index idx_answers_attempt on public.answers(attempt_id);

-- ============================================================================
-- RLS · row-level security
-- ============================================================================

alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.source_docs enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.class_tests enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;

-- USERS ---------------------------------------------------------------------
create policy "users read self" on public.users
  for select using (auth.uid() = id);

-- CLASSES -------------------------------------------------------------------
create policy "teacher owns class" on public.classes
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- STUDENTS ------------------------------------------------------------------
-- Teachers can see their class's students; students never query this table.
create policy "teacher reads own students" on public.students
  for select using (
    exists (select 1 from public.classes c
            where c.id = class_id and c.teacher_id = auth.uid())
  );
create policy "public insert student on join" on public.students
  for insert with check (true); -- gated at the app layer by valid join_code

-- SOURCE_DOCS ---------------------------------------------------------------
create policy "teacher owns source_docs" on public.source_docs
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- TESTS ---------------------------------------------------------------------
create policy "teacher owns tests" on public.tests
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Students see a test only if it's assigned to their class.
create policy "students read assigned tests" on public.tests
  for select using (
    exists (
      select 1 from public.class_tests ct
      join public.students s on s.class_id = ct.class_id
      where ct.test_id = tests.id
        and s.anon_token = current_setting('request.jwt.claim.student_token', true)
    )
  );

-- QUESTIONS -----------------------------------------------------------------
create policy "teacher owns questions" on public.questions
  for all using (
    exists (select 1 from public.tests t
            where t.id = test_id and t.teacher_id = auth.uid())
  );
create policy "students read assigned questions" on public.questions
  for select using (
    exists (
      select 1 from public.tests t
      join public.class_tests ct on ct.test_id = t.id
      join public.students s on s.class_id = ct.class_id
      where t.id = questions.test_id
        and s.anon_token = current_setting('request.jwt.claim.student_token', true)
    )
  );

-- CLASS_TESTS ---------------------------------------------------------------
create policy "teacher owns class_tests" on public.class_tests
  for all using (
    exists (select 1 from public.classes c
            where c.id = class_id and c.teacher_id = auth.uid())
  );

-- ATTEMPTS ------------------------------------------------------------------
create policy "teacher reads attempts on own tests" on public.attempts
  for select using (
    exists (select 1 from public.tests t
            where t.id = test_id and t.teacher_id = auth.uid())
  );
create policy "students write own attempts" on public.attempts
  for all using (
    exists (select 1 from public.students s
            where s.id = student_id
              and s.anon_token = current_setting('request.jwt.claim.student_token', true))
  )
  with check (
    exists (select 1 from public.students s
            where s.id = student_id
              and s.anon_token = current_setting('request.jwt.claim.student_token', true))
  );

-- ANSWERS -------------------------------------------------------------------
create policy "teacher reads answers" on public.answers
  for select using (
    exists (
      select 1 from public.attempts a
      join public.tests t on t.id = a.test_id
      where a.id = attempt_id and t.teacher_id = auth.uid()
    )
  );
create policy "students write own answers" on public.answers
  for all using (
    exists (
      select 1 from public.attempts a
      join public.students s on s.id = a.student_id
      where a.id = attempt_id
        and s.anon_token = current_setting('request.jwt.claim.student_token', true)
    )
  )
  with check (
    exists (
      select 1 from public.attempts a
      join public.students s on s.id = a.student_id
      where a.id = attempt_id
        and s.anon_token = current_setting('request.jwt.claim.student_token', true)
    )
  );

-- ============================================================================
-- Helpers
-- ============================================================================

-- Generate a 6-char alphanumeric join code (no O/0/I/1 to avoid confusion).
create or replace function public.gen_join_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end $$;
