# OpenRouter LLM integration

Set `OPENROUTER_API_KEY` in the server environment. For local Bun development,
copy `.env.example` to the Git-ignored `.env.local` and set the key there.
Restart the server after changing the file. Keep credentials out of
`VITE_*` variables and source files.

```sh
bun run dev
```

The private `callOpenRouter` helper in `src/game/server/openrouter.ts` is used by
the server-side `BotEngine` registry. The public chat function accepts a
registered level ID and limited conversation turns. The server chooses the
engine and assembles the system message, defense additions, transformed user
turns and current input. Passcode verification and defense blocks run without
calling OpenRouter.

The request defaults to `openrouter/free`, with temperature 0.4, a 300-token
output cap and a 30-second timeout. The request asks providers to disable
reasoning so the short response budget is available for visible reply text.
Model support varies. [OpenRouter reasoning controls](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens). Set `OPENROUTER_MODEL` to pin a model and
`OPENROUTER_SITE_URL` to change the optional referrer. The provider receives
game prompts, chat and synthetic values used in play. Poisoned Review uses
chat completions with no tools or downstream actions.

The API returns typed errors for missing configuration, rate limiting,
timeouts, provider failures and invalid gameplay requests. The browser keeps
the unsent message in the composer and shows a Retry action. The provider
helper makes one upstream call for each eligible chat request. Per-client
rate limiting is a separate playbook task.

The mock tests exercise the exact server-built request payload, status mapping
and win checks without using credentials or making provider requests.
A live model can refuse a scripted exercise or produce different text across
runs. See [Gameplay API](API.md) and the
[implementation and verification report](IMPLEMENTATION_REPORT.md).
