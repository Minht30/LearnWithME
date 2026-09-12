-- ============================================================================
-- LearnWithMe · migration 0003
-- Adds file-based explanations (students upload photo or PDF of paper work).
-- Run in the Supabase SQL editor AFTER 0002.
-- ============================================================================

-- --- Columns ----------------------------------------------------------------
alter table public.answers
  add column if not exists explanation_file_path text,
  add column if not exists explanation_mime text;

-- --- Storage bucket for student uploads -------------------------------------
insert into storage.buckets (id, name, public)
values ('student-work', 'student-work', false)
on conflict (id) do nothing;

-- No storage.objects RLS policies needed: server-side uploads use the
-- service_role key which bypasses RLS. Reads are served via signed URLs
-- generated from the same server-side context.
