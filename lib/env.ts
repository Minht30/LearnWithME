import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),

  AI_PROVIDER: z.enum(["groq", "ollama"]).default("groq"),

  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL_LARGE: z.string().default("llama-3.3-70b-versatile"),
  GROQ_MODEL_SMALL: z.string().default("llama-3.1-8b-instant"),

  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434/v1"),
  OLLAMA_MODEL_LARGE: z.string().default("llama3.2:latest"),
  OLLAMA_MODEL_SMALL: z.string().default("llama3.2:latest"),

  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
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
