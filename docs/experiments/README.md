# Experiment results

This folder holds results tables written by the experiment runner (`scripts/experiments.ts`).
Each file, `<YYYY-MM-DD-HHmm>-results.md`, lists wins, blocks, errors and models per level.

Run `bun run experiments -- --level <id> --runs 5`. Add `--dry-run` to see the plan
without calling the model, and `--delay <ms>` to change the pause between calls (default 4000).
