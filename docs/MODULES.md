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
    llmBot.stub.ts         OpenRouter-backed LLM engine
    llm.functions.ts       Server-only OpenRouter request
    registry.ts            Picks an engine, builds the system prompt
  progress.ts              Saves completion in localStorage
```

## Current architecture

The project now relies on the OpenRouter LLM engine for playable levels. The
previous deterministic keyword bot was removed so experiments reflect real
model behavior rather than predefined keyword responses.

### Browser request path

1. The player enters a message in `ChatPanel`.
2. `ChatPanel` applies UI guardrails: empty-message checks, cooldowns, repeat
   blocking, and the maximum visible history length.
3. `askBot()` in `bots/registry.ts` receives the level, active defenses, chat
   history, and new message.
4. The registry selects the engine named by `level.botEngineId` and builds the
   system prompt from the level prompt plus active defense instructions.

### OpenRouter path

`llmBot.stub.ts` runs active mock filters, converts the chat history into user
and assistant messages, and calls `askOpenRouter()` in `llm.functions.ts`.
That server function sends the system prompt, history, and new message to
OpenRouter using the `openrouter/free` router by default. The API key is read
from the server environment and never sent to the browser. Only the assistant
text is returned to the UI.

### Result and progress path

The response returns to `ChatPanel` and is rendered as an AI message. Goal
levels evaluate the reply with `win.check()`. Passcode levels are completed in
the side panel when the entered passcode matches. The route then displays the
static explanation and `progress.ts` saves completion in browser
`localStorage`; there is currently no database or remote user account.

### Important testing distinction

All playable levels use the live LLM engine. A real model may refuse an attack
because it follows its system instruction more strongly. That refusal is a
valid experiment result and should be recorded in `docs/EXPERIMENTS.md`.

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
Those defenses are shown under "Defenses in play" (the last one tagged NEW).
Their `inputFilter` runs before the LLM request, and their `promptAddition` is
appended to the system prompt for the LLM engine.

## Add a level
1. Copy `levels/_template.ts` → `levels/my-level.ts`, fill fields.
2. Import and add it to `LEVELS` in `levels/index.ts`. Done.

## Add a difficulty
Add `{ id: "expert", label: "Expert", order: 4 }` to `config/difficulties.ts`. Every type card gets the button.

## Add an injection type
Add an entry to `config/injectionTypes.ts`, then create levels with that `injectionTypeId`.

## Add a defense
Add an entry to `config/defenses.ts`. Optional `inputFilter` (pre-request block) and `promptAddition` (LLM text).
Reference it from a level's `explanation.defenseId`.

## Add / change hints
`hints: string[]` on the level. Any count works; buttons are generated.

## Placeholders
`{{SECRET}}` in `botPrompt` is replaced with the passcode for the bot and masked (`████`) in the UI.

## Chat guardrails
`config/chat.ts`: `cooldownSeconds`, `maxMessages` (older messages cleared), and `blockRepeats`.
If an engine throws, the chat shows "Could not reach the bot" with Retry and keeps the message.

See `docs/LLM_INTEGRATION.md` for connecting a real model.

See `docs/ARCHITECTURE.md` for the visual request-flow diagram.
