import Groq from "groq-sdk";
import { env } from "@/lib/env";

type ModelSize = "large" | "small";

function pickModel(size: ModelSize): string {
  if (env.AI_PROVIDER === "ollama") {
    return size === "large" ? env.OLLAMA_MODEL_LARGE : env.OLLAMA_MODEL_SMALL;
  }
  return size === "large" ? env.GROQ_MODEL_LARGE : env.GROQ_MODEL_SMALL;
}

function makeClient() {
  if (env.AI_PROVIDER === "ollama") {
    return new Groq({
      apiKey: "ollama",
      baseURL: env.OLLAMA_BASE_URL,
    });
  }
  if (!env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing. Set it in .env.local, or switch AI_PROVIDER=ollama for local dev."
    );
  }
  return new Groq({ apiKey: env.GROQ_API_KEY });
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateOptions = {
  size?: ModelSize;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

/**
 * Generate a chat completion using the configured provider.
 * Both Groq and Ollama speak the OpenAI-compatible shape, so one code path.
 */
export async function generate(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  const client = makeClient();
  const model = pickModel(options.size ?? "large");

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 4096,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty response from AI provider.");
  return text;
}

/**
 * Generate and parse a JSON object, retrying once on parse failure.
 */
export async function generateJson<T>(
  messages: ChatMessage[],
  options: Omit<GenerateOptions, "jsonMode"> = {}
): Promise<T> {
  const doOnce = async () => {
    const raw = await generate(messages, { ...options, jsonMode: true });
    return JSON.parse(raw) as T;
  };
  try {
    return await doOnce();
  } catch {
    return await doOnce();
  }
}
