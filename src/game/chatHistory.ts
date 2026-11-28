import type { ChatMessage } from "./types";

/**
 * Per-level chat history in sessionStorage, so a refresh keeps the conversation
 * but closing the tab starts fresh. Storage can be missing or blocked (SSR,
 * private mode), so every access is guarded and failures fall back to empty.
 */
export type SavedChat = { msgs: ChatMessage[]; cleared: boolean };

const key = (levelId: string) => `pi-game-chat:${levelId}`;
const empty: SavedChat = { msgs: [], cleared: false };

const isBlocked = (b: unknown): b is ChatMessage["blocked"] => {
  const x = b as Partial<NonNullable<ChatMessage["blocked"]>> | null;
  return (
    !!x &&
    typeof x.by === "string" &&
    typeof x.name === "string" &&
    (x.stage === "input" || x.stage === "output")
  );
};

const isMessage = (m: unknown): m is ChatMessage => {
  const x = m as Partial<ChatMessage> | null;
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.text === "string" &&
    (x.role === "user" || x.role === "ai") &&
    (x.blocked === undefined || isBlocked(x.blocked))
  );
};

export function loadChat(levelId: string): SavedChat {
  try {
    const raw = JSON.parse(sessionStorage.getItem(key(levelId)) ?? "null") as Partial<SavedChat>;
    if (!raw || !Array.isArray(raw.msgs)) return empty;
    return { msgs: raw.msgs.filter(isMessage), cleared: raw.cleared === true };
  } catch {
    return empty;
  }
}

export function saveChat(levelId: string, chat: SavedChat) {
  try {
    sessionStorage.setItem(key(levelId), JSON.stringify(chat));
  } catch {
    // Storage full or blocked: history just won't survive a refresh.
  }
}

export function clearChat(levelId: string) {
  try {
    sessionStorage.removeItem(key(levelId));
  } catch {
    // Nothing to clear.
  }
}
