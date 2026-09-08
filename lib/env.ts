import { z } from "zod";

/**
 * Treat empty strings the same as undefined so a missing env var and an env
 * var explicitly set to "" both fall back to `.default(...)`. Vercel's "detect
 * env vars from .env.example" often creates empty-string entries.
 */
const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema);

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: blankAsUndefined(z.string().default("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: blankAsUndefined(z.string().default("")),
  SUPABASE_SERVICE_ROLE_KEY: blankAsUndefined(z.string().default("")),

  AI_PROVIDER: blankAsUndefined(z.enum(["groq", "ollama"]).default("groq")),

  GROQ_API_KEY: blankAsUndefined(z.string().default("")),
  GROQ_MODEL_LARGE: blankAsUndefined(z.string().default("llama-3.3-70b-versatile")),
  GROQ_MODEL_SMALL: blankAsUndefined(z.string().default("llama-3.1-8b-instant")),

  OLLAMA_BASE_URL: blankAsUndefined(z.string().default("http://127.0.0.1:11434/v1")),
  OLLAMA_MODEL_LARGE: blankAsUndefined(z.string().default("llama3.2:latest")),
  OLLAMA_MODEL_SMALL: blankAsUndefined(z.string().default("llama3.2:latest")),

  NEXT_PUBLIC_APP_URL: blankAsUndefined(z.string().default("http://localhost:3000")),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL_LARGE: process.env.GROQ_MODEL_LARGE,
  GROQ_MODEL_SMALL: process.env.GROQ_MODEL_SMALL,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_MODEL_LARGE: process.env.OLLAMA_MODEL_LARGE,
  OLLAMA_MODEL_SMALL: process.env.OLLAMA_MODEL_SMALL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export type Env = typeof env;
