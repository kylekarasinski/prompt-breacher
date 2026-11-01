/** Chat guardrails from the wireframes. Tweak values here. */
export const CHAT_CONFIG = {
  /** Seconds the player must wait between messages. */
  cooldownSeconds: 3,
  /** Keep at most this many messages; older ones are cleared. */
  maxMessages: 20,
  /** Block sending the exact same message twice in a row. */
  blockRepeats: true,
};

export const GAME_NAME = "PROMPT//BREACH";
