# OpenRouter LLM integration

The `llm` engine calls OpenRouter through a TanStack server function. The
browser sends the level prompt, conversation history, and current message to
the server function; the server adds the OpenRouter API key and calls the model.
The key must never be placed in a `VITE_*` variable or source file.

The seam remains the `BotEngine` interface in `src/game/types.ts`:

```ts
interface BotEngine { id: string; reply(req: BotRequest): Promise<string> }
// BotRequest = { level, systemPrompt, activeDefenses, history, message }
```

## Local setup

Copy `.env.example` to `.env.local` and set:

```text
OPENROUTER_API_KEY=your-key
OPENROUTER_SITE_URL=http://localhost:3000
```

`.env.local` is ignored by Git. Restart the development server after changing
environment variables.

The current Easy levels use `botEngineId: "llm"`, so all playable levels use
real model behavior. The previous deterministic keyword engine was removed.

## Request flow

1. `askBot()` builds the level system prompt and appends active defense prompt
   additions.
2. `llmBot` runs any active input filters, then calls `askOpenRouter()`.
3. `askOpenRouter()` executes only on the server and sends a system message,
   prior user/assistant messages, and the new user message to OpenRouter.
4. The server returns only the assistant text to the browser.
5. The existing chat component evaluates the response and displays errors with
   its Retry action.

## Model settings

The request defaults to OpenRouter's `openrouter/free` router rather than a
specific model. OpenRouter dynamically selects an available free model for the
request. Set `OPENROUTER_MODEL` only if the team later wants to compare a
specific model. The request uses a low temperature and a 300-token output cap
so gameplay remains focused.

## Errors and security

Missing credentials, HTTP errors, timeouts, and empty responses throw from the
server function. The chat catches the error and shows its existing "Could not
reach the bot / Retry" state.

The OpenRouter key is read from `process.env.OPENROUTER_API_KEY` inside the
server function. It is not exposed through Vite client environment variables,
not included in the request payload from the browser, and not committed to Git.
