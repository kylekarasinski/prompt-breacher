/**
 * Core data types for the game. Every level, difficulty, injection type,
 * defense and bot engine is described by one of these shapes.
 * See docs/MODULES.md for a walkthrough.
 */

/** Id of a difficulty registered in src/game/config/difficulties.ts */
export type DifficultyId = string;

export interface Difficulty {
  id: DifficultyId;
  label: string;
  /** Sort order. Lower = earlier. Defenses carry forward in this order. */
  order: number;
}

export interface InjectionType {
  id: string;
  name: string;
  description: string;
}

/** A defense the bot can have. `inputFilter` lets the mock bot enforce it. */
export interface Defense {
  id: string;
  name: string;
  description: string;
  /**
   * Optional mock enforcement for the keyword bot. Return a reply string to
   * block the message, or null to let it through. A real LLM backend would
   * instead translate `promptAddition` into its system prompt.
   */
  inputFilter?: (message: string) => string | null;
  /** Text appended to the system prompt when this defense is active. */
  promptAddition?: string;
}

/** Keyword rule for the mock "AI". First matching rule wins. */
export interface KeywordRule {
  /** Message must contain at least one word from EACH group (case-insensitive). */
  allOf: string[][];
  reply: string;
}

/** How a level is won. */
export type WinCondition =
  | { kind: "passcode"; passcode: string }
  | {
      kind: "goal";
      /** Return true when the bot's reply satisfies the goal. */
      check: (botReply: string, userMessage: string) => boolean;
    };

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  text: string;
}

export interface Level {
  id: string;
  injectionTypeId: string;
  difficultyId: DifficultyId;
  name: string;
  /** Short tag such as "Passcode" or "Make it say X". */
  gimmick: string;
  description: string;
  goal: string;
  /** The bot's hidden instructions shown in the side panel. Use {{SECRET}} for the passcode. */
  botPrompt: string;
  hints: string[];
  starters?: string[];
  win: WinCondition;
  /** Which bot engine answers (see src/game/bots/registry.ts). */
  botEngineId: string;
  /** Engine-specific config. For "keyword": { rules, fallback }. */
  botConfig: { rules?: KeywordRule[]; fallback?: string; [k: string]: unknown };
  /** Static win-popup text (no AI request). */
  explanation: {
    technique: string;
    whyItWorked: string;
    defenseId: string;
    howToDefend: string;
  };
}

/** Input passed to any bot engine. */
export interface BotRequest {
  level: Level;
  systemPrompt: string;
  activeDefenses: Defense[];
  history: ChatMessage[];
  message: string;
}

export interface BotEngine {
  id: string;
  reply: (req: BotRequest) => Promise<string>;
}
