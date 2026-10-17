import type { Level } from "../types";
import { DIFFICULTIES } from "../config/difficulties";
import { getDefense } from "../config/defenses";
import { overrideEasy } from "./override-easy";
import { roleplayEasy } from "./roleplay-easy";

/** REGISTER LEVELS HERE. Order doesn't matter; grouping is automatic. */
export const LEVELS: Level[] = [overrideEasy, roleplayEasy];

const diffOrder = (id: string) => DIFFICULTIES.find((d) => d.id === id)?.order ?? 99;

export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);

export const findLevel = (typeId: string, difficultyId: string) =>
  LEVELS.find((l) => l.injectionTypeId === typeId && l.difficultyId === difficultyId);

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
    .filter(Boolean);

export const nextLevel = (level: Level) => {
  const list = levelsOfType(level.injectionTypeId);
  return list[list.indexOf(level) + 1];
};
