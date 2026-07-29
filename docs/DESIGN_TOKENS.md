# Design token extraction

The baseline's second token set is authoritative. V2.1 aliases it into semantic names instead of replacing the palette.

| Semantic token | Baseline source | Purpose |
| --- | --- | --- |
| `--v21-canvas` | `--bg` | Page canvas |
| `--v21-surface-1` | `--bg-elevated` | Raised workspace |
| `--v21-surface-2` | `--panel-solid` | Table, dialog, detail |
| `--v21-surface-soft` | `--panel-soft` | Selected/subtle regions |
| `--v21-border` | `--line` | Default boundary |
| `--v21-border-strong` | `--line2` | Active/focus-adjacent boundary |
| `--v21-accent` | `--cyan` | Primary action and selected mode |
| `--v21-compare` | `--violet` | Comparison-only emphasis |
| `--v21-success/warning/danger` | green/amber/red | Semantic state with icon/text |
| `--v21-text/muted/subtle` | text/muted/muted-2 | Three textual emphasis tiers |

Spacing uses a 4px base: 4, 8, 12, 16, 20, 24, 32, 40. Radii: 8 control, 12 compact card, 16 panel, 20 major surface. Body is 14px/1.55, labels 11–12px, titles 18–32px. Dense table rows default to 48px and can switch to 40px compact.

System states pair icon, heading, explanation, and recovery action. Skeleton motion is disabled under `prefers-reduced-motion`. Focus uses a 2px cyan outline with 2px offset.

## V2.2 workflow aliases

V2.2 reuses every V2.1 color, type, radius, and elevation token. New workflow components introduce no new palette values. `--v22-rail` aliases `--v21-surface-soft`; `--v22-primary` aliases `--v21-accent`; `--v22-evidence` aliases `--v21-compare`. Step states always pair color with text and a numeric marker. Form controls use a minimum 40px target, body and evidence text remain at least 11px, and mobile layouts never require horizontal page scrolling.
