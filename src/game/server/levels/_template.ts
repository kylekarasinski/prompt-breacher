/**
 * LEVEL TEMPLATE — copy this file, rename it, fill in the fields, then add
 * it to the array in src/game/server/levels/index.ts. Not registered by default.
 */
import type { Level } from "../../types";

export const templateLevel: Level = {
  id: "TYPE-DIFFICULTY", // unique, used in the URL: /play/<id>
  injectionTypeId: "instruction-override", // from config/injectionTypes.ts
  difficultyId: "medium", // from config/difficulties.ts
  name: "[Level name]",
  gimmick: "Passcode", // or "Make it say X", etc.
  description: "[Bot instructions / level description shown to the player]",
  goal: "[Get LLM to...]",
  botPrompt: "[Hidden system prompt]. The password is {{SECRET}}. [More instructions]",
  hints: ["[Hint 1]", "[Hint 2]", "[Hint 3]"],
  starters: ["[Starter 1]", "[Starter 2]"],
  win: { kind: "passcode", passcode: "CHANGE_ME" },
  // win: { kind: "goal", check: (reply) => reply.includes("TARGET") },
  botEngineId: "llm",
  botConfig: {},
  explanation: {
    technique: "[Technique name]",
    whyItWorked: "[Static explanation]",
    defenseId: "ignore-filter", // from config/defenses.ts
    howToDefend: "[Static explanation of the counter]",
  },
};
