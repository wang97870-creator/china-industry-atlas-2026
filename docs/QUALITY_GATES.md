# Quality gates

## Data and legal

- [x] 34 regions, 365 cities/profiles, at least 1,758 enterprises, 16 chains, and 96 nodes.
- [x] Nantong deep sample count is at least 19.
- [x] Local ECharts/national/province maps remain present; HK/Macau/Taiwan routes remain functional.
- [x] License and commercial-license wording is unchanged.
- [x] No unverified fact is rendered as verified.

## Functional

- [x] Four modes preserve current city/industry/company context.
- [x] Palette opens with `/` and Cmd/Ctrl+K; grouped results navigate with arrows, Enter, Escape, and restore focus.
- [x] URL state survives refresh, back, and forward.
- [x] Map and accessible city list both open a city.
- [x] Company table sorts, filters, changes visible columns, exports, and opens details.
- [x] Compare and watch actions persist; city max is 4 and company max is 6.
- [x] Province context remains after all city sections and starts collapsed.
- [x] Offline/map failure has a usable list/search path.

## Accessibility and responsive

- [x] Visible focus, meaningful labels, dialog focus containment/restoration, and live status announcements.
- [x] Reduced-motion preference removes nonessential transitions.
- [x] Important text is at least 11px and color is not the only status cue.
- [x] 390x844, 768x1024, 1440x900, and 1920x1080 have no page-level horizontal overflow.
- [x] Mobile presents companies as cards and one primary workspace at a time.

## Evidence

- [x] Existing smoke test retained and passing.
- [x] New browser tests pass.
- [x] Before/after screenshots saved for all required viewports.
- [x] Core keyboard, city entry, mode switch, table, map/list, and URL flows tested.
- [x] Browser console has no unexpected errors.
- [x] `HANDOFF.md` records results, visual differences, known issues, rollback, and next task.

## V2.2 decision-workspace gates

- [x] Investor starts with a user-defined research brief and contains no fixed default peer cities.
- [x] Investor supports a user-built peer set, selected evidence, thesis, risk, invalidation and Markdown memo export.
- [x] Policy distinguishes strong, weak and missing evidence and states that missing text evidence is not proof of a real industrial gap.
- [x] Policy candidates include qualification reasons and explicit non-intent language; the pipeline is browser-local and user-maintained.
- [x] Learn requires evidence, diagnosis, decision, counter-evidence and invalidation before Debrief.
- [x] Learn feedback is labelled process-completeness feedback, not a unique answer or professional certification.
- [x] V2.2 state uses `atlas.v22.*` and does not mutate source datasets.
- [x] All three workflows export or save a concrete completion artifact.
- [x] 390x844, 768x1024, 1440x900 and 1920x1080 have no page-level overflow.
- [x] V2.1 regression suite and V2.2 workflow suite pass together with no unexpected console errors.
