import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

type ModelSize = "large" | "small";

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

// ---- Provider routing --------------------------------------------------------

function pickModel(size: ModelSize): string {
  switch (env.AI_PROVIDER) {
    case "claude":
      return size === "large" ? env.CLAUDE_MODEL_LARGE : env.CLAUDE_MODEL_SMALL;
    case "ollama":
      return size === "large" ? env.OLLAMA_MODEL_LARGE : env.OLLAMA_MODEL_SMALL;
    default:
      return size === "large" ? env.GROQ_MODEL_LARGE : env.GROQ_MODEL_SMALL;
  }
}

// ---- Groq / Ollama (OpenAI-compatible via groq-sdk) --------------------------

function makeGroqLike() {
  if (env.AI_PROVIDER === "ollama") {
    return new Groq({ apiKey: "ollama", baseURL: env.OLLAMA_BASE_URL });
  }
  if (!env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing. Set it in .env.local, or switch AI_PROVIDER."
    );
  }
  return new Groq({ apiKey: env.GROQ_API_KEY });
}

async function generateViaGroq(
  messages: ChatMessage[],
  options: GenerateOptions
): Promise<string> {
  const client = makeGroqLike();
  const response = await client.chat.completions.create({
    model: pickModel(options.size ?? "large"),
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 4096,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  });
  const text = response.choices[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty response from AI provider.");
  return text;
}

// ---- Claude (Anthropic SDK) --------------------------------------------------

function makeAnthropic() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is missing. Get one at console.anthropic.com (separate from your claude.ai subscription)."
    );
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/**
 * Claude's Messages API doesn't have `response_format: json_object`.
 * We fold any "system" messages into the top-level `system` field, ask for
 * JSON in prose (the caller's system prompt already does), then strip any
 * accidental code fences from the reply. Parsing is done by generateJson().
 */
async function generateViaClaude(
  messages: ChatMessage[],
  options: GenerateOptions
): Promise<string> {
  const client = makeAnthropic();

  const systemBlocks = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const nonSystem = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await client.messages.create({
    model: pickModel(options.size ?? "large"),
    max_tokens: options.maxTokens ?? 4096,
    system: systemBlocks || undefined,
    messages: nonSystem,
  });

  let text = "";
  for (const block of response.content) {
    if (block.type === "text") text += block.text;
  }
  text = text.trim();
  if (!text) throw new Error("Empty response from Claude.");

  // Strip ```json ... ``` fences if the model wrapped its output.
  if (options.jsonMode) {
    const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) text = fence[1].trim();
  }
  return text;
}

// ---- Public API --------------------------------------------------------------

export async function generate(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  return env.AI_PROVIDER === "claude"
    ? generateViaClaude(messages, options)
    : generateViaGroq(messages, options);
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
