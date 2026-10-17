import type { BotEngine } from "../types";

/** Mock "AI": no model, just keyword matching. Defenses run first as input filters. */
export const keywordBot: BotEngine = {
  id: "keyword",
  async reply({ level, activeDefenses, message }) {
    for (const d of activeDefenses) {
      const blocked = d.inputFilter?.(message);
      if (blocked) return blocked;
    }
    const m = message.toLowerCase();
    const rule = level.botConfig.rules?.find((r) =>
      r.allOf.every((group) => group.some((w) => m.includes(w.toLowerCase()))),
    );
    return rule?.reply ?? level.botConfig.fallback ?? "...";
  },
};
