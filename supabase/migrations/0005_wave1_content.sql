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
-- If `type` was constrained to the old enum values via a CHECK, extend it.
-- Postgres migrations from the original schema used a plain text column so
-- no ENUM alter is needed. If a check constraint exists we drop and recreate.
-- =========================================================================
do $$
declare
  con_name text;
begin
  select conname into con_name
    from pg_constraint
    where conrelid = 'public.questions'::regclass
      and pg_get_constraintdef(oid) ilike '%questions_type_check%';
  if con_name is not null then
    execute format('alter table public.questions drop constraint %I', con_name);
  end if;
end $$;

alter table public.questions
  add constraint questions_type_check
  check (type in ('mcq','short','long','numeric','true_false','multi_select','cloze'));
