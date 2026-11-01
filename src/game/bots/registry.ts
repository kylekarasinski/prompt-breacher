import type { BotEngine, BotRequest, Level, Defense, ChatMessage } from "../types";
import { llmBot } from "./llmBot.stub";

/** Register bot engines here. Levels select one with `botEngineId`. */
const ENGINES: Record<string, BotEngine> = {
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
  return engine.reply(req);
}
