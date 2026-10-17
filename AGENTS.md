<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md
- All game content (levels, difficulties, types, defenses, bot engines) is data in `src/game/`; UI reads it generically — keeps content additions code-free.
- Bot replies go through the `BotEngine` interface in `src/game/bots/registry.ts`; mock keyword engine now, LLM later — swap without UI changes.
- Progress is localStorage via `src/game/progress.ts` — no backend yet.
- Developer docs live in `docs/`; update them when module shapes change.
