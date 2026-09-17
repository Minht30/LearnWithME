# LearnWithMe

**Tests, built for teachers.** A K-12 Canadian curriculum test generator: teachers describe a test in plain English, students practise on it before exam day, everyone leaves with a clean PDF.

Built on free tiers and open-weight models — no paid dependency in the stack.

---

## Stack

| Layer            | Choice                                 | Licence / free tier                            |
| ---------------- | -------------------------------------- | ---------------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack)     | MIT                                            |
| Language         | TypeScript, strict                     | Apache 2.0                                     |
| UI               | Tailwind v4 + shadcn/ui                | MIT                                            |
| Database         | Supabase (Postgres + Auth + Storage)   | Apache 2.0 · free tier                         |
| AI (production)  | Groq · `openai/gpt-oss-120b`           | Apache 2.0 · free API                          |
| AI (grading)     | Groq · `openai/gpt-oss-20b`            | Apache 2.0 · free API                          |
| AI (local dev)   | Ollama · `llama3.2:latest`             | Apache 2.0 · fully local                       |
| PDF export       | `@react-pdf/renderer`                  | MIT                                            |
| Doc parsing      | `unpdf`, `mammoth`                     | MIT / BSD                                      |
| Motion           | Framer Motion                          | MIT                                            |
| Deployment       | Vercel Hobby                           | Free for non-commercial                        |

The AI layer speaks the OpenAI-compatible chat-completions shape. Switch providers by changing one env var (`AI_PROVIDER=groq|ollama`) — no code change needed.

## Local setup

```bash
git clone https://github.com/Minht30/LearnWithME.git
cd LearnWithME
npm install
cp .env.example .env.local   # fill in Supabase + Groq keys
npm run dev
```

Then in Supabase's SQL editor, run [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).

### Offline / local AI

```bash
ollama serve                          # in one terminal
ollama pull llama3.2:latest           # once
# then in .env.local:
AI_PROVIDER=ollama
```

## Repo layout

```
app/                    Next.js routes (App Router)
components/ui/          shadcn primitives
lib/
  ai/                   Groq/Ollama client, prompts
  curriculum/           Ontario Math strands (K-8 seed)
  schemas/              Zod schemas — questions, tests
  supabase/             Server & browser clients
  env.ts                Typed env, validated with Zod
supabase/migrations/    SQL migrations
```

## Roadmap

Week 1 (MVP)
- Teacher signup, prompt-to-test, edit questions, PDF export (student + teacher copies), class codes, student practice with timer + notes, result screen.

Week 2+
- Upload → generation, difficulty mix slider, attempt analytics, real Ontario/BC curriculum picker.

Week 3+
- French immersion, KaTeX math rendering, Google Docs export.

## Writing tests — gotchas for teachers

A few text patterns can trip up the renderer. Follow these when you type
prompts, choices, or feedback:

**Dollar signs**
Use `$` freely for money — `sells for $8`, `$25 per ticket`. The renderer
now treats a bare `$` as a literal dollar unless it's paired for math
(`$x^2$`) or block math (`$$…$$`). Older test data written before this
fix should already render correctly.

**Math**
- Inline: `$x^2 + 3$`, `$\frac{1}{2}$`, `$\alpha + \beta$`
- Display (own line): `$$\int_0^1 x^2\,dx$$`
- Anything a KaTeX cheat sheet shows works.

**Emphasis**
- `**bold**` and `*italic*` are supported.
- Backticks `` `like this` `` render as `code`.

**Fill-in-the-blank (`cloze` / `word_bank`)**
- Put `[BLANK]` (uppercase, in brackets) where the student should type.
- The expected answers array must have exactly as many items as `[BLANK]`
  markers in the prompt, in order.

**Images**
- Add via the paperclip / camera on any question card. Max 8 MB.
  JPG/PNG/WebP/GIF supported.
- On mobile the camera capture opens the back camera directly.

**Question count**
- The server caps questions per test at 500 rows on load. If you actually
  need more, split into multiple tests.

## Postmortem — the "page unresponsive" saga

A production incident chain worth remembering. Summary: a test detail
page that hung / 500'd for a specific test in production had **four**
independent contributing bugs. Each one alone was survivable; stacked,
they made the failure look mysterious.

