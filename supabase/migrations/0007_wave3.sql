-- 0007_wave3.sql
-- Wave 3 additions:
--   * Five new interactive question types
--   * Optional audio prompt (MP3/WAV) per question
--   * A per-teacher question bank for reusable questions across tests
--
-- Data encodings (reusing existing columns to keep it simple):
--   number_line   prompt = the question text
--                 choices[0]/[1] = min/max endpoints (as strings)
--                 correct = the target number
--   coord_plot    prompt = the question text
--                 choices[0..3] = xMin, xMax, yMin, yMax (as strings)
--                 correct = "x,y" of the target point
--   hotspot       image_path required
--                 correct = "x,y,r" where x,y are 0..1 percentages of the
--                           image and r is the click radius (0..1)
--   categorize    prompt = instructions
--                 choices = the pool of items to sort
--                 correct = parallel array, each entry = the bucket label
--                           the item belongs to
--   reorder       prompt = the question text
--                 choices = the same words shown scrambled
--                 correct = the correct order (array of the same words)

-- ---- Columns -------------------------------------------------------------
alter table public.questions
  add column if not exists audio_path text;

-- ---- Extend the type CHECK -----------------------------------------------
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions
  add constraint questions_type_check
  check (type in (
    'mcq','short','long','numeric',
    'true_false','multi_select','cloze',
    'highlight','match','word_bank','passage',
    'number_line','coord_plot','hotspot','categorize','reorder'
  ));

-- ---- Storage bucket already exists (question-media) — reused for audio ---

-- ---- Question bank: reusable snapshots the teacher can insert later ------
create table if not exists public.question_bank_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  label text not null,                          -- teacher's saved title
  subject text,
  grade text,
  snapshot jsonb not null,                      -- full question payload
  created_at timestamptz not null default now()
);
create index if not exists idx_question_bank_teacher on public.question_bank_items(teacher_id, created_at desc);

alter table public.question_bank_items enable row level security;
-- Server actions use the service-role admin client; no anon policy needed.
