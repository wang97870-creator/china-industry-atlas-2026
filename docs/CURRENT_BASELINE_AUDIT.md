# Current baseline audit

Audit baseline: `08087d8`, checked 2026-07-29.

## Verified assets and counts

| Capability | Baseline evidence |
| --- | --- |
| Province-level coverage | 34 regions |
| City index/profile coverage | 365 / 365 |
| Deduplicated enterprises | 1,758 |
| Value chains / nodes | 16 / 96 |
| Nantong | A-grade deep profile; at least 19 manually researched enterprises |
| Map runtime | Local ECharts 5.5.1, local national map, 34 local province maps |
| Special regions | Taiwan province map; explicit Hong Kong and Macau entries |
| License | PolyForm Noncommercial 1.0.0 plus separate commercial-license terms |

`npm test` passed before modifications with the exact count message recorded in `HANDOFF.md`.

## Existing strengths

- City-first detail flow and collapsed province context already exist.
- Local map loading has a remote fallback and an explicit textual failure state.
- Tooltip rendering is already configured outside the chart container.
- Responsive layouts have no horizontal page overflow at the four required viewports.
- Enterprise records include source, dataset, date/scope, and value-chain relationships.

## Migration gaps

- The page is a long general-purpose landing page instead of a persistent task workbench.
- Search is a browser `datalist`, not a grouped keyboard command palette.
- There is no durable URL state, watchlist, city/company compare tray, or retained mode context.
- Enterprise presentation is card-first on desktop and lacks column controls/export.
- Investor, Policy, and Learn are narrative entry cards rather than operational modes.
- Evidence depth, confidence, data completeness, and system states are not consistently surfaced.
- Automated coverage is smoke-only; there is no browser workflow or screenshot harness.

## Baseline visual evidence

Viewport screenshots live in `docs/qa/baseline/`, including a 1440x900 Nantong research view. All four baseline screenshots recorded `scrollWidth === clientWidth`.
