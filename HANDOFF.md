# V2.2 decision workspaces preview handoff

## Status

The local preview is complete in the isolated `codex/v22-decision-workspaces` worktree. Nothing in this worktree has been merged, pushed or deployed. Owner approval is required before integration.

## Completed scope

- Replaced the bounded Investor, Policy and Learn mode canvases with guided task workflows while preserving Explore and the V2.1 application shell.
- Investor now supports research setup, a user-built peer set, explicit comparability and data depth, selected evidence, thesis/catalyst/risk/invalidation/open-question fields, local persistence, copy and Markdown memo export.
- Removed Investor's fixed Nantong/Shenzhen/Suzhou/Hefei seeds and generic composite-score chart from the active V2.2 surface.
- Policy now supports task selection, strong/weak/missing chain evidence, target-node selection, candidate qualification reasons and disqualifiers, a browser-local project pipeline, copy and Markdown attraction-brief export.
- Policy repeatedly states that missing text evidence is not proof of a real industrial gap and that structural candidates do not imply contact, relocation, investment or expansion intent.
- Learn now provides three polished cases and a gated Observe → Diagnose → Decide → Defend → Debrief flow. It requires evidence, diagnosis, decision, counter-evidence and invalidation before feedback.
- Removed Learn's decorative allocation sliders. Progress and case attempts persist locally; feedback is labelled process completion rather than professional certification or a unique correct answer.
- Added a shared desktop three-column task shell, tablet evidence stacking, mobile single-column flow, horizontally scrollable step navigation and source/data-readiness inspector.

## Modified files

- Runtime: `index.html`, `assets/v22-app.js`, `assets/v22.css`, `package.json`.
- Architecture and guidance: `TASK.md`, `README.md`, `docs/IA_AND_DOM_MAPPING.md`, `docs/DESIGN_TOKENS.md`, `docs/QUALITY_GATES.md`.
- Validation: `playwright.config.mjs`, `tests/v21.spec.mjs`, `tests/v22.spec.mjs`, `docs/qa/VISUAL_QA.md`, `docs/qa/v22/`, `docs/qa/playwright-report/`.
- Unchanged: all source datasets, generated city/company data, map assets and legal files.

## Architecture decisions

1. **Bounded additive layer.** `v22-app.js` loads after V2.1 and replaces only `#v21ModeCanvas` for Investor, Policy and Learn. Removing two V2.2 asset references restores the V2.1 workbenches.
2. **Immutable evidence.** The V2.2 adapter reads existing global city, company, taxonomy and evidence data but never mutates source datasets.
3. **Local working records.** Task records use `atlas.v22.workspaces`. They are research notes, not verified external events or project facts.
4. **Artifacts over dashboards.** Investor ends in an investment research memo, Policy in an attraction brief/pipeline, and Learn in a saved attempt and case record.
5. **Honest completeness.** The UI exposes D1/D2/D3, completeness and known missing fields instead of synthesizing valuations, jobs, capex, policy effects or enterprise intent.

## V2.2 data interfaces

- Investor: `subjectCity`, `industry`, `horizon`, `objective`, `peerCities`, `selectedEvidence`, `thesis`, `catalysts`, `risks`, `invalidation`, `openQuestions`, `updatedAt`.
- Policy: `city`, `industry`, `taskType`, `selectedGap`, `shortlist`, `pipeline[{company, stage, owner, nextAction, due}]`, `updatedAt`.
- Learn: `caseId`, `step`, `selectedEvidence`, `diagnosis`, `decision`, `counterEvidence`, `invalidation`, `confidence`, `completedAt`.

## Run commands

```bash
cd /Users/jiayiwang0106/Documents/Codex/2026-07-26/chrome-plugin-chrome-openai-bundled-file/work/atlas-v22-decision-workspaces
npm install
npm run serve
npm test
```

Local preview:

`http://127.0.0.1:4182/?mode=investor&province=江苏&city=南通#workbench`

## Test results

- `npm test`: PASS.
- Smoke: `34 provinces, 365 city indexes, 1758 enterprises across 365 cities, 16 value chains.`
- Browser suite: `16 passed` with one worker.
- New end-to-end flows: Investor peer/memo/download, Policy gap/candidate/pipeline/download, Learn gated answer/debrief/persistence.
- V2.1 regression flows: Explore map/city, command palette, mode/context, city list/URL, enterprise table/export, map pointer/HK/Macau/Taiwan, mobile cards and offline degradation.
- Viewports: 390x844, 768x1024, 1440x900 and 1920x1080 all have `scrollWidth <= clientWidth`.
- Console: no unexpected errors across the three V2.2 modes.
- Production dependency audit: `npm audit --omit=dev` reported zero vulnerabilities. A subsequent full audit could not reach the npm registry in the restricted environment, so dev-tool advisories were not refreshed.
- `git diff --check`: PASS.
- Legal diff: empty.

## Screenshots

- `docs/qa/v22/v22-investor-390x844.png`
- `docs/qa/v22/v22-investor-768x1024.png`
- `docs/qa/v22/v22-investor-1440x900.png`
- `docs/qa/v22/v22-investor-1920x1080.png`
- `docs/qa/v22/v22-investor-memo-1440x900.png`
- `docs/qa/v22/v22-policy-pipeline-1440x900.png`
- `docs/qa/v22/v22-learn-debrief-1440x900.png`

## Visual differences

- Replaced dashboard card grids with a stable task rail, one primary work surface and a bounded evidence inspector.
- Preserved the existing navy/cyan identity, semantic status colors, spacing and typography rather than applying a new skin.
- Forms use 40px-or-larger targets; evidence and explanatory text are at least 11px where meaningful.
- On mobile, the step rail scrolls inside its container and the document itself has no horizontal overflow.

## Non-regression evidence

- 34 province-level regions, 365 city profiles, 1,758 enterprise records, 16 chains, 96 nodes and Nantong's deep sample remain unchanged.
- Local ECharts, national and province maps, map pointer navigation, Taiwan drilldown, Hong Kong and Macau remain available.
- Explore, command palette, URL restoration, city-first research order, enterprise table/cards and offline fallback remain covered by the passing V2.1 suite.
- `LICENSE`, `COMMERCIAL-LICENSE.md`, `THIRD_PARTY_NOTICES.md` and `NOTICE.md` have no diff.

## Known issues and limits

- Task records are device-local. There is no account, team sharing, audit log or server-side sync.
- Policy lacks nationwide structured customer, talent, land, energy, capex, jobs and policy-execution data, so impact modelling is intentionally absent.
- Structural candidate selection is based on existing public company/industry samples and remains a research shortlist only.
- Learn contains three guided cases; its rubric measures process completeness, not expert correctness.
- Markdown export is intentionally simple and does not yet generate a branded PDF or editable DOCX.

## License changes

None. The project remains source-available under PolyForm Noncommercial 1.0.0. Commercial use still requires separate paid written permission.

## Rollback

1. Remove `assets/v22.css` and `assets/v22-app.js` references from `index.html`.
2. Remove `assets/v22.css`, `assets/v22-app.js` and `tests/v22.spec.mjs`.
3. Restore the V2.1 work-mode assertions in `tests/v21.spec.mjs` and `playwright.config.mjs` test matching.
4. Leave all V2.1 runtime, data, maps, generated records and legal files intact.

## Next task after owner approval

Create an intentional V2.2 commit and owner-reviewed integration path, then update the public README screenshot and deploy only after explicit `OK`. A later data worktree should add verified structured projects, talent, production factors and policy-execution records before any impact model or collaboration backend.
