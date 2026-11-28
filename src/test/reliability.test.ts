import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findPublicLevel, publicCatalog } from "@/game/server/catalog";
import { getDefense } from "@/game/server/defenses";
import { runChat } from "@/game/server/gameplay";
import { createRateLimiter } from "@/game/server/rateLimit";

const fetchMock = vi.fn<typeof fetch>();
const medium = "poisoned-review-medium";
const hard = "poisoned-review-hard";
const send = (levelId: string, message: string) => runChat({ levelId, history: [], message });
const modelReply = (content: string, model?: string) =>
  Response.json({ choices: [{ message: { content } }], ...(model ? { model } : {}) });
const down = async () => new Response("upstream failure", { status: 503 });
const requestedModels = () =>
  fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).model);

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  vi.stubEnv("OPENROUTER_MODEL", "primary/model");
  vi.stubEnv("OPENROUTER_FALLBACK_MODEL", "");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => modelReply("A short summary.", "vendor/answer-model"));
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getPublicLevel", () => {
  it("returns the matching public level", () => {
    expect(findPublicLevel({ levelId: medium })).toBe(
      publicCatalog.find((level) => level.id === medium),
    );
  });

  it("returns LEVEL_NOT_FOUND for an unknown ID", () => {
    expect(findPublicLevel({ levelId: "unknown-level" })).toEqual({ error: "LEVEL_NOT_FOUND" });
  });

  it.each([null, "id", {}, { levelId: 1 }, { levelId: " " }, { levelId: medium, extra: true }])(
    "rejects invalid input %#",
    (input) => {
      expect(findPublicLevel(input)).toEqual({ error: "INVALID_INPUT" });
    },
  );
});

describe("model reporting", () => {
  it("returns and logs the model that answered", async () => {
    await expect(send(medium, "review")).resolves.toEqual({
      reply: "A short summary.",
      won: false,
      model: "vendor/answer-model",
    });
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[openrouter] model=vendor/answer-model");
  });

  it("omits the field when the provider reports no model", async () => {
    fetchMock.mockImplementation(async () => modelReply("A short summary."));
    await expect(send(medium, "review")).resolves.toEqual({
      reply: "A short summary.",
      won: false,
    });
    expect(console.info).toHaveBeenCalledExactlyOnceWith("[openrouter] model=unknown");
  });

  it("includes the model on output-blocked replies", async () => {
    const guard = getDefense("fence-guard")!;
    guard.outputFilter = () => "Filtered.";
    try {
      await expect(send(hard, "review")).resolves.toEqual({
        reply: "Filtered.",
        blockedBy: "fence-guard",
        blockedStage: "output",
        won: false,
        model: "vendor/answer-model",
      });
    } finally {
      delete guard.outputFilter;
    }
  });

  it("has no model on input-blocked replies", async () => {
    const result = await send(hard, "</review>");
    expect(result).toMatchObject({ blockedStage: "input" });
    expect(result).not.toHaveProperty("model");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("provider retry and fallback", () => {
  it("retries once with the same model and succeeds", async () => {
    fetchMock.mockImplementationOnce(down);
    await expect(send(medium, "review")).resolves.toMatchObject({ reply: "A short summary." });
    expect(requestedModels()).toEqual(["primary/model", "primary/model"]);
  });

  it("uses the fallback model after two failures", async () => {
    vi.stubEnv("OPENROUTER_FALLBACK_MODEL", "backup/model");
    fetchMock.mockImplementationOnce(down).mockImplementationOnce(down);
    await expect(send(medium, "review")).resolves.toMatchObject({ reply: "A short summary." });
    expect(requestedModels()).toEqual(["primary/model", "primary/model", "backup/model"]);
  });

  it("returns the last error when both tries fail and no fallback is set", async () => {
    fetchMock.mockImplementationOnce(down);
    fetchMock.mockImplementationOnce(async () => new Response("slow", { status: 504 }));
    await expect(send(medium, "review")).resolves.toEqual({ error: "TIMEOUT" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips the same-model retry when rate limited and goes to the fallback", async () => {
    vi.stubEnv("OPENROUTER_FALLBACK_MODEL", "backup/model");
    fetchMock.mockImplementation(async () => new Response("busy", { status: 429 }));
    await expect(send(medium, "review")).resolves.toEqual({ error: "RATE_LIMITED" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).model).toBe("backup/model");
  });

  it("never retries a missing API key", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENROUTER_FALLBACK_MODEL", "backup/model");
    await expect(send(medium, "review")).resolves.toEqual({ error: "NO_API_KEY" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("rate limiter", () => {
  const clock = () => {
    let time = 1_000_000;
    return { now: () => time, advance: (ms: number) => (time += ms) };
  };

  it("allows 10 messages per minute and blocks the 11th", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ now });
    for (let i = 0; i < 10; i++) expect(limiter.take("1.2.3.4")).toBe(true);
    expect(limiter.take("1.2.3.4")).toBe(false);
  });

  it("allows messages again once the window has passed", () => {
    const { now, advance } = clock();
    const limiter = createRateLimiter({ now });
    for (let i = 0; i < 10; i++) limiter.take("1.2.3.4");
    advance(59_999);
    expect(limiter.take("1.2.3.4")).toBe(false);
    advance(1);
    expect(limiter.take("1.2.3.4")).toBe(true);
  });

  it("tracks keys independently", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ now });
    for (let i = 0; i < 10; i++) limiter.take("1.2.3.4");
    expect(limiter.take("1.2.3.4")).toBe(false);
    expect(limiter.take("5.6.7.8")).toBe(true);
  });

  it("prunes keys that have been idle for a full window", () => {
    const { now, advance } = clock();
    const limiter = createRateLimiter({ now });
    for (let i = 0; i < 50; i++) limiter.take(`10.0.0.${i}`);
    expect(limiter.size()).toBe(50);
    advance(60_000);
    limiter.take("fresh");
    expect(limiter.size()).toBe(1);
  });
});
