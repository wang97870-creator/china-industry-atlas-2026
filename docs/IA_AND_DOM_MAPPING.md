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
