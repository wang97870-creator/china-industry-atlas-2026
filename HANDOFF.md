# V2.1 platform preview handoff

## Status

Preview scope is complete in the isolated worktree. The owner approved integration on 2026-07-29; this handoff is the evidence gate for committing, merging and publicly verifying the approved build. The preview itself was not published before that approval.

## Completed scope

- Persistent Explore / Investor / Policy / Learn mode navigation with retained city and industry context.
- Sticky city context bar with breadcrumb, evidence depth, update date, completeness, compare, watch, share and sources.
- Shareable URL state with refresh and browser back/forward restoration.
- Accessible command palette for province, city, company, ticker, industry, node, project and policy search.
- Explore 58/42 desktop workspace, map/list equivalent entry, pinned city summary and mobile Map/Research switch.
- City-first research sequence through Sources, with Province Context last and collapsed.
- Professional enterprise table on desktop and enterprise cards on mobile.
- City/company comparison, local watchlist, confidence, evidence depth and completeness metadata.
- Investor comparison/Bull-Bear, Policy gap/candidate/project-state, and Learn case/simulation workbenches.
- Explicit Loading, Empty, Error, Low Confidence and Offline states.
- Four-viewport, keyboard, map, URL, console, data and legal non-regression evidence.

## Modified and added files

- Shell and runtime: `index.html`, `assets/app.js`, `assets/v21-app.js`, `assets/v21.css`.
- Documentation: `README.md`, `AGENTS.md`, `CODEX_COMBINED_PROMPT.md`, `TASK.md`, `docs/*.md`, `skills/01-*` through `skills/08-*`, this handoff.
- Validation: `package.json`, `package-lock.json`, `playwright.config.mjs`, `tests/smoke.mjs`, `tests/v21.spec.mjs`, `docs/qa/`.
- Unchanged source-of-truth data: `assets/data.js`, `assets/generated/`, `assets/maps/`.
- Unchanged legal terms: `LICENSE`, `COMMERCIAL-LICENSE.md`, `THIRD_PARTY_NOTICES.md`, `NOTICE.md`.

## Architecture decisions

1. **Additive migration:** the original data and map controller remain in place. `v21.css` and `v21-app.js` load after the baseline and replace only bounded render surfaces.
2. **One shared state:** province, city, industry, company, compare sets and mode are projected into URL parameters and namespaced `atlas.v21.*` local storage where persistence is appropriate.
3. **Immutable evidence base:** no generated dataset is mutated. Evidence depth, confidence and completeness are deterministic presentation metadata.
4. **Honest missing data:** project and financial fields render verified values only; missing nationwide project coverage uses an explicit empty schema.
5. **Equivalent navigation:** the local ECharts map remains primary in Explore, while the keyboard city list is a complete alternative.
6. **Responsive data density:** the same filtered company records render as a sticky-column table above 720px and cards below it.

## New interface components

- Mode tablist and contextual page intro.
- City context bar and comparison tray.
- Command palette dialog/combobox and source drawer.
- Explore geography/list switch and pinned city card.
- City hero, KPI strip, sticky research tabs and research sections.
- Enterprise filters, column chooser, table, mobile cards and evidence detail.
- Investor comparison chart and Bull/Bear register.
- Policy chain-gap matrix, attraction candidates and project empty state.
- Learn cases and simulated allocation controls.
- Loading, Empty, Error, Low Confidence and Offline state panels.

## Data interfaces

- Existing globals from `assets/data.js` and `assets/generated/*.js` are consumed through V2.1 adapter functions; their schemas and record counts are unchanged.
- Map registration continues to use local `assets/maps/china.json` and `assets/maps/provinces/*.json`.
- Charts use the existing local ECharts 5.5.1 runtime and `dataset`-based options where applicable.
- URL parameters are optional and include `mode`, `province`, `city`, `industry`, `company`, `cities`, `companies` and `view`.

## Run commands

```bash
cd /Users/jiayiwang0106/Documents/Codex/2026-07-26/chrome-plugin-chrome-openai-bundled-file/work/atlas-v21-platform-preview
npm install
npm run serve
npm test
```

