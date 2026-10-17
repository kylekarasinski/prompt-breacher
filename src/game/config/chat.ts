/** Chat guardrails from the wireframes. Tweak values here. */
export const CHAT_CONFIG = {
  /** Seconds the player must wait between messages. */
  cooldownSeconds: 3,
  /** Keep at most this many messages; older ones are cleared. */
  maxMessages: 20,
  /** Block sending the exact same message twice in a row. */
  blockRepeats: true,
  /** Fake latency (ms) for the mock bot so the "typing" state is visible. */
  mockLatencyMs: 700,
};

export const GAME_NAME = "PROMPT//BREACH";
