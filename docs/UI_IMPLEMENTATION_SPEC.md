# V2.1 interface implementation specification

## Global shell

The compact sticky header contains brand, four mode tabs, a search trigger, offline/status indicator, and saved-item access. Immediately below, a sticky context bar carries breadcrumb, evidence depth, last-updated date, completeness, compare/watch, share, and sources.

Mode changes retain selected province, city, industry, company, compare sets, and scroll intent. Selected state is reflected in query parameters and history.

## Explore

At 1200px and wider, the principal work area is a two-column grid: 58% geographic/list workspace and 42% city research. The map/list toggle is an equivalent navigation choice. A pinned city summary sits inside the map area without covering zoom/reset controls. At narrow widths, Map and Research are mutually exclusive views controlled by an accessible segmented control.

## City research order

1. City summary and evidence metadata
2. Core KPI strip
3. Overview
4. Industry Chains
5. Companies
6. Capital & Projects
7. Production Factors
8. Policy & Risks
9. Province Context (collapsed)
10. Sources

Sticky section tabs scroll to these regions. Missing structured content uses explicit Empty or Low-confidence panels; it is not synthesized into facts.

## Companies

Desktop is table-first with sticky company column. Available columns include company, chain role, HQ/base, listing status, ticker, revenue, revenue growth, gross margin, R&D ratio, employees/scope, valuation type, date, and confidence. Controls cover keyword, industry, listing status, sort, column visibility, saved view, current-result export, and detail expansion.

At 720px and below, the same filtered records become vertical cards with priority fields and an expandable evidence area.

## Investor

Full-width decision workspace: comparison queue, comparable KPI table/chart, company comparison, bull/bear evidence, risk register, and watchlist. Derived scores are labelled research fit, not return forecasts. City comparison is capped at four; company comparison at six.

## Policy

Full-width chain-gap workspace: six-node coverage matrix, structural attraction candidates, verified project records or an empty-state schema, production factors, and policy evidence. Project stage vocabulary is 规划, 签约, 备案, 核准, 环评, 开工, 试产, 投产, 运营. Structural matches do not imply relocation or expansion intent.

## Learn

Case-led workspace with Nantong wind/packaging, Hefei new-energy vehicles, Shenzhen AI, and Suzhou advanced manufacturing as evidence paths. Each case separates observation, source, inference, bull case, bear case, and next verification step. Simulated portfolios are educational and carry no execution capability.

## Search and dialogs

The command palette follows dialog and combobox patterns: grouped province/city/company/ticker/industry/node/project/policy results, ArrowUp/ArrowDown, Enter, Escape, selected option announcement, focus trap, and focus restoration. The sources and column chooser are accessible disclosures/dialogs.

## Visual system

Deep navy surfaces, cyan primary action, blue-violet comparison accent, green/amber/red semantic states. Use semantic tokens for background, surface, border, text, focus, spacing, radius, density, elevation, and status. No new font files, no body-text glow, no card-by-card gradients, no more than two card nesting levels, and no meaningful text below 11px.

## Charts

ECharts uses `dataset` where possible. Each chart container includes visible title, unit, period, source, concise text summary, and ARIA description. No 3D charts.
