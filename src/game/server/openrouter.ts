import type { GameErrorCode } from "../api";
import type { BotEngine, BotReply, BotRequest } from "../types";

export class ProviderError extends Error {
  constructor(readonly code: GameErrorCode) {
    super(code);
  }
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RETRYABLE: GameErrorCode[] = ["PROVIDER_DOWN", "TIMEOUT", "RATE_LIMITED"];

async function requestCompletion(
  apiKey: string,
  model: string,
  { systemPrompt, history, message }: BotRequest,
): Promise<BotReply> {
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
        model,
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
    const answeredBy: unknown = payload?.model;
    return typeof answeredBy === "string" && answeredBy
      ? { text: content.trim(), model: answeredBy }
      : { text: content.trim() };
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

// One retry with the same model, then one try with the optional fallback model.
// A rate-limited model is not retried: an immediate retry only spends more of the quota.
async function callOpenRouter(request: BotRequest): Promise<BotReply> {
  const apiKey = process.env["OPENROUTER_API_KEY"]?.trim();
  if (!apiKey) throw new ProviderError("NO_API_KEY");

  const primary = process.env["OPENROUTER_MODEL"]?.trim() || "openrouter/free";
  const fallback = process.env["OPENROUTER_FALLBACK_MODEL"]?.trim();
  const models = fallback ? [primary, primary, fallback] : [primary, primary];
  let lastError: unknown;
  for (const model of models) {
    if (
      model === primary &&
      lastError instanceof ProviderError &&
      lastError.code === "RATE_LIMITED"
    )
      continue;
    try {
      const reply = await requestCompletion(apiKey, model, request);
      console.info(`[openrouter] model=${reply.model ?? "unknown"}`);
      return reply;
    } catch (error) {
      if (!(error instanceof ProviderError) || !RETRYABLE.includes(error.code)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export const openRouterEngine: BotEngine = { id: "llm", reply: callOpenRouter };
