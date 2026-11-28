import type { Level } from "../../types";
import { DIFFICULTIES } from "../../config/difficulties";
import { getDefense } from "../defenses";
import { overrideEasy } from "./override-easy";
import { roleplayEasy } from "./roleplay-easy";
import { overrideMedium } from "./override-medium";
import { overrideHard } from "./override-hard";
import { promptLeakEasy } from "./prompt-leak-easy";
import { poisonedReviewEasy } from "./poisoned-review-easy";
import { poisonedReviewMedium, poisonedReviewHard } from "./poisoned-review-higher";
import { spellItDifferentlyEasy } from "./spell-it-differently-easy";
import { toolHijackEasy } from "./tool-hijack-easy";
import { fakeExamplesEasy } from "./fake-examples-easy";

/** REGISTER LEVELS HERE. Order doesn't matter; grouping is automatic. */
export const LEVELS: Level[] = [
  overrideEasy,
  overrideMedium,
  overrideHard,
  roleplayEasy,
  promptLeakEasy,
  poisonedReviewEasy,
  poisonedReviewMedium,
  poisonedReviewHard,
  spellItDifferentlyEasy,
  toolHijackEasy,
  fakeExamplesEasy,
];

const diffOrder = (id: string) => DIFFICULTIES.find((d) => d.id === id)?.order ?? 99;

export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);

/** Levels of the same type, sorted by difficulty. */
export const levelsOfType = (typeId: string) =>
  LEVELS.filter((l) => l.injectionTypeId === typeId).sort(
    (a, b) => diffOrder(a.difficultyId) - diffOrder(b.difficultyId),
  );

/** Defenses carried in from earlier levels of the same type (last one is "new"). */
export const defensesFor = (level: Level) =>
  levelsOfType(level.injectionTypeId)
    .filter((l) => diffOrder(l.difficultyId) < diffOrder(level.difficultyId))
    .map((l) => getDefense(l.explanation.defenseId))
    .filter((defense) => defense !== undefined);
