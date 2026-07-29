# Repository execution rules

This repository is a production baseline, not a disposable prototype.

## Required sequence

1. Read `TASK.md`, the current baseline audit, migration specification, UI specification, worktree plan, quality gates, README, and license files.
2. Execute `skills/01-*` through `skills/08-*` in numeric order.
3. Work only in the branch and worktree named by `TASK.md`.
4. Preserve the current production entry point while new modules are introduced incrementally.
5. Do not merge, push, publish, or deploy until the owner approves the local preview.

## Non-regression floor

- 34 province-level regions and 365 city profiles remain available.
- At least 1,758 deduplicated enterprise records remain available.
- 16 industry chains and 96 value-chain nodes remain available.
- Nantong retains at least 19 deep enterprise samples.
- ECharts and all China/province maps remain local-first; Taiwan, Hong Kong, and Macau remain reachable.
- City evidence appears before collapsed province context.
- Offline core navigation remains usable.
- `LICENSE`, `COMMERCIAL-LICENSE.md`, and third-party notices remain unchanged unless the task explicitly authorizes legal changes.

## Engineering rules

- Prefer additive modules and semantic design tokens over a wholesale rewrite.
- Never invent a verified project, policy result, financial metric, or enterprise fact. Missing structured evidence must render as an explicit empty or low-confidence state.
- Preserve source, date, scope, and confidence next to consequential claims.
- Keep the existing smoke test and add browser-level tests for new workflows.
- Record every quality-gate result and rollback instruction in `HANDOFF.md`.
