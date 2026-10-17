import type { BotEngine } from "../types";

/**
 * LLM ENGINE STUB — not implemented on purpose.
 * To wire a real model:
 *  1. Create a server function (createServerFn) in src/game/bots/llm.functions.ts
 *     that receives { systemPrompt, history, message } and calls your model
 *     with the API key kept server-side.
 *  2. Call it from `reply` below and return the text.
 *  3. Set `botEngineId: "llm"` on any level.
 * `systemPrompt` already contains the level prompt plus active defense additions.
 */
export const llmBot: BotEngine = {
  id: "llm",
  async reply(_req) {
    throw new Error("LLM backend not connected yet. See docs/LLM_INTEGRATION.md");
  },
};
