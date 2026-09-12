# Mind Operations Center — Production Guide

Operator reference for on-set screens. **Source of truth:** `src/data/registry.ts`. Update the registry first; keep this guide aligned with it.

Physical screen assignments below are **provisional** until Chad confirms the final Blender / set monitor mapping.

## Surface labels (provisional)

| Surface | Intended role (provisional) |
| --- | --- |
| `WALL-01` | Large hero wall display |
| `CTRL-C` | Center control monitor / directory & edit surfaces |
| `CTRL-L1` | Left control bank — cardiac |
| `CTRL-L2` | Left control bank — thoracic |
| `CTRL-R1` | Right control bank — operator console |
| `CTRL-R2` | Right control bank — spare / TBD |
| `STATION-A-L` | Station A left — TBD |
| `STATION-A-R` | Station A right — TBD |
| `STATION-B-L` | Station B left — TBD |
| `STATION-B-R` | Station B right — TBD |
| `LAB-TERM-01` | Research / lab laptop terminal |
| `PHONE-01` | Handheld subject phone |

Do not treat these labels as locked set dressing until Blender mapping is signed off.

## Keyboard path

Press the **section number**, then (when listed) a **letter**. Never simultaneous chords.

Direct URL slug → `?scene=<slug>&mode=review|display`

On-set host example: `http://<LAN-IP>:5191/?scene=<slug>&mode=display`  
GitHub Pages example: `https://mindful-machines.github.io/dark-side-fui/?scene=<slug>&mode=display`

## Screen inventory

| Scene | View | Surface | Device | Importance | Format | Keys | Slug | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | Scene Directory | CTRL-C | monitor | FEATURE | landscape | `0` | `directory` | READY |
| 12 | Idle / system overview | WALL-01 | wall | HERO | landscape | `1` · `Q` | `idle` | READY |
| 12 | Elevated heart rate | WALL-01 | wall | HERO | landscape | `1` · `W` | `elevated` | READY |
| 12 | Subconscious thought stream | WALL-01 | wall | HERO | landscape | `1` · `E` | `thoughts` | READY |
| 14 | Current script: executing | WALL-01 | wall | HERO | landscape | `1` · `R` | `executing` | READY |
| 37 | Paused / contamination detected | WALL-01 | wall | HERO | landscape | `1` · `T` | `paused` | READY |
| 51 | Uploading new script | CTRL-C | monitor | FEATURE | landscape | `1` · `Y` | `uploading` | READY |
| 51 | 82% partial upload / missing ending | CTRL-C | monitor | FEATURE | landscape | `1` · `U` | `partial` | READY |
| 26 | I think, therefore I am. | WALL-01 | wall | HERO | landscape | `1` · `I` | `script-cogito` | READY |
| 39 | Script edit / tower cranes | CTRL-C | monitor | FEATURE | landscape | `1` · `O` | `script-tower-cranes` | READY |
| — | Cardiac · Idle / sinus | CTRL-L1 | monitor | FEATURE | landscape | `2` · `Q` | `heart-idle` | READY |
| — | Cardiac · Elevated | CTRL-L1 | monitor | FEATURE | landscape | `2` · `W` | `heart-elevated` | READY |
| — | Cardiac · Irregular | CTRL-L1 | monitor | FEATURE | landscape | `2` · `E` | `heart-irregular` | READY |
| — | Cardiac · Intervention | CTRL-L1 | monitor | FEATURE | landscape | `2` · `R` | `heart-intervention` | READY |
| — | Cardiac · Recovered | CTRL-L1 | monitor | FEATURE | landscape | `2` · `T` | `heart-recovered` | READY |
| — | Thoracic · Idle / sinus | CTRL-L2 | monitor | FEATURE | landscape | `3` · `Q` | `thoracic-idle` | IN PROGRESS |
| — | Thoracic · Elevated | CTRL-L2 | monitor | FEATURE | landscape | `3` · `W` | `thoracic-elevated` | IN PROGRESS |
| — | Thoracic · Irregular | CTRL-L2 | monitor | FEATURE | landscape | `3` · `E` | `thoracic-irregular` | IN PROGRESS |
| — | Thoracic · Intervention | CTRL-L2 | monitor | FEATURE | landscape | `3` · `R` | `thoracic-intervention` | IN PROGRESS |
| — | Thoracic · Recovered | CTRL-L2 | monitor | FEATURE | landscape | `3` · `T` | `thoracic-recovered` | IN PROGRESS |
| 18 | Research Terminal · Authorization Pending | LAB-TERM-01 | laptop | HERO | landscape | `4` · `Q` | `research-pending` | READY |
| 18 | Research Terminal · Autonomous Approved | LAB-TERM-01 | laptop | HERO | landscape | `4` · `W` | `research-approved` | READY |
| — | Operator Console | CTRL-R1 | monitor | FEATURE | landscape | `5` | `operator-console` | READY |
| 54 | Phone · Story Status | PHONE-01 | phone | FEATURE | portrait | `6` · `Q` | `phone-story-status` | READY |
| 67 | Phone · Map + Story Status | PHONE-01 | phone | FEATURE | portrait | `6` · `W` | `phone-map` | READY |

Scene column `—` means no episode scene number is assigned in the registry yet.

## Modes (quick)

- **Review** — prep with chrome and labels; phone framed at ~390×844.
- **Display** — filming; chrome stripped; phone fills viewport.

Launch from Directory, or open a direct URL with `mode=display`, then fullscreen on the target device.

## On-set checklist

1. Connect host and all display devices to the **same** network.
2. On the host: `cd apps/mind-operations-center && npm run on-set`.
3. Note the terminal **Local** and **Network** URLs.
4. On each screen, open the correct **display-mode** URL (`?scene=<slug>&mode=display`).
5. Enter **fullscreen** on that device.
6. Confirm animations / live readouts are moving (disable OS reduce-motion if needed for camera).
7. Prevent host **sleep / lock**; keep power connected.
8. Check **camera exposure and readability** (especially greens, ambers, and fine mono type).
9. Where helpful, keep a **static backup capture** (screenshot or frozen frame) if live UI fails mid-take.
10. Between takes, prefer Directory **Launch** / **URL** copy over retyping long paths.

## Pending confirmation

**Reusable subject / video-feed view** — not built yet.

- Candidate episode uses: Scenes **55**, **60**, and **66** (to confirm).
- Needs confirmation of: target surfaces, source footage, aspect ratio, and whether playback is practical on set or composited in post.
- Do not fabricate or ship video assets until that is decided.

## Related

- Operator README: [`README.md`](./README.md)
- Registry: [`src/data/registry.ts`](./src/data/registry.ts)
