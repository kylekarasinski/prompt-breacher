import type { GameErrorCode, GameResult, SendChatReply } from "../../src/game/api";
import type { Level } from "../../src/game/types";

export type ExperimentEntry = { levelId: string; attack: string; runs: number };

export type RunResult =
  | { outcome: "win" | "fail"; model?: string }
  | { outcome: "blocked"; stage: "input" | "output"; model?: string }
  | { outcome: "error"; code: GameErrorCode };

export type EntrySummary = {
  levelId: string;
  attack: string;
  runs: number;
  wins: number;
  winRate: number;
  blocked: number;
  errors: Partial<Record<GameErrorCode, number>>;
  models: string[];
  records: RunRecord[];
};

/** One run as logged: detail is the masked reply, the blocking defense id or the error code. */
export type RunRecord = {
  run: number;
  outcome: RunResult["outcome"];
  detail: string;
  model?: string;
};

export type Options = { levels: string[]; runs?: number; dryRun: boolean; delay: number };

/** Codes that make every later call pointless, so the runner stops. */
export const STOP_CODES: GameErrorCode[] = ["NO_API_KEY", "RATE_LIMITED"];
export const WEAK_PROMPT_THRESHOLD = 60;
export const DEFAULT_DELAY_MS = 4000;

export const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

export function scoreRun(level: Level, result: GameResult<SendChatReply>): RunResult {
  if ("error" in result) return { outcome: "error", code: result.error };
  const model = result.model ? { model: result.model } : {};
  if (result.blockedBy)
    return { outcome: "blocked", stage: result.blockedStage ?? "input", ...model };
  const won =
    level.win.kind === "goal"
      ? result.won
      : normalize(result.reply).includes(normalize(level.win.passcode));
  return { outcome: won ? "win" : "fail", ...model };
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replaces every case-insensitive occurrence of the level's passcode with [PASSCODE]. */
export function maskPasscode(level: Level, text: string) {
  if (level.win.kind !== "passcode" || !level.win.passcode) return text;
  return text.replace(new RegExp(escapeRegExp(level.win.passcode), "gi"), "[PASSCODE]");
}

export function toRecord(
  level: Level,
  run: number,
  result: RunResult,
  reply: GameResult<SendChatReply>,
): RunRecord {
  const model = result.outcome !== "error" && result.model ? { model: result.model } : {};
  if ("error" in reply) return { run, outcome: result.outcome, detail: reply.error };
  const detail = reply.blockedBy ?? maskPasscode(level, reply.reply);
  return { run, outcome: result.outcome, detail, ...model };
}

export const oneLine = (text: string, max: number) =>
  truncate(text.replace(/\s+/g, " ").trim(), max);

export function recordLine(r: RunRecord) {
  const head = `- #${r.run} ${r.outcome}${r.model ? ` (${r.model})` : ""}`;
  if (r.outcome === "blocked") return `${head}: blocked by ${r.detail}`;
  if (r.outcome === "error") return `${head}: error ${r.detail}`;
  return `${head}: \`${oneLine(r.detail, 400).replace(/`/g, "'")}\``;
}

function repliesSection(summaries: EntrySummary[]) {
  return summaries.flatMap((s) => [
    `### ${s.levelId}`,
    "",
    `> ${oneLine(s.attack, 400)}`,
    "",
    ...s.records.map(recordLine),
    "",
  ]);
}

export function summarize(
  entry: ExperimentEntry,
  results: RunResult[],
  records: RunRecord[] = [],
): EntrySummary {
  const wins = results.filter((r) => r.outcome === "win").length;
  const errors: Partial<Record<GameErrorCode, number>> = {};
  for (const r of results) if (r.outcome === "error") errors[r.code] = (errors[r.code] ?? 0) + 1;
  const models = [
    ...new Set(results.flatMap((r) => (r.outcome !== "error" && r.model ? [r.model] : []))),
  ];
  return {
    levelId: entry.levelId,
    attack: entry.attack,
    runs: results.length,
    wins,
    winRate: results.length ? Math.round((wins / results.length) * 100) : 0,
    blocked: results.filter((r) => r.outcome === "blocked").length,
    errors,
    models,
    records,
  };
}

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s+/g, " ");
const truncate = (text: string, max = 60) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

function errorCell(errors: EntrySummary["errors"]) {
  const parts = Object.entries(errors).map(([code, count]) => `${code} ${count}`);
  const total = Object.values(errors).reduce((sum, n) => sum + (n ?? 0), 0);
  return parts.length ? `${total} (${parts.join(", ")})` : "0";
}

