# V2.1 visual QA

Date: 2026-07-29
Baseline commit: `08087d8bb781952284482d6ae3126281085cb416`
Preview branch: `codex/v21-platform-preview`

## Required viewports

| Viewport | Baseline | V2.1 final | Page overflow | Visible meaningful text below 11px |
| --- | --- | --- | ---: | ---: |
| 390 × 844 | `baseline/baseline-390x844.png` | `v21/v21-explore-390x844.png` | none | 0 |
| 768 × 1024 | `baseline/baseline-768x1024.png` | `v21/v21-explore-768x1024.png` | none | 0 |
| 1440 × 900 | `baseline/baseline-1440x900.png` | `v21/v21-explore-1440x900.png` | none | 0 |
| 1920 × 1080 | `baseline/baseline-1920x1080.png` | `v21/v21-explore-1920x1080.png` | none | 0 |

The final captures load `v21.css`, `app.js`, and `v21-app.js` with build key `20260729.4`. For every viewport, `documentElement.scrollWidth === documentElement.clientWidth`.

## Additional state captures

- `v21/v21-investor-1440x900.png`: full-width Investor workbench, comparable evidence chart, Bull/Bear panel.
- `v21/v21-command-palette-1440x900.png`: modal command palette, grouped results and visible combobox focus.
- `v21/v21-company-cards-390x844.png`: mobile enterprise cards replacing the desktop table.
- `baseline/baseline-nantong-1440x900.png`: original city-detail reference.

## Visual differences

- Replaced the long-page entry with a persistent mode and city context shell.
- Explore uses a 58/42 map-and-research split at desktop widths; task modes use a full-width workbench.
- Reduced decorative glow and nested gradients while retaining the original deep navy, cyan and blue-violet identity.
- Standardized card, table, state, focus and chart styles through semantic tokens.
- Moved dense enterprise evidence into a professional desktop table and prioritized mobile cards.
- Raised legacy map labels and remaining visible microcopy to the 11px readability floor.

## Interaction and accessibility evidence

- The palette was opened from its real button; focus moved to the combobox and Playwright verified ArrowUp/ArrowDown, Enter, Escape and trigger-focus restoration.
- Map regions were activated through real canvas pointer events; the city list was verified as an equivalent keyboard path.
- Mobile uses mutually exclusive Map/Research surfaces and renders 22 Nantong enterprise cards without page-level overflow.
- ECharts canvases have visible title, unit, period, source, text summary and ARIA descriptions.
- Browser checks and Playwright captured no unexpected console errors or page errors.
- Reduced-motion, visible focus, dialog focus containment and live status regions are covered in the V2.1 CSS/controller and browser tests.

## Known visual trade-offs

- On a 390px screen, comparison and source actions use compact icon treatment with accessible names to keep the context bar on one line.
- The Explore map remains vertically scrollable on tablet and mobile; this preserves usable map scale instead of shrinking labels below the readability threshold.
- Storybook was not introduced into this static no-build baseline. Browser-state coverage and screenshot evidence are handled by Playwright to keep the migration additive and reversible.
