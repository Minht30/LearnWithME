# Quill

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
| AI (production)  | Groq · `llama-3.3-70b-versatile`       | Meta community licence · free API              |
| AI (grading)     | Groq · `llama-3.1-8b-instant`          | Meta community licence · free API              |
| AI (local dev)   | Ollama · `llama3.2:latest`             | Apache 2.0 · fully local                       |
| PDF export       | `@react-pdf/renderer`                  | MIT                                            |
| Doc parsing      | `unpdf`, `mammoth`                     | MIT / BSD                                      |
| Motion           | Framer Motion                          | MIT                                            |
| Deployment       | Vercel Hobby                           | Free for non-commercial                        |

The AI layer speaks the OpenAI-compatible chat-completions shape. Switch providers by changing one env var (`AI_PROVIDER=groq|ollama`) — no code change needed.

## Local setup

```bash
git clone <your-fork>
cd quill
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

## Licence

MIT.
