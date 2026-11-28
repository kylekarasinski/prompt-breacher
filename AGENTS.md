# AGENTS.md

- All game content (levels, difficulties, types, defenses, bot engines) is data in `src/game/`; UI reads it generically — keeps content additions code-free.
- Bot replies go through the `BotEngine` interface and the registry in `src/game/server/registry.ts`. Playable levels use OpenRouter. UI calls the gameplay server functions.
- Progress is localStorage via `src/game/progress.ts` — no backend yet.
- Developer docs live in `docs/`; update them when module shapes change.
