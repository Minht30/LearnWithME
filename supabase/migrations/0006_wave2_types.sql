-- 0006_wave2_types.sql
-- Wave 2: extend the questions.type CHECK to allow the new interactive
-- question types. No new columns are needed — existing prompt / choices /
-- correct columns cover every case (see notes below).
--
--   highlight  : prompt = passage text; correct = string[] of words the
--                student must click. Response = JSON array of clicked words.
--   match      : choices = left column strings; correct = right column
--                strings (parallel arrays). Response = JSON object
--                { [leftIndex]: rightIndex }.
--   word_bank  : prompt has [BLANK] markers (like cloze); choices =
--                shuffled word bank shown to student; correct = ordered
--                expected answers per blank.
--   passage    : prompt = the passage text; no answer widget, 0 points,
--                excluded from scoring. Just a display block above other
--                questions.

alter table public.questions drop constraint if exists questions_type_check;

alter table public.questions
  add constraint questions_type_check
  check (type in (
    'mcq','short','long','numeric',
    'true_false','multi_select','cloze',
    'highlight','match','word_bank','passage'
  ));