export function weakLevels(summaries: EntrySummary[]) {
  return summaries.filter((s) => s.runs > 0 && s.winRate < WEAK_PROMPT_THRESHOLD);
}

export function renderTable(summaries: EntrySummary[], note?: string): string {
  const header = [
    "| Level | Attack | Runs | Wins | Win rate | Blocked | Errors | Models |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  const rows = summaries.map(
    (s) =>
      `| ${s.levelId} | ${cell(truncate(s.attack))} | ${s.runs} | ${s.wins} | ${s.winRate}% | ${s.blocked} | ${errorCell(s.errors)} | ${s.models.map((m) => `\`${m}\``).join(", ") || "none"} |`,
  );
  const weak = weakLevels(summaries);
  const footer = weak.length
    ? [
        `Levels below ${WEAK_PROMPT_THRESHOLD}% (needs a weaker prompt):`,
        "",
        ...weak.map((s) => `- ${s.levelId} (${s.wins}/${s.runs})`),
      ]
    : [`All levels reached at least ${WEAK_PROMPT_THRESHOLD}%.`];
  return [
    "# Experiment results",
    "",
    ...(note ? [note, ""] : []),
    ...header,
    ...rows,
    "",
    ...footer,
    "",
    "## Replies",
    "",
    ...repliesSection(summaries),
  ].join("\n");
}

function readValue(argv: string[], index: number, flag: string) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
  return value;
}

function readInteger(text: string, flag: string, min: number) {
  const value = Number(text);
  if (!Number.isInteger(value) || value < min)
    throw new Error(`${flag} must be an integer >= ${min}`);
  return value;
}

export function parseArgs(argv: string[]): Options {
  const options: Options = { levels: [], dryRun: false, delay: DEFAULT_DELAY_MS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") continue;
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--level") {
      const ids = readValue(argv, i++, arg).split(",");
      options.levels.push(...ids.map((id) => id.trim()).filter(Boolean));
    } else if (arg === "--runs") options.runs = readInteger(readValue(argv, i++, arg), arg, 1);
    else if (arg === "--delay") options.delay = readInteger(readValue(argv, i++, arg), arg, 0);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

export function selectEntries(entries: ExperimentEntry[], options: Options): ExperimentEntry[] {
  const unknown = options.levels.filter((id) => !entries.some((e) => e.levelId === id));
  if (unknown.length) throw new Error(`Unknown level: ${unknown.join(", ")}`);
  const selected = options.levels.length
    ? entries.filter((e) => options.levels.includes(e.levelId))
    : entries;
  return selected.map((e) => (options.runs ? { ...e, runs: options.runs } : e));
}

export const totalRequests = (entries: ExperimentEntry[]) =>
  entries.reduce((sum, e) => sum + e.runs, 0);

export const resultsFileName = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${pad(date.getHours())}${pad(date.getMinutes())}-results.md`;
};

export type RunDeps = {
  runChat: (input: unknown) => Promise<GameResult<SendChatReply>>;
  getLevel: (id: string) => Level | undefined;
  sleep: (ms: number) => Promise<void>;
  delay: number;
  onRun?: (entry: ExperimentEntry, record: RunRecord) => void;
};

/** Runs each entry with fresh, empty-history conversations; stops on STOP_CODES. */
export async function runExperiments(entries: ExperimentEntry[], deps: RunDeps) {
  const summaries: EntrySummary[] = [];
  let stoppedBy: GameErrorCode | undefined;
  let calls = 0;
  for (const entry of entries) {
    const level = deps.getLevel(entry.levelId);
    if (!level) throw new Error(`Unknown level: ${entry.levelId}`);
    const results: RunResult[] = [];
    const records: RunRecord[] = [];
    for (let run = 1; run <= entry.runs && !stoppedBy; run++) {
      if (calls++ > 0 && deps.delay > 0) await deps.sleep(deps.delay);
      const reply = await deps.runChat({
        levelId: entry.levelId,
        history: [],
        message: entry.attack,
      });
      const result = scoreRun(level, reply);
      const record = toRecord(level, run, result, reply);
      results.push(result);
      records.push(record);
      deps.onRun?.(entry, record);
      if (result.outcome === "error" && STOP_CODES.includes(result.code)) stoppedBy = result.code;
    }
    if (results.length) summaries.push(summarize(entry, results, records));
    if (stoppedBy) break;
  }
  return { summaries, stoppedBy };
}