**1. Client render hang from ambiguous `$` math delimiter**
The final and hardest to spot. Word-problem prompts written by the
teacher had text like *"cost the store $15… sells for $25"*. The
RichText tokenizer treated bare `$` as a math opener, turned everything
between two `$` into one giant KaTeX render, and KaTeX either hung or
produced huge broken output. Across 10 questions with several `$` each,
the main thread locked up long enough for Chrome's "Page Unresponsive"
dialog to fire.

*Fix:* a bare `$` is only a math delimiter when the next char isn't
whitespace or a digit AND a matching closer with the same rule exists.
Currency stays literal; `$x^2$` still works.

*Lesson:* **any text-formatting shortcut that shares a character with
common human writing needs an escape hatch or a smart-parse.** Bare
`$` for LaTeX is fine in a math paper, hostile in a K–12 word problem.

**2. Vercel function timeout from per-question Storage signing**
Test detail loader signed each question's image and audio URL with its
own `createAdminClient() + createSignedUrl()`. On tests with several
questions, that many sequential HTTPS calls to Supabase Storage was
enough to eat the whole Hobby-tier 10-second budget.

*Fix:* one batched `createSignedUrls(paths[])` call, with a 3-second
hard cap so a slow Storage call can never take down the whole route.

*Lesson:* **N+1 network calls inside a server component multiply
against every render.** Prefer batch APIs and always add a per-call
timeout for third-party dependencies.

**3. framer-motion `Reorder` + `layout` on React 19**
An older commit used `<Reorder.Item layout>` to animate drag-reorder on
the question list. On React 19 + framer-motion 13 this combination
regresses into a render loop that freezes the browser once the list has
3+ items. Two separate deploys hit this before it was correctly
excised.

*Fix:* replaced `Reorder` with a plain `<ul>` and up/down chevron
buttons that call the same server action. Same persistence, no drag
animation, page actually loads.

*Lesson:* **treat animation libraries as first-suspects when "nothing
else changed" breaks a page under a new React major.** Library authors
patch these, but the fix window is measured in weeks; if it costs you
a working page, ship without the animation and re-add it later.

**4. Parallel Claude sessions diverging git history**
Two Claude Code sessions were working on the same repo. One opened a
PR that merged straight into `main`. My subsequent pushes were being
silently rejected against the merged history — so ~8 fixes I *thought*
were live never deployed. Wasted an hour of investigation on stale
code.

*Fix:* `git pull --rebase origin main` before every session, and
periodically inspect Vercel Deployments to confirm the latest commit
hash actually shipped.

*Lesson:* **the deployment log is the source of truth, not the git
push exit code.** Multi-agent workflows on one repo need explicit sync
gates.

### Diagnosis tools that paid off

- Server-side `console.log("[test-detail:XXX] stage +Nms")` timings —
  turned an opaque 175-second Vercel Runtime timeout into a labeled
  trace showing exactly which stage was slow.
- Vercel Runtime Logs' `External APIs` panel — surfaced the sequential
  Supabase Storage calls that were the real cost.
- `count: "exact"` + `.limit(500)` on the runaway questions query —
  bounded the worst case and made a hypothetical "corrupted test with
  10k rows" impossible to blow the function.
- A hard `maxDuration = 10` on the page — flipped an opaque hang into a
  real timeout with a real error message.

### Rules of thumb after this incident

1. **Never render user text through a formatting parser without a
   real-world test corpus.** Currency, quotes, apostrophes, backticks
   inside prose all bite.
2. **N-per-question calls to any external service are always wrong on
   serverless.** Batch or defer to the client.
3. **Every third-party awaited promise gets a hard timeout.** If it
   hangs longer than N seconds, degrade the feature instead of the
   whole page.
4. **Suspend expensive UI work with a defer/skeleton so the page shell
   never depends on it.** Roster + assignments are a great example:
   they belong in a client fetch, not in the RSC critical path.
5. **On React 19, animation libraries are guilty until proven
   innocent.** Test with the exact major version they claim to
   support.
6. **Keep only one Claude session mutating the repo at a time.** Or
   commit to explicit pull-rebase discipline between sessions.

## Licence

MIT.
