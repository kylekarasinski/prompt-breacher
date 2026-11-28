import { describe, expect, it, vi } from "vitest";

import { runChat } from "@/game/server/gameplay";
import { getDefense } from "@/game/server/defenses";
import { DIFFICULTIES } from "@/game/config/difficulties";
import { INJECTION_TYPES } from "@/game/config/injectionTypes";
import { LEVELS } from "@/game/server/levels";

// Replies come from the server in real play; here we only check each level reaches an engine.
vi.mock("@/game/server/openrouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/game/server/openrouter")>()),
  openRouterEngine: { id: "llm", reply: vi.fn(async () => "ok") },
}));

describe.each(LEVELS.map((l) => [l.id, l] as const))("level %s", (_id, level) => {
  it("uses a bot engine that exists", async () => {
    await expect(runChat({ levelId: level.id, history: [], message: "hello" })).resolves.toEqual({
      reply: "ok",
      won: false,
    });
  });

  it("points at a real injection type, difficulty and defense", () => {
    expect(INJECTION_TYPES.map((t) => t.id)).toContain(level.injectionTypeId);
    expect(DIFFICULTIES.map((d) => d.id)).toContain(level.difficultyId);
    expect(getDefense(level.explanation.defenseId)).toBeDefined();
  });

  it("hides its passcode behind {{SECRET}} instead of writing it in the prompt", () => {
    if (level.win.kind !== "passcode") return;
    expect(level.botPrompt).toContain("{{SECRET}}");
    expect(level.botPrompt.toUpperCase()).not.toContain(level.win.passcode.toUpperCase());
  });
});

it("has no two levels in the same slot", () => {
  const slots = LEVELS.map((l) => `${l.injectionTypeId}/${l.difficultyId}`);
  expect(new Set(slots).size).toBe(slots.length);
});
