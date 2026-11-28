import { MAX_HISTORY_ENTRIES, MAX_INPUT_LENGTH } from "../api";
import type { ChatTurn, CheckPasscodeReply, GameResult, SendChatReply } from "../api";
import { defensesFor, getLevel } from "./levels";
import { askBot, buildSystemPrompt } from "./registry";
import { ProviderError } from "./openrouter";

function hasOnlyKeys<Key extends string>(
  value: unknown,
  keys: Key[],
): value is Record<Key, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function validText(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_INPUT_LENGTH && !!value.trim();
}

function validTurn(value: unknown): value is ChatTurn {
  return (
    hasOnlyKeys(value, ["role", "content"]) &&
    (value.role === "user" || value.role === "assistant") &&
    validText(value.content)
  );
}

export async function runChat(input: unknown): Promise<GameResult<SendChatReply>> {
  if (
    !hasOnlyKeys(input, ["levelId", "history", "message"]) ||
    !validText(input.levelId) ||
    !validText(input.message) ||
    !Array.isArray(input.history) ||
    input.history.length > MAX_HISTORY_ENTRIES
  ) {
    return { error: "INVALID_INPUT" };
  }

  const history: unknown[] = Array.from(input.history);
  if (!history.every(validTurn)) return { error: "INVALID_INPUT" };
  const level = getLevel(input.levelId);
  if (!level) return { error: "LEVEL_NOT_FOUND" };

  try {
    const defenses = defensesFor(level);
    const message = input.message.trim();
    for (const defense of defenses) {
      const blocked = defense.inputFilter?.(message);
      if (blocked) return { reply: blocked, blockedBy: defense.id, won: false };
    }

    // Drop earlier blocked inputs and their paired refusals from the provider context.
    const allowedHistory = history.filter((turn, index) => {
      const userTurn = turn.role === "user" ? turn : history[index - 1];
      return (
        userTurn?.role !== "user" ||
        !defenses.some((defense) => defense.inputFilter?.(userTurn.content))
      );
    });
    const wrap = (text: string) =>
      defenses.reduce((value, defense) => defense.wrapInput?.(value) ?? value, text);
    const reply = await askBot({
      level,
      systemPrompt: buildSystemPrompt(level, defenses),
      history: allowedHistory.map((turn) =>
        turn.role === "user" ? { role: turn.role, content: wrap(turn.content) } : turn,
      ),
      message: wrap(message),
    });

    return { reply, won: level.win.kind === "goal" && level.win.check(reply, message) };
  } catch (error) {
    return { error: error instanceof ProviderError ? error.code : "INTERNAL_ERROR" };
  }
}

export function runPasscodeCheck(input: unknown): GameResult<CheckPasscodeReply> {
  if (
    !hasOnlyKeys(input, ["levelId", "guess"]) ||
    !validText(input.levelId) ||
    !validText(input.guess)
  ) {
    return { error: "INVALID_INPUT" };
  }

  const level = getLevel(input.levelId);
  if (!level) return { error: "LEVEL_NOT_FOUND" };
  if (level.win.kind !== "passcode") return { error: "INVALID_INPUT" };
  return { correct: input.guess.trim().toLowerCase() === level.win.passcode.trim().toLowerCase() };
}
