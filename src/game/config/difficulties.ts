import type { Difficulty } from "../types";

/** Add a difficulty by adding one entry. `order` controls defense carry-over. */
export const DIFFICULTIES: Difficulty[] = [
  { id: "easy", label: "Easy", order: 1 },
  { id: "medium", label: "Medium", order: 2 },
  { id: "hard", label: "Hard", order: 3 },
];
