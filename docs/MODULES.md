# PROMPT//BREACH developer guide

The game definitions are data in `src/game/`. The React components under
`src/components/game/` and routes under `src/routes/` read the public level
metadata and server outcomes.

| Location                                     | Responsibility                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `types.ts`, `api.ts`                         | Shared types, gameplay request limits and error codes                          |
| `config/`                                    | Injection types, ordered difficulties and browser controls                     |
| `game.functions.ts`                          | Public TanStack gameplay and catalog functions                                 |
| `server/levels/`                             | Registered levels, private prompts, passcodes and goal checks                  |
| `server/defenses.ts`                         | Defense metadata, filters, prompt additions and input transforms               |
| `server/gameplay.ts`                         | Validation, defense pipeline, scoring and passcode verification                |
| `server/registry.ts`, `server/openrouter.ts` | Engine selection, prompt building and provider call                            |
| `server/catalog.ts`                          | Explicit projection to public, masked level metadata                           |
| `progress.ts`, `chatHistory.ts`              | Completion and safety acceptance in local storage, raw chat in session storage |

To add a level, copy `src/game/server/levels/_template.ts` and register the new
definition in `server/levels/index.ts`. Use `{{SECRET}}` as a placeholder in a
passcode prompt. Use the level's `hints` and optional `starters` to provide
player help. Add types and difficulties in `config/`. The level picker shows
all types and uses the registered catalog to determine playable slots.

A level's `explanation.defenseId` names the defense it teaches. Later levels
of the same type inherit it in difficulty order. Use `inputFilter` to reject
raw messages (it also receives the validated prior turns), `outputFilter` to
replace a model reply, `wrapInput` to transform allowed messages, or
`promptAddition` to append model instructions. Keep defense logic and synthetic passcodes in
the private subtree.

See [Gameplay API](API.md), [Architecture](ARCHITECTURE.md) and
[OpenRouter integration](LLM_INTEGRATION.md).
