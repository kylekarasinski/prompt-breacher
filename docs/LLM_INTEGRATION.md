# Adding a real LLM later

No LLM code is active. The seam is the `BotEngine` interface in `src/game/types.ts`:

```ts
interface BotEngine { id: string; reply(req: BotRequest): Promise<string> }
// BotRequest = { level, systemPrompt, activeDefenses, history, message }
```

## Steps
1. Create `src/game/bots/llm.functions.ts` with a TanStack `createServerFn` that accepts
   `{ systemPrompt, history, message }`, calls your model server-side (API key in an env var,
   never in the browser) and returns the reply text.
2. In `llmBot.stub.ts`, call that server function inside `reply()` using `req.systemPrompt`,
   `req.history` and `req.message`.
3. Set `botEngineId: "llm"` on any level. Keyword levels keep working side by side.

## Prompts
- Level prompt: `level.botPrompt` (with `{{SECRET}}`).
- Defense prompt text: each defense's `promptAddition`, appended automatically by `buildSystemPrompt()`.
- Need per-level engine settings (model name, temperature)? Put them in `level.botConfig`; it's free-form.

## Goal checks with an LLM
Goal levels still use `win.check(reply)`, so you can keep keyword checks or make `check` stricter.

## Errors
Throwing in `reply()` triggers the chat's "Could not reach the bot / Retry" state automatically.
