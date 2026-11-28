import type { ChatTurn } from "./api";

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

/**
 * A defense the bot can have. `inputFilter` blocks known attacks before the model call;
 * `outputFilter` blocks the model's reply before it reaches the player.
 */
export interface Defense {
  id: string;
  name: string;
  description: string;
  /**
   * Return a reply string to block the message, or null to let it through.
   * `history` is the validated conversation before this message.
   */
  inputFilter?: (message: string, history: ChatTurn[]) => string | null;
  /** Return replacement text to block the bot's reply, or null to let it through. */
  outputFilter?: (reply: string, level: Level) => string | null;
  /** Text appended to the system prompt when this defense is active. */
  promptAddition?: string;
  /** Transform raw user input just before it is sent to the model. */
  wrapInput?: (message: string) => string;
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
  /** Set when a defense blocked this turn; the text is the server's refusal string. */
  blocked?: { by: string; name: string; stage: "input" | "output" };
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
  /** Which bot engine answers (see src/game/server/registry.ts). */
  botEngineId: string;
  /** Optional engine-specific configuration. */
  botConfig: { [k: string]: unknown };
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
  history: ChatTurn[];
  message: string;
}

/** A bot reply and, when the provider reports it, the model that produced it. */
export interface BotReply {
  text: string;
  model?: string;
}

export interface BotEngine {
  id: string;
  reply: (req: BotRequest) => Promise<BotReply>;
}

export type PublicDefense = Pick<Defense, "id" | "name" | "description">;

export interface PublicLevel extends Pick<
  Level,
  | "id"
  | "injectionTypeId"
  | "difficultyId"
  | "name"
  | "gimmick"
  | "description"
  | "goal"
  | "hints"
  | "starters"
  | "explanation"
> {
  displayPrompt: string;
  winKind: WinCondition["kind"];
  defenses: PublicDefense[];
  taughtDefense: PublicDefense;
}
