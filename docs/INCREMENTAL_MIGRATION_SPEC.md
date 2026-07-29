# Incremental migration specification

## Strategy

Use additive, reversible layers:

1. Keep the current `assets/data.js`, generated datasets, local maps, and existing `assets/app.js` initialization.
2. Add a V2.1 semantic CSS layer after the existing stylesheet.
3. Add a compatibility/data adapter that derives evidence depth, completeness, and workbench views without mutating source records.
4. Add a V2.1 controller after the existing application that binds modes, URL state, palette, table, trays, and workbenches.
5. Replace only bounded render surfaces; preserve existing IDs needed by baseline functionality and tests.

## Feature flags and rollback

- The body carries a V2.1 marker and mode state.
- Removing the V2.1 CSS/script references restores the prior UI without changing data.
- URL parameters are optional; an unparameterized URL opens Explore with the national map.
- LocalStorage state is namespaced `atlas.v21.*` and can be ignored safely by the old application.

## Data contract

- Source datasets remain immutable.
- Confidence and completeness are deterministic UI metadata, never financial forecasts.
- Project and policy modules render verified records only; otherwise they expose the required schema and an honest empty state.
- Cross-city attraction candidates are labelled structural matches and never interpreted as investment or relocation intent.

## Release boundary

This worktree produces a local preview. Integration, public GitHub history, and deployment occur only after explicit owner approval.
