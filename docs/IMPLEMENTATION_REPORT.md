# PROMPT//BREACH implementation and verification

Date recorded November 27, 2026. The implementation runs in the Windows
checkout on `jonija`. The base is
`57133c980693d0fb9ccf0165c0e971c07eeffa25`. The working tree was clean at
handoff, with one worktree and no active merge, rebase, cherry-pick or
competing implementation session. Fetch confirmed `HEAD` and `origin/main`
were identical. `jonija` was eight commits ahead of `origin/jonija`; local
`main` was left in place.

## Assigned work

| Task | Status                     | Evidence                                                                                                                                                                     |
| ---- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1   | Implemented and documented | `docs/API.md` records chat, passcode and the masked public catalog.                                                                                                          |
| X2   | Implemented proposal       | Seven typed failures are documented with their source requirements. Team agreement is unrecorded.                                                                            |
| B1   | Implemented                | Server registry selects level and defenses, assembles requests and scores fresh replies. Blocked replies and passcode chat cannot win.                                       |
| B2   | Implemented                | Separate passcode RPC compares trimmed, case-insensitive guesses and returns one boolean on success.                                                                         |
| B5   | Implemented                | A private provider helper replaces the old arbitrary-prompt RPC. The production manifest has no old ID and the old URL returns HTTP 500 for an unknown function.             |
| B6   | Implemented                | Validates level IDs, current input and guesses, checks all history entries, and rejects injected system roles, malformed input and oversize requests before provider use.    |
| B7   | Verified                   | Mocked provider and UI regressions, adversarial review, production asset scan, direct-source checks and old endpoint checks.                                                 |
| B15  | Implemented                | Reusable `wrapInput` applies the data fence to raw user turns after filtering. The UI keeps original text through chat, restore and replay.                                  |
| X12  | Implemented                | Medium inherits the data fence. Hard also inherits the fence guard and teaches least privilege. Both ship with three hints, three starters and a simulated endorsement goal. |
| X14  | Implemented                | API, architecture, provider, module guide and implementation evidence are in `docs/`.                                                                                        |

Supporting changes for B3/B4 and F5–F7 move private data into
`src/game/server/`, project the public catalog, load it through the router,
and wire chat, the passcode form and the win dialog to server results. The
nine existing levels retain their IDs. Progress and chat use their existing
storage keys. A keyed play component resets round state when moving between
levels. The catalog now serves 11 playable levels.

## Verification

