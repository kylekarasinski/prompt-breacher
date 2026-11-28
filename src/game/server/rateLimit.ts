export type RateLimiter = {
  /** Records a hit for `key` and returns false when the key is over its limit. */
  take: (key: string) => boolean;
  /** Number of keys currently tracked. */
  size: () => number;
};

/** In-memory sliding-window limiter. Keys idle for a full window are pruned once per window. */
export function createRateLimiter({
  max = 10,
  windowMs = 60_000,
  now = Date.now,
}: { max?: number; windowMs?: number; now?: () => number } = {}): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastPrune = now();

  function prune(cutoff: number) {
    for (const [key, stamps] of hits) {
      if ((stamps.at(-1) ?? 0) <= cutoff) hits.delete(key);
    }
  }

  return {
    take(key) {
      const time = now();
      const cutoff = time - windowMs;
      if (time - lastPrune >= windowMs) {
        prune(cutoff);
        lastPrune = time;
      }
      const recent = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      hits.set(key, [...recent, time]);
      return true;
    },
    size: () => hits.size,
  };
}

/** Shared limiter for chat messages: 10 per minute per client IP. */
export const chatRateLimiter = createRateLimiter();