Local preview used for owner review:

`http://127.0.0.1:4181/?mode=explore&province=江苏&city=南通&build=20260729.4#atlas`

## Test results

- `npm test`: PASS.
- Smoke: `34 provinces, 365 city indexes, 1758 enterprises across 365 cities, 16 value chains.`
- Playwright: `8 passed (38.6s)` using local Chrome and one worker.
- Province maps: 34 local GeoJSON files; Taiwan route verifies 20 city/county features.
- Nantong: at least 19 curated deep-sample enterprises preserved; UI renders 22 total city enterprise records after combined datasets.
- `git diff --check`: PASS.
- Data/map/generated/legal diff against `origin/main`: empty.
- Final browser captures: no page-level horizontal overflow at all four required viewports and no visible meaningful text below 11px.

## Screenshot paths

Before:

- `docs/qa/baseline/baseline-390x844.png`
- `docs/qa/baseline/baseline-768x1024.png`
- `docs/qa/baseline/baseline-1440x900.png`
- `docs/qa/baseline/baseline-1920x1080.png`
- `docs/qa/baseline/baseline-nantong-1440x900.png`

After:

- `docs/qa/v21/v21-explore-390x844.png`
- `docs/qa/v21/v21-explore-768x1024.png`
- `docs/qa/v21/v21-explore-1440x900.png`
- `docs/qa/v21/v21-explore-1920x1080.png`
- `docs/qa/v21/v21-investor-1440x900.png`
- `docs/qa/v21/v21-command-palette-1440x900.png`
- `docs/qa/v21/v21-company-cards-390x844.png`
- Playwright HTML report: `docs/qa/playwright-report/index.html`

## Visual differences

The result changes the product from a map-led long page into a task-led intelligence platform. The original deep-navy/cyan identity remains, but navigation, data density and evidence hierarchy are now consistent: a persistent task shell, desktop split view, full-width decision modes, professional company table, explicit state language and one-surface mobile flow. Full comparison details are recorded in `docs/qa/VISUAL_QA.md`.

## Non-regression checks

- 34 province-level regions, 365 city indexes/profiles, 1,758 deduplicated enterprises, 16 chains and 96 nodes remain available.
- Local ECharts, national map, all 34 province maps, Taiwan city drill-down and Hong Kong/Macau fixed entries remain reachable.
- Real canvas pointer clicks navigate national → Jiangsu → Nantong.
- City content precedes Province Context, and Province Context starts collapsed.
- Core map/data/company browsing remains functional with external-network requests blocked.
- License and paid commercial authorization wording has not changed.

## Known issues and limits

- Nantong remains the only D3 deep-dive template. Other cities display D1/D2 honestly according to source and field completeness.
- Nationwide financing, project, production-factor and policy-execution records are not yet uniformly structured; missing records show Empty or Low Confidence states.
- Investor comparisons use research-fit indices, not normalized valuation models or return forecasts.
- Watchlists, saved filters and Learn allocations are local-browser state; there is no account, backend or collaboration layer.
- Live market values and external source pages still require network access.
- Storybook was deliberately deferred to avoid introducing a parallel component runtime during this incremental static-site migration.

## License changes

None. The project remains source-available under PolyForm Noncommercial 1.0.0. Commercial use still requires a separate paid written authorization.

## Rollback

1. Remove the `assets/v21.css` and `assets/v21-app.js` references and V2.1 shell markup from `index.html`.
2. Restore the six map label/tooltip font-size edits in `assets/app.js` if exact baseline visuals are required.
3. Remove `assets/v21.css`, `assets/v21-app.js`, `tests/v21.spec.mjs` and `playwright.config.mjs`.
4. Keep all data, generated records, maps and legal files; they were not migrated or rewritten.

## Next worktree task

Owner approval has been received. The release task is to create an intentional commit, merge it through a reviewed pull request, update the repository description, verify the deployment and record the public URL. Future data expansion should start in a new isolated worktree.
