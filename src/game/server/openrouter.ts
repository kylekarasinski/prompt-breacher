import type { GameErrorCode } from "../api";
import type { BotEngine, BotRequest } from "../types";

export class ProviderError extends Error {
  constructor(readonly code: GameErrorCode) {
    super(code);
  }
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter({ systemPrompt, history, message }: BotRequest): Promise<string> {
  const apiKey = process.env["OPENROUTER_API_KEY"]?.trim();
  if (!apiKey) throw new ProviderError("NO_API_KEY");

  const signal = AbortSignal.timeout(30_000);
  try {
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
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.4,
        reasoning: { enabled: false },
        max_tokens: 300,
      }),
      signal,
    });

    if (response.status === 429) throw new ProviderError("RATE_LIMITED");
    if (response.status === 408 || response.status === 504) throw new ProviderError("TIMEOUT");
    if (!response.ok) throw new ProviderError("PROVIDER_DOWN");

    const payload = await response.json();
    if (payload?.error?.code === 429) throw new ProviderError("RATE_LIMITED");
    if (payload?.error?.code === 408 || payload?.error?.code === 504) {
      throw new ProviderError("TIMEOUT");
    }
    if (payload?.error) throw new ProviderError("PROVIDER_DOWN");
    const content: unknown = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new ProviderError("PROVIDER_DOWN");
    return content.trim();
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const timedOut =
      signal.aborted ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "TimeoutError");
    throw new ProviderError(timedOut ? "TIMEOUT" : "PROVIDER_DOWN");
  }
}

export const openRouterEngine: BotEngine = { id: "llm", reply: callOpenRouter };
