# Gameplay API

TanStack Start exposes these functions from `src/game/game.functions.ts`. The
React app calls the generated client functions with `{ data: input }`.

## Contract status

The playbook and implementation handoff specify the chat and passcode success
shapes and a sanitized catalog. This branch implements those requirements.
The playbook requests distinct missing-key, rate-limit, provider-down and
timeout errors. The handoff adds invalid-input, unknown-level and internal-error
codes. The seven-code result envelope, exact validation rules and catalog
projection below are the implemented proposal for team review. The available
handoff records no cross-team sign-off.

## sendChat

POST `sendChat({ levelId, history, message }) → { reply, blockedBy?, won }`.

- `levelId` is the registered level ID. `message` is a nonblank string of at most
  500 UTF-16 code units before trimming.
- `history` is a dense array of zero to 20 raw turns. Each has exactly
  `{ role: "user" | "assistant", content: string }` and nonblank content of at most
  500 UTF-16 code units. Client history is untrusted, including assistant turns.
- `reply` is the provider or defense reply. If an inherited defense blocks the
  current input, `blockedBy` is its ID and `won` is false. Goal scoring uses
  the current genuine provider reply and the original current message.
  Passcode chat always returns `won: false`.

## checkPasscode

POST `checkPasscode({ levelId, guess }) → { correct }`.

The server accepts a nonblank guess of at most 500 UTF-16 code units and
compares it case-insensitively after trimming. A wrong guess returns
`{ correct: false }`. A goal level returns `INVALID_INPUT`. This function
makes zero provider calls.

## Public catalog

GET `getLevelCatalog() → PublicLevel[]`. The response includes level IDs, type
and difficulty IDs, names, descriptions, goals, gimmicks, hints, optional
starters, win kind, masked display prompts, active defense metadata, and
the taught defense and explanation. The catalog explicitly projects serializable
fields. Passcode values, raw private configuration, goal predicates, defense
functions and engine configuration stay in server modules. The masked preview
intentionally includes level and defense teaching prose to preserve the game UI.
Treat that prose as public when authoring levels.

## Error results

An application-level failure returns `{ error: GameErrorCode }`. Gameplay
outcomes and typed failures use the same TanStack transport. Framework failures
such as an invalid RPC envelope or cross-site request use the framework's
error path.

| Code              | Meaning                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `NO_API_KEY`      | The server's OpenRouter key is missing or blank.                                       |
| `RATE_LIMITED`    | OpenRouter rejected the request for rate limiting.                                     |
| `PROVIDER_DOWN`   | The provider was unreachable, returned another failure, or returned an unusable reply. |
| `TIMEOUT`         | The provider request exceeded the deadline or reported a timeout.                      |
| `INVALID_INPUT`   | Input or history failed validation, or a guess targeted a goal level.                  |
| `LEVEL_NOT_FOUND` | The supplied level ID is valid in shape and absent from the registry.                  |
| `INTERNAL_ERROR`  | An unexpected gameplay exception occurred.                                             |
