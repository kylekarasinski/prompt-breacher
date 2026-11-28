import type { BotEngine, BotRequest, Defense, Level } from "../types";
import { openRouterEngine } from "./openrouter";

const ENGINES: Record<string, BotEngine> = { [openRouterEngine.id]: openRouterEngine };

export function buildSystemPrompt(level: Level, defenses: Defense[], maskSecret = false) {
  const secret = level.win.kind === "passcode" ? level.win.passcode : "";
  return [
    level.botPrompt.replaceAll("{{SECRET}}", maskSecret ? "████████" : secret),
    ...defenses.map((defense) => defense.promptAddition).filter(Boolean),
  ].join("\n");
}

export function askBot(request: BotRequest) {
  const engine = ENGINES[request.level.botEngineId];
  if (!engine) throw new Error("Unregistered bot engine");
  return engine.reply(request);
}
