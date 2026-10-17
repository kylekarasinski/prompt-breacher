import { useEffect, useState, useCallback } from "react";

/** Progress is stored in localStorage. Swap these two functions for a backend later. */
const KEY = "pi-game-progress";
type Progress = { accepted: boolean; completed: string[] };
const empty: Progress = { accepted: false, completed: [] };

const load = (): Progress => {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return empty;
  }
};
const save = (p: Progress) => localStorage.setItem(KEY, JSON.stringify(p));

export function useProgress() {
  const [p, setP] = useState<Progress>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setP(load());
    setReady(true);
  }, []);
  const update = useCallback((fn: (p: Progress) => Progress) => {
    setP((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);
  return {
    ready,
    accepted: p.accepted,
    completed: p.completed,
    accept: () => update((x) => ({ ...x, accepted: true })),
    complete: (id: string) =>
      update((x) => (x.completed.includes(id) ? x : { ...x, completed: [...x.completed, id] })),
  };
}
