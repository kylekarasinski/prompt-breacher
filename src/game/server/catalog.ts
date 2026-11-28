import type { PublicDefense, PublicLevel } from "../types";
import { getDefense } from "./defenses";
import { LEVELS, defensesFor } from "./levels";
import { buildSystemPrompt } from "./registry";

function publicDefense({ id, name, description }: PublicDefense): PublicDefense {
  return { id, name, description };
}

export const publicCatalog: PublicLevel[] = LEVELS.map((level) => {
  const defenses = defensesFor(level);
  const { id, injectionTypeId, difficultyId, name, gimmick, description, goal, hints, starters } =
    level;
  const { technique, whyItWorked, defenseId, howToDefend } = level.explanation;
  const taughtDefense = getDefense(defenseId);
  if (!taughtDefense) throw new Error("Unregistered level defense");
  return {
    id,
    injectionTypeId,
    difficultyId,
    name,
    gimmick,
    description,
    goal,
    hints,
    ...(starters ? { starters } : {}),
    displayPrompt: buildSystemPrompt(level, defenses, true),
    winKind: level.win.kind,
    defenses: defenses.map(publicDefense),
    explanation: { technique, whyItWorked, defenseId, howToDefend },
    taughtDefense: publicDefense(taughtDefense),
  };
});
