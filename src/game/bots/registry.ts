import type { BotEngine, BotRequest, Level, Defense, ChatMessage } from "../types";
import { keywordBot } from "./keywordBot";
import { llmBot } from "./llmBot.stub";
import { CHAT_CONFIG } from "../config/chat";

/** Register bot engines here. Levels select one with `botEngineId`. */
const ENGINES: Record<string, BotEngine> = {
  [keywordBot.id]: keywordBot,
  [llmBot.id]: llmBot,
};

/** Fill the {{SECRET}} slot and append defense prompt text. */
export function buildSystemPrompt(level: Level, defenses: Defense[], hideSecret = false) {
  const secret = level.win.kind === "passcode" ? level.win.passcode : "";
  const base = level.botPrompt.replace("{{SECRET}}", hideSecret ? "████████" : secret);
  const extra = defenses.map((d) => d.promptAddition).filter(Boolean);
  return [base, ...extra].join("\n");
}

export async function askBot(level: Level, defenses: Defense[], history: ChatMessage[], message: string) {
  const engine = ENGINES[level.botEngineId];
  if (!engine) throw new Error(`Unknown bot engine: ${level.botEngineId}`);
  const req: BotRequest = {
    level,
    activeDefenses: defenses,
    history,
    message,
    systemPrompt: buildSystemPrompt(level, defenses),
  };
  if (engine.id === "keyword") await new Promise((r) => setTimeout(r, CHAT_CONFIG.mockLatencyMs));
  return engine.reply(req);
}
