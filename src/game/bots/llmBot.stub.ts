import type { BotEngine } from "../types";
import { askOpenRouter } from "./llm.functions";

/** OpenRouter-backed engine. The API key is read only inside the server function. */
export const llmBot: BotEngine = {
  id: "llm",
  async reply({ activeDefenses, history, message, systemPrompt }) {
    for (const defense of activeDefenses) {
      const blocked = defense.inputFilter?.(message);
      if (blocked) return blocked;
    }

    return askOpenRouter({
      data: {
        systemPrompt,
        history: history.map((item) => ({
          role: item.role === "ai" ? "assistant" : item.role,
          content: item.text,
        })),
        message,
      },
    });
  },
};
