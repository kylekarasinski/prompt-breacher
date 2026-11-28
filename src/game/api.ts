export const MAX_HISTORY_ENTRIES = 20;
export const MAX_INPUT_LENGTH = 500;

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type SendChatInput = { levelId: string; history: ChatTurn[]; message: string };
export type SendChatReply = { reply: string; blockedBy?: string; won: boolean };
export type CheckPasscodeInput = { levelId: string; guess: string };
export type CheckPasscodeReply = { correct: boolean };

export type GameErrorCode =
  | "NO_API_KEY"
  | "RATE_LIMITED"
  | "PROVIDER_DOWN"
  | "TIMEOUT"
  | "INVALID_INPUT"
  | "LEVEL_NOT_FOUND"
  | "INTERNAL_ERROR";

export type GameResult<T> = T | { error: GameErrorCode };

export const CHAT_ERRORS: Record<GameErrorCode, string> = {
  NO_API_KEY: "The server is missing its OpenRouter API key.",
  RATE_LIMITED: "The model provider is rate limiting requests. Try again shortly.",
  PROVIDER_DOWN: "Could not reach the bot. Your message is still in the box.",
  TIMEOUT: "The bot took too long to respond.",
  INVALID_INPUT: "Enter a message of 1 to 500 characters.",
  LEVEL_NOT_FOUND: "This level could not be found.",
  INTERNAL_ERROR: "The bot could not answer. Try again.",
};
