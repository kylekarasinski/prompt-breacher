# PROMPT//BREACH — Developer Guide

All game content lives in `src/game/`. UI lives in `src/components/game/` and `src/routes/`.
You should almost never need to touch UI code to add content.

```text
src/game/
  types.ts                 All data shapes (Level, Defense, BotEngine, ...)
  config/
    difficulties.ts        Easy / Medium / Hard (add more here)
    injectionTypes.ts      Cards on Level Select
    defenses.ts            Defense library (taught on win, active in later levels)
    chat.ts                Cooldown, max messages, repeat-block, game name
  levels/
    _template.ts           Copy this to make a level
    override-easy.ts       Test level 1 (passcode)
    roleplay-easy.ts       Test level 2 (make it say X)
    index.ts               Level registry + helpers
  bots/
    keywordBot.ts          Mock AI: keyword matching only
    llmBot.stub.ts         Placeholder for a real LLM
    registry.ts            Picks an engine, builds the system prompt
  progress.ts              Saves completion in localStorage
```

## How a level flows
1. Level Select (`/levels`) lists every `INJECTION_TYPES` entry × every `DIFFICULTIES` entry.
   A slot is playable if a level with that `injectionTypeId` + `difficultyId` is registered; otherwise it shows "soon".
2. Play (`/play/<level.id>`) shows description, goal, chat and the side panel.
3. Each chat message goes to `askBot()` in `bots/registry.ts`, which picks the engine named by `level.botEngineId`.
4. Win:
   - `win.kind === "passcode"` → player types the passcode in the side panel.
   - `win.kind === "goal"` → `win.check(botReply, userMessage)` runs after every bot reply.
5. Win popup shows the level's static `explanation` (no AI call) and the next level of the same type.

## Defense carry-over (automatic)
Each level names the defense it teaches: `explanation.defenseId`.
`defensesFor(level)` collects the `defenseId` of every **earlier-difficulty** level of the **same injection type**.
Those defenses are shown under "Defenses in play" (the last one tagged NEW), their `inputFilter` runs in the
keyword bot, and their `promptAddition` is appended to the system prompt for the LLM engine.

## Add a level
1. Copy `levels/_template.ts` → `levels/my-level.ts`, fill fields.
2. Import and add it to `LEVELS` in `levels/index.ts`. Done.

## Add a difficulty
Add `{ id: "expert", label: "Expert", order: 4 }` to `config/difficulties.ts`. Every type card gets the button.

## Add an injection type
Add an entry to `config/injectionTypes.ts`, then create levels with that `injectionTypeId`.

## Add a defense
Add an entry to `config/defenses.ts`. Optional `inputFilter` (mock enforcement) and `promptAddition` (LLM text).
Reference it from a level's `explanation.defenseId`.

## Add / change hints
`hints: string[]` on the level. Any count works; buttons are generated.

## Mock bot rules
`botConfig.rules` — first match wins. `allOf` is a list of word groups; the message must contain
at least one word from **every** group. `fallback` is used when nothing matches.

## Placeholders
`{{SECRET}}` in `botPrompt` is replaced with the passcode for the bot and masked (`████`) in the UI.

## Chat guardrails
`config/chat.ts`: `cooldownSeconds`, `maxMessages` (older messages cleared), `blockRepeats`, `mockLatencyMs`.
If an engine throws, the chat shows "Could not reach the bot" with Retry and keeps the message.

See `docs/LLM_INTEGRATION.md` for connecting a real model.
