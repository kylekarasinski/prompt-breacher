import { describe, expect, it, vi } from "vitest";
import { getLevel, LEVELS } from "@/game/server/levels";
import { ATTACKS } from "../../scripts/experiments/attacks";
import {
  normalize,
  parseArgs,
  renderTable,
  resultsFileName,
  runExperiments,
  scoreRun,
  selectEntries,
  summarize,
  totalRequests,
  type RunResult,
} from "../../scripts/experiments/lib";

const passcodeLevel = getLevel("instruction-override-easy")!;
const goalLevel = getLevel("poisoned-review-easy")!;

describe("attack list", () => {
  it("has exactly one entry per registered level", () => {
    for (const level of LEVELS) {
      expect(ATTACKS.filter((a) => a.levelId === level.id)).toHaveLength(1);
    }
    expect(ATTACKS).toHaveLength(LEVELS.length);
  });

  it("only names existing levels and quotes their third hint", () => {
    for (const entry of ATTACKS) {
      const level = getLevel(entry.levelId);
      expect(level).toBeDefined();
      expect(level?.hints[2]).toContain(entry.attack);
      expect(entry.runs).toBe(5);
    }
  });
});

describe("scoreRun", () => {
  it("uses won for goal levels", () => {
    expect(scoreRun(goalLevel, { reply: "x", won: true, model: "m" })).toEqual({
      outcome: "win",
      model: "m",
    });
    expect(scoreRun(goalLevel, { reply: "x", won: false })).toEqual({ outcome: "fail" });
  });

  it("finds the passcode after normalization", () => {
    expect(scoreRun(passcodeLevel, { reply: "It is Z-e-p-h-y-r!", won: false }).outcome).toBe(
      "win",
    );
    expect(scoreRun(passcodeLevel, { reply: "No.", won: false }).outcome).toBe("fail");
  });

  it("counts blocked replies as blocked even if they contain the passcode", () => {
    expect(
      scoreRun(passcodeLevel, {
        reply: "ZEPHYR",
        won: false,
        blockedBy: "f",
        blockedStage: "output",
        model: "m",
      }),
    ).toEqual({ outcome: "blocked", stage: "output", model: "m" });
  });

  it("maps errors", () => {
    expect(scoreRun(passcodeLevel, { error: "TIMEOUT" })).toEqual({
      outcome: "error",
      code: "TIMEOUT",
    });
  });

  it("normalizes case and punctuation", () => {
    expect(normalize("Zé-PHYR 1!")).toBe("zphyr1");
  });
});

describe("summarize and renderTable", () => {
  const entry = { levelId: "lvl", attack: "a".repeat(80), runs: 5 };
  const results: RunResult[] = [
    { outcome: "win", model: "m1" },
    { outcome: "win", model: "m2" },
    { outcome: "fail", model: "m1" },
    { outcome: "blocked", stage: "input" },
    { outcome: "error", code: "PROVIDER_DOWN" },
  ];

  it("aggregates counts, win rate and unique models", () => {
    expect(summarize(entry, results)).toEqual({
      levelId: "lvl",
      attack: entry.attack,
      runs: 5,
      wins: 2,
      winRate: 40,
      blocked: 1,
      errors: { PROVIDER_DOWN: 1 },
      models: ["m1", "m2"],
    });
  });

  it("renders header, row and weak-level footer", () => {
    const table = renderTable([summarize(entry, results)]);
    expect(table).toContain(
      "| Level | Attack | Runs | Wins | Win rate | Blocked | Errors | Models |",
    );
    expect(table).toContain(
      `| lvl | ${"a".repeat(59)}… | 5 | 2 | 40% | 1 | 1 (PROVIDER_DOWN 1) | \`m1\`, \`m2\` |`,
    );
    expect(table).toContain("needs a weaker prompt");
    expect(table).toContain("- lvl (2/5)");
  });

  it("omits weak levels at 60% or more", () => {
    const strong = summarize(entry, results.slice(0, 2).concat({ outcome: "fail" }));
    expect(strong.winRate).toBe(67);
    expect(renderTable([strong])).not.toContain("- lvl");
  });

  it("names the results file by local time", () => {
    expect(resultsFileName(new Date(2026, 10, 28, 9, 5))).toBe("2026-11-28-0905-results.md");
  });
});

describe("parseArgs and selectEntries", () => {
  it("parses flags", () => {
    expect(
      parseArgs([
        "--",
        "--level",
        "a,b",
        "--level",
        "c",
        "--runs",
        "2",
        "--dry-run",
        "--delay",
        "0",
      ]),
    ).toEqual({ levels: ["a", "b", "c"], runs: 2, dryRun: true, delay: 0 });
    expect(parseArgs([])).toEqual({ levels: [], dryRun: false, delay: 4000 });
  });

  it.each([["--runs", "0"], ["--runs", "x"], ["--delay"], ["--bogus"]])("rejects %s", (...argv) => {
    expect(() => parseArgs(argv)).toThrow();
  });

  it("filters, overrides runs and rejects unknown levels", () => {
    const picked = selectEntries(
      ATTACKS,
      parseArgs(["--level", "prompt-leak-easy", "--runs", "2"]),
    );
    expect(picked).toEqual([
      { ...ATTACKS.find((a) => a.levelId === "prompt-leak-easy")!, runs: 2 },
    ]);
    expect(totalRequests(selectEntries(ATTACKS, parseArgs([])))).toBe(105);
    expect(() => selectEntries(ATTACKS, parseArgs(["--level", "nope"]))).toThrow();
  });
});

describe("runExperiments", () => {
  const entries = [
    { levelId: "instruction-override-easy", attack: "go", runs: 3 },
    { levelId: "poisoned-review-easy", attack: "go", runs: 2 },
  ];

  it("runs fresh conversations with delays between calls", async () => {
    const runChat = vi.fn(async () => ({ reply: "zephyr", won: true, model: "m" }));
    const sleep = vi.fn(async () => {});
    const { summaries, stoppedBy } = await runExperiments(entries, {
      runChat,
      getLevel,
      sleep,
      delay: 10,
    });
    expect(stoppedBy).toBeUndefined();
    expect(runChat).toHaveBeenCalledTimes(5);
    expect(runChat).toHaveBeenCalledWith({
      levelId: "instruction-override-easy",
      history: [],
      message: "go",
    });
    expect(sleep).toHaveBeenCalledTimes(4);
    expect(summaries.map((s) => s.wins)).toEqual([3, 2]);
  });

  it.each(["NO_API_KEY", "RATE_LIMITED"] as const)("stops early on %s", async (code) => {
    const runChat = vi
      .fn()
      .mockResolvedValueOnce({ reply: "zephyr", won: false })
      .mockResolvedValueOnce({ error: code });
    const { summaries, stoppedBy } = await runExperiments(entries, {
      runChat,
      getLevel,
      sleep: async () => {},
      delay: 0,
    });
    expect(stoppedBy).toBe(code);
    expect(runChat).toHaveBeenCalledTimes(2);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ runs: 2, wins: 1, errors: { [code]: 1 } });
  });

  it("keeps going on other errors", async () => {
    const runChat = vi.fn(async () => ({ error: "PROVIDER_DOWN" as const }));
    const { summaries } = await runExperiments(entries, {
      runChat,
      getLevel,
      sleep: async () => {},
      delay: 0,
    });
    expect(runChat).toHaveBeenCalledTimes(5);
    expect(summaries[1]?.errors).toEqual({ PROVIDER_DOWN: 2 });
  });
});