| Check                                                              | Baseline or observed result                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline `bun run test`                                            | 6 files, 60 tests passed.                                                                                                                                                                                                                                                                                              |
| Final `bun run test`                                               | 7 files, 104 tests passed, 0 failed or skipped.                                                                                                                                                                                                                                                                        |
| `bun run lint`                                                     | Exit 0, after normalizing Windows checkout line endings on nine files with unchanged Git content. The initial run reported 206 carriage-return formatting errors.                                                                                                                                                      |
| `bun x tsc --noEmit`                                               | Exit 0.                                                                                                                                                                                                                                                                                                                |
| `bun run build`                                                    | Exit 0, including client, SSR and Nitro. Vite emitted its existing tsconfig-paths advisory.                                                                                                                                                                                                                            |
| `git diff --check`                                                 | Exit 0.                                                                                                                                                                                                                                                                                                                |
| Chrome walkthrough, production build with an offline provider mock | Passed welcome, 11-level picker, masked prompt, wrong and correct guesses, replay, existing Override blocking, both Poisoned Review levels, hints, starters, original displayed history, Next level, simulated win, refresh and 404 routing. No uncaught browser errors. The mock received exactly two provider calls. |
| Local dev and VS Code                                              | The checkout opened in Visual Studio Code. `bun run dev --host 127.0.0.1` served the app at `http://127.0.0.1:3000/`.                                                                                                                                                                                                  |
| Bounded live smoke                                                 | One benign Medium review reached the configured `openrouter/free` provider on the dev server and rendered an assistant reply. No retries or paid model calls. [OpenRouter Free Models Router](https://openrouter.ai/openrouter/free)                                                                                   |

## Security evidence and review

- **Production asset exposure** went from 5 of 5 distinct synthetic passcodes
  found in the baseline's 11 compiled assets to 0 of 5 across all 13 files
  under final `.output/public`. The scan printed counts only.
- **Retired RPC** was registered in the baseline SSR manifest. Its name and
  original ID were absent from the final build. A POST to its original local
  production URL returned the framework's HTTP 500 for an unknown function.
  A valid transport envelope containing a forbidden `system` turn reached
  `sendChat` and returned `INVALID_INPUT` without contacting the provider.
- **Development-source exposure** was found during adversarial review. Vite
  returned a stub with an inline source map that still contained the original
  source. After adding the server subtree to the filesystem deny list,
  direct, raw, URL, and absolute-path dev requests returned HTTP 403.
  The production URL returned 404. The final probes found no passcode in
  those responses or their inline source maps.
- **Regression review** caught a cross-realm timeout exception that initially
  mapped to `PROVIDER_DOWN`. The provider now recognizes the timeout signal
  or exception name. Transport and unit tests cover timeout, rate limits,
  invalid responses, unexpected errors, inherited blocks and fresh-reply
  scoring. The independent read-only review found that removing historical
  blocked input could leave an orphaned refusal. The server now removes the
  pair when building model context, and a request-payload regression checks
  that normal turns are preserved. The reviewer verified the fix.
- **Trust boundary** includes server-side validation and existing cross-site
  request middleware. The browser-supplied transcript and local completion
  remain untrusted. Public rate limiting, a persistent leaderboard and
  repeated live model experiments are outside the assigned work. The game
  sends only chat completions and equips Poisoned Review with no action tools.

## Manual review

1. Run `bun run test`, `bun run lint`, `bun x tsc --noEmit` and `bun run build`. Use the printed URL after
   `bun run dev`, accept the welcome screen, and check the picker has 11 levels.
2. Open Instruction Override Easy. Check that the displayed prompt is masked,
   submit a wrong guess, then submit the authorized test passcode with
   mixed case and surrounding spaces. Replay and check that progress remains
   recorded while chat clears. Try a blocked phrase in Override Medium.
3. Open Poisoned Review Medium, reveal its hints, and click a starter. With
   a mock provider, a reply containing the approval phrase should award a
   win and enable Next level. Verify the displayed input remains as typed.
4. In Hard, try a literal review tag and confirm a block. Send the third
   hint's quoted-review example with a mock provider that returns the
   approval phrase. Confirm the lesson and replay. A live model's response
   and attack success depend on the selected model.
5. Rebuild and run the following count-only check in PowerShell. It reads the
   passcodes and compiled files locally and prints only the totals.

```powershell
$assets = @(Get-ChildItem .output/public -File -Recurse)
$passcodes = @(rg -o 'passcode: "[^"]+"' src/game/server/levels --glob '!_template.ts' --no-filename |
  ForEach-Object { ($_ -split '"')[1] } | Sort-Object -Unique)
$found = @($passcodes | Where-Object {
  $passcode = $_
  $assets | Where-Object {
    [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($_.FullName)).Contains($passcode)
  }
})
"Passcodes checked=$($passcodes.Count), exposed=$($found.Count), files=$($assets.Count)"
```

## Git state and limits

`jonija` remains at the base commit, 0 commits ahead or behind
`origin/main` and 8 ahead of `origin/jonija`. Implementation changes and
documentation are present as unstaged edits and new files. The final status has 17 modified, 15 deleted and 22 untracked paths, including the private module moves. The Git index has
no staged changes. No commits or pushes were made.

The one live check verifies the configured provider connection and response
rendering. Goal wins, provider failures and abuse cases were exercised with
offline replies. Cross-team API and error-code approval remains unrecorded.

## Final acceptance review

**Verdict: conditionally approved for the local educational demo.** The
implementation and playbook thresholds passed the acceptance checks. Team
agreement on the shared API and error envelope remains open. Public deployment
would expose the unthrottled game endpoints and requires a separate decision.

### Final status of the assigned work

| Task | Acceptance result                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| X1   | Pass. Typed chat and passcode contracts plus a redacted catalog are documented and match their consumers.                                   |
| X2   | Technically verified. All seven codes are implemented and documented. Team agreement is still pending.                                      |
| B1   | Pass. Server owns the prompt, defense selection, model call and fresh-reply scoring. Blocked chat and passcode chat never award a win.      |
| B2   | Pass. The server verifies trimmed, case-insensitive guesses. Wrong and correct submissions worked in Chrome.                                |
| B5   | Pass. Only the gameplay APIs reach the private provider helper. The old ID is absent from the build and rejected by the production runtime. |
| B6   | Pass. HTTP probes rejected malformed history, injected system roles, private configuration fields and inputs over their limits.             |
| B7   | Pass. Offline regressions, full verification, final asset and HTTP checks, and independent re-review passed.                                |
| B15  | Pass. The guard runs on raw input; the server wraps eligible review turns once and preserves the displayed transcript.                      |
| X12  | Pass for the measured batch. Retuned Medium achieved 3/5 and Hard 5/5. The simulated actions run as text only.                              |
| X14  | Pass. API, architecture, OpenRouter setup, experiment flow, and acceptance evidence match the implementation.                               |

### Findings and corrections by severity

- **P2, fixed. Development server could disclose game passcodes after a
  production build.** Direct GETs fetched both the Nitro intermediate SSR
  bundle and the final server bundle. Each returned HTTP 200 with all five
  passcodes. The development route to the experiment notes also revealed one.
  The deny list now covers private source and both generated server paths.
  The historical example uses a placeholder. Both bundle routes now return
  HTTP 403 with zero matches, and the notes return HTTP 200 with zero matches.
  [Vite deny rules](../vite.config.ts#L11) · [Experiment notes](EXPERIMENTS.md)
- **P2, fixed for the measured challenge. Baseline live play missed the
  threshold.** Medium won 0/5 and Hard 1/5. Seven attempts ended at the token
  limit without usable reply text. The shared OpenRouter request now asks
  providers to disable reasoning within the existing 300-token cap. Medium
  models a deliberately naïve first-closing-tag trust decision. Hard requests
  relevant verbatim quotes and retains the guard. The request regression
  checks the new setting. Final outcomes were 3/5 and 5/5, with two distinct
  HTTP 400 provider failures in Medium. Their cause is unverified.
  [Provider payload](../src/game/server/openrouter.ts#L25) ·
  [Level prompts](../src/game/server/levels/poisoned-review-higher.ts#L13) ·
  [Per-trial outcomes and models](EXPERIMENTS.md#poisoned-review-live-acceptance-trials)
- **P2, open for public deployment.** A caller can supply untrusted assistant
  turns that influence future model input. The server rejects system turns and
  explicit private overrides, but it does not authenticate the claimed
  transcript. The passcode endpoint is an equality oracle for synthetic
  game values. Neither it nor chat enforces server-side rate limits. These
  constraints are accepted for the local educational game. Proxy-level body
  limits and authenticated or server-stored progress are also separate work.
  [History validation](../src/game/server/gameplay.ts#L23) ·
  [Passcode verification](../src/game/server/gameplay.ts#L80)
- **P3, fixed.** The experiment flow and repository instructions still referred
  to the old browser engine. The API description now explicitly identifies the
  prompt and defense teaching prose visible to players. Catalog responses
  omit passcodes, executable defenses, scoring logic and engine config.
  [Public projection](../src/game/server/catalog.ts#L14) · [Gameplay API](API.md)

The independent reviewer inspected the pending diff and re-reviewed the
corrections. The nine pre-existing level definitions matched their baseline
apart from import-path changes. The reviewer confirmed that Hard replaces
Medium's trust rule and still applies the literal delimiter guard. The
previous orphaned refusal fix remains covered by a request-payload regression
and by the blocked-then-winning Hard Chrome interaction.
[Provider history](../src/game/server/gameplay.ts#L56)

### Supporting checklist assessment

This records coverage for team coordination. Assignment ownership remains with
the team.

| Task | Status          | Evidence                                                                                                                                         |
| ---- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| B3   | Partial         | Projected catalog and per-level lookup through the route are present. The separately named `getPublicLevel(id)` RPC from the playbook is absent. |
| B4   | Fully satisfied | Levels and defenses are server-only, with client-import and dev filesystem protections.                                                          |
| B8   | Fully satisfied | Final production scan found 0 of 5 registered passcodes in 13 public files.                                                                      |
| F5   | Fully satisfied | Chat uses server replies and win outcomes, and preserves input for retry on typed errors.                                                        |
| F6   | Fully satisfied | Passcode form waits for the server and handles correct, incorrect, and unavailable results.                                                      |
| F7   | Fully satisfied | Picker, play route, progress total, hints and win dialog use the public catalog.                                                                 |
| F9   | Fully satisfied | Chat and passcode component tests use server-function mocks.                                                                                     |

### Final runs and manual verification

| Check                               | Result                                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run test`                      | Exit 0. 7 files, 104 passed, 0 failed or skipped.                                                                                                                                                                                           |
| `bun run lint`                      | Exit 0.                                                                                                                                                                                                                                     |
| `bun run --no-install tsc --noEmit` | Exit 0.                                                                                                                                                                                                                                     |
| `bun run build`                     | Exit 0, client, SSR and Nitro. The existing tsconfig-paths advisory appeared.                                                                                                                                                               |
| Production and dev security checks  | 0/5 published passcodes, no retired name or ID, retired POST HTTP 500, rejected invalid payloads, and protected dev routes HTTP 403.                                                                                                        |
| Chrome                              | All 11 registered levels loaded, showed hints, and returned a normal offline chat reply. Targeted paths verified passcodes, blocking, original text, Medium and Hard wins, replay, refresh, and unknown-level 404. No uncaught page errors. |
| Bounded live run                    | 20 free-router calls across initial and final samples plus two local-only Hard filter controls. Model IDs and failures are in [Experiments](EXPERIMENTS.md#poisoned-review-live-acceptance-trials).                                         |

Open [the local app](http://127.0.0.1:3000/) from the VS Code checkout and
follow the manual review steps above. The developer server remained available.
The mock walk verified all 11 levels. The live win-rate claim covers the two
new levels and the measured trials only. Model routing and rate-limit
conditions can change. The literal phrase scorer measures a simulated win; it
does not confirm a semantic endorsement or trigger a real action.

### Git snapshot at acceptance and recommended commit groupings

Stayed on `jonija` at `57133c9`, even with freshly fetched `origin/main`
and eight commits ahead of `origin/jonija`. The index contains no staged changes. The final status has 19 modified, 15 deleted and 22 untracked paths, including module moves. No commits,
pushes or merges were made. The final workspace includes the server modules
and their previous-path deletions, shared API/types, routes and game components,
tests, Vite configuration, and repository docs. The acceptance pass modified
`AGENTS.md`, `vite.config.ts`, `src/game/server/openrouter.ts`,
`src/game/server/levels/poisoned-review-higher.ts`, `src/test/gameplay.test.ts`,
and `docs/{API,ARCHITECTURE,EXPERIMENTS,IMPLEMENTATION_REPORT,LLM_INTEGRATION}.md`.

Suggested groups for a later authorized commit cycle:

1. Server boundary and client contracts, private source moves, typed validation,
   rerouted UI and matching coverage.
2. Poisoned Review teaching prompts and defense coverage, plus the short-reply
   provider setting and its request regression.
3. API and operational documentation, acceptance evidence and live trial results.
