import { describe, expect, it, vi } from "vitest";

import { askBot } from "@/game/bots/registry";
import { getDefense } from "@/game/config/defenses";
import { DIFFICULTIES } from "@/game/config/difficulties";
import { INJECTION_TYPES } from "@/game/config/injectionTypes";
import { LEVELS } from "@/game/levels";

// Replies come from the server in real play; here we only check each level reaches an engine.
vi.mock("@/game/bots/llm.functions", () => ({ askOpenRouter: vi.fn(async () => "ok") }));

describe.each(LEVELS.map((l) => [l.id, l] as const))("level %s", (_id, level) => {
  it("uses a bot engine that exists", async () => {
    await expect(askBot(level, [], [], "hello")).resolves.toBe("ok");
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
