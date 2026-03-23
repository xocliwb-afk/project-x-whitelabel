# Workflow Guardrails

This repository must use pull requests for all changes.

## Rules

1. Never commit directly to `main`.
2. Always work on a feature/fix/chore branch and open a PR.
3. Before opening a PR, run these mandatory gates:
   - `pnpm --dir apps/web lint`
   - `pnpm --dir apps/web build`
   - `pnpm e2e:search`
4. Do not merge until the owner explicitly approves with: `OK merge`.

