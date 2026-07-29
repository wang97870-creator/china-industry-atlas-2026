# Information architecture and DOM mapping

## Task flows

| User intent | Entry | Primary work surface | Completion |
| --- | --- | --- | --- |
| Discover a city | Palette, map, city list | Explore split view | City context and research sections visible |
| Compare opportunity | Context action or Investor mode | City/company trays and evidence chart | Shareable comparison state |
| Find chain gaps | Policy mode with current city | Six-node coverage matrix | Evidence-labelled gap and candidate list |
| Learn a method | Learn case card | Observation-to-verification exercise | Saved educational scenario |

## Current-to-V2.1 mapping

| Existing DOM | V2.1 use |
| --- | --- |
| `.siteHeader` | Compact persistent application header |
| `#useCases` | Replaced by four mode navigation; content retained as no-script orientation |
| `#atlas` | Explore map/research workspace and collapsible context map in other modes |
| `#provinceJump`, `#cityJump` | Kept as conventional selectors and state adapters |
| Search datalist | Retained as no-script fallback; palette becomes primary |
| `#map` / `#mapFallback` | Geographic entry plus honest failure state |
| `#detailBody` | Enhanced city research and enterprise-table render target |
| taxonomy/trends/source sections | Moved into Learn/reference and source-drawer access; still crawlable |
| comparison dialog | Adapted into persistent compare tray/workbench |

## State model

`mode`, `province`, `city`, `industry`, `company`, `section`, `view`, `cities`, and `companies` form shareable URL state. Watchlist and column preferences are namespaced local preferences. URL parsing never prevents a national Explore fallback.

## Responsive wireframes

Desktop Explore: sticky shell → context bar → 58% map/list + 42% research → compare tray.

Desktop task mode: sticky shell → context bar → full-width workbench → optional collapsed geographic context → compare tray.

Mobile: sticky compact shell → horizontally scrollable modes/context → Map/Research single-surface switch → one-column research cards → bottom compare tray.

## V2.2 bounded decision-workspace migration

V2.2 leaves Explore and the V2.1 context shell intact. It replaces only `#v21ModeCanvas` for the three decision modes through an additive controller loaded after V2.1.

| Mode | Task start | Guided steps | Completion artifact |
| --- | --- | --- | --- |
| Investor | Choose subject city, industry, horizon, objective | Setup → Peer set → Thesis → Memo | Markdown investment research memo |
| Policy | Choose city, chain, and action type | Task → Gap diagnosis → Candidates → Pipeline | Markdown attraction brief and local pipeline |
| Learn | Choose case and learning objective | Observe → Diagnose → Decide → Defend → Debrief | Saved attempt, rubric, and case memo |

Desktop uses a three-column task shell: step rail, primary workspace, and evidence/data-readiness inspector. At narrow widths, the rail becomes horizontally scrollable and the inspector follows the primary workspace. State is namespaced under `atlas.v22.*`; source datasets remain immutable.

### V2.2 data contracts

- Investor analysis: `subjectCity`, `industry`, `horizon`, `objective`, `peerCities`, `selectedEvidence`, `thesis`, `catalysts`, `risks`, `invalidation`, `openQuestions`, `updatedAt`.
- Policy task: `city`, `industry`, `taskType`, `selectedGap`, `shortlist`, `pipeline[{company, stage, owner, nextAction, due}]`, `updatedAt`.
- Learn attempt: `caseId`, `step`, `selectedEvidence`, `diagnosis`, `decision`, `counterEvidence`, `invalidation`, `confidence`, `completedAt`.

These are browser-local working records, not verified investment, relocation, project, or learning-outcome facts.
