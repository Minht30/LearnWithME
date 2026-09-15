-- 0005_wave1_content.sql
-- Wave 1 content upgrades for the teacher builder:
--   * per-question image (private, signed URLs from question-media bucket)
--   * per-question point value (for weighted scoring)
--   * new question types: true_false, multi_select, cloze
--
-- Cloze prompts use "[BLANK]" as the placeholder marker in `prompt`;
-- the ordered blank answers live in `correct` as a JSON array of strings.

-- =========================================================================
-- Columns
-- =========================================================================
alter table public.questions
  add column if not exists image_path text,
  add column if not exists points int not null default 1;

-- =========================================================================
-- Storage bucket for question media (images teachers embed in prompts).
-- Private bucket; admin client mints signed URLs for viewing.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('question-media', 'question-media', false)
on conflict (id) do nothing;

-- =========================================================================
-- Recreate the type CHECK constraint so the new values are allowed.
-- Drops by NAME (any prior version) then re-adds. Safe to re-run.
-- =========================================================================
alter table public.questions drop constraint if exists questions_type_check;

alter table public.questions
  add constraint questions_type_check
  check (type in ('mcq','short','long','numeric','true_false','multi_select','cloze'));
