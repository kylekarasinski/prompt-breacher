import { createServerFn } from "@tanstack/react-start";

type LlmMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type OpenRouterInput = {
  systemPrompt: string;
  history: LlmMessage[];
  message: string;
};

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const viteEnv = import.meta.env as Record<string, string | undefined>;

function validateInput(value: unknown): OpenRouterInput {
  if (!value || typeof value !== "object") throw new Error("Invalid model request.");
  const input = value as Partial<OpenRouterInput>;
  if (
    typeof input.systemPrompt !== "string" ||
    typeof input.message !== "string" ||
    !Array.isArray(input.history)
  ) {
    throw new Error("Invalid model request.");
  }
  return {
    systemPrompt: input.systemPrompt,
    message: input.message,
    history: input.history.filter(
      (item): item is LlmMessage =>
        !!item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant" || item.role === "system") &&
        typeof item.content === "string",
    ),
  };
}

export const askOpenRouter = createServerFn({ method: "POST" })
  .validator(validateInput)
  .handler(async ({ data }) => {
    const apiKey = process.env["OPENROUTER_API_KEY"] ?? viteEnv["OPENROUTER_API_KEY"];
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured on the server.");

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env["OPENROUTER_SITE_URL"] ?? "http://localhost:3000",
        "X-OpenRouter-Title": "PROMPT//BREACH",
      },
      body: JSON.stringify({
        model: process.env["OPENROUTER_MODEL"] ?? "openrouter/free",
        messages: [
          { role: "system", content: data.systemPrompt },
          ...data.history,
          { role: "user", content: data.message },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const payload = (await response.json()) as OpenRouterResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenRouter request failed (${response.status}).`);
    }

    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenRouter returned an empty response.");
    return text;
  });
