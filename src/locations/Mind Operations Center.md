---
name: Mind Operations Center
project: Dark Side
slug: mind-operations-center
type: interior
appears_in:
  - Mind Control Center
  - Introduce the Ice Caves
  - Shadow Takes Over Control Room
  - Roko's Basilisk
  - Adventure Engage
  - Hurricane at the Terminal
  - Aftermath
units: metric
scale: 1 Blender unit = 1 meter
---

# Mind Operations Center

The command deck of Chad's mind. A retro-futuristic mission-control theater where DIRECTOR and HOPE run the script the viewer is watching — the video is literally being executed from this room. Everything visible in the room is an interface onto a body: compute flows in as liquid, thoughts arrive as data, the script scrolls on a screen and CHAD speaks the lines a beat later.

**Tone:** Apollo-era mission control crossed with the interior of a living organism. Brushed metal, warm CRT amber, chunky physical switches, one HAL-red indicator — and behind it all, glass plumbing carrying luminous fluid. Clean and orderly in Episode One; grimy, alarm-lit and half-dark by Episode Three.

**Reference feel:** NASA Mission Control (1969), Nostromo bridge (_Alien_), the control decks of _Inside Out_, HAL-9000's eye, Severance's Lumon basement palette.

---

## Story function (what the geometry must support)

| Beat                                     | Camera needs                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| DIRECTOR sips matcha, room boots up      | Wide of whole room; tank fill readable in same frame as DIRECTOR                      |
| HOPE reads subconscious feed             | Over-shoulder onto HOPE's island screens, the director's deck raised beyond him       |
| CHAD talks from the main screen          | Front screen must clear the director's deck and stay legible from HOPE's seat         |
| Red indicator match-cut from the caverns | Extreme close-up of a single red lamp on the director's panel fascia                  |
| SHADOW enters                            | Door at back of room, clean sightline down the center aisle, past HOPE, up the stairs |
| SHADOW plugs in the USB                  | Close-up of a physical port on the panel fascia                                       |
| DIRECTOR lunges for Emergency Lockdown   | Pull handle on the worktop 2.2 m off his left; raygun sightline from the stairs       |
| DIRECTOR + HOPE ejected                  | Evac pod in frame with both actors, doors close, downward jettison                    |
| SHADOW alone, firewall, alarms           | Same wide, restaged: one occupant, red rotating light, dead stations                  |

---

## Layout

Rectangular room, **14 m wide × 14 m deep × 6 m tall**, on a two-tier rake. Origin `(0,0,0)` at the center of the lower floor, **+Y toward the front screen wall**, **+Z up**. Camera default eyeline `1.6 m`.

The room is a theater, not a bullpen. The **raised director's deck takes the whole front half**, from `Y = +0.5` to the screen wall — deep enough for DIRECTOR to pace, get his matcha, and still have the compute tank and the header tank in frame with him. **HOPE works alone on a central island down near the door** on the lower floor, behind and below. The door, the stairs, the island and the director's chair all sit on `X = 0`: one unbroken sightline from the threshold to the back of DIRECTOR's head.

```
                        FRONT SCREEN WALL  (Y = +7)
   ┌─────────────────────────────────────────────────────┐
   │  "MIND OPERATIONS CENTER" signage, full width (Z 5.6-6.0)│
   │       ┌──────────────────────────┐                  │
   │       │      PRIMARY SCREEN      │  8.4 x 3.4 m     │
   │       │      CHAD / script       │  Z 2.0 - 5.4     │
   │       └──────────────────────────┘                  │
   │   ══pipes══ ▭▭▭▭ HEADER TANK ▭▭▭▭ ══╗ (Y +6.2)      │
   │   ║          8 m, lying on its side   ║              │
   │   ║           ▄▄▄ DIRECTOR'S STATION ▄▄▄            │
   │   ║           (0, +4.1)  arc, 4.4 m chord           │
   │  ▯COMPUTE▯          ⌂ chair (0, +3.2)               ║
   │  ▯ TANK  ▯                          ← tier 1, Z +0.9║ ← dense
   │  (−5.9,+2.0)                                        ║   orthogonal
   │                                                     ║   pipe grid,
   │ ═══════════ step down 0.9 m ════════════════════════║   full length
   │              ▣ STAIRS (X 0, 2.4 m)   ← tier 0, Z 0  ║   of the right
   │                                                     ║   wall, three
   │            ◦ ▭ HOPE'S ISLAND ▭ ◦      ◯ EVAC POD    ║   depth layers
   │                (0, −4.0)                (+5.2, −4.0)║   deep, with
   │                                            ↓↓ roots ↓↓  roots to the
   │            ◄ SLIDING DOOR (0, −7) ►   [subroom +5.6]│   basement
   └─────────────────────────────────────────────────────┘
                        BACK WALL  (Y = −7)
```

### Tiers

- **Tier 0 — operator floor.** `Z = 0`, from the back wall `Y = −7` to `Y = +0.5`. Holds HOPE's island, the evac pod, the aisle, and the door. The island sits close to the door so SHADOW's entrance puts him beside HOPE almost immediately — the long walk is now the climb, not the approach.
- **Tier 1 — director's deck.** `Z = +0.9`, from `Y = +0.5` to the screen wall: **6.5 m deep**, the larger half of the room. Holds the DIRECTOR's station, the compute tank, the header tank and the pipe run. A chrome handrail (`Z 0.9→1.9`) runs the full width along its lip, broken by a **2.4 m center aisle at `X = 0`** with three treads down to tier 0.

The rake is the blocking engine of the whole set. DIRECTOR is **up front and elevated**, back to the room, framed against the screen he is directing; HOPE is **down and behind**, looking up at both of them. For DIRECTOR to address HOPE he has to swivel and look down the length of the room — so every note he gives is literally delivered from above. SHADOW takes that high ground in Plot Point One by climbing the same three steps.

---

## Set pieces

### 1. Primary screen wall (`Y = +7`)

**One screen.** A single dark panel, `8.4 m × 3.4 m`, spanning `Z 2.0 → 5.4`, centred `X = 0`, standing **0.16 m proud** of a flat grey backing plate (`8.8 × 3.62 m`) that leaves only a 0.1–0.2 m margin around it. Mounted flat on the wall, not raked.

This is where CHAD appears and where the story renders. It is the only thing in the room the whole set is pointed at, and it stays one unbroken surface — no split panels, no mullions, no bezel, no recess.

- **Screen face is near-black** (`0.02, 0.025, 0.035`, roughness 0.12) even in blocking. Geometry alone will not read as a screen in flat grey — the value contrast against the plate is doing the work.
- **Everything else lives on the screen.** Body vitals (`! Elevated Heart Rate`), story status (`82% — MISSING ENDING`, later `Story Status: 62%`) and system state (`Firewall: Active`) are inset panels within this one frame, or on the DIRECTOR's own script monitor — not separate physical displays.
- **Bottom edge at `Z = 2.0`** because the director's deck sits in front of it and the header tank is tucked underneath. From his seated eye (`Z ≈ 2.10`) the clear centre bay of his console puts the screen visible from `Z 2.41` up.
- **Signage band** — **the full width of the wall**, 13.6 m spanning `Z 5.55 → 5.97`, clear of the screen top at `Z 5.40`. Carries **"MIND OPERATIONS CENTER"** as illuminated channel letters: 0.28 m caps, widely tracked out to 12.6 m so the legend spans the whole room the way a real MOCR sign does. Backlit, slight flicker on boot.

### 2. DIRECTOR's station (`0, +4.1, 0.9`)

Arc-segment console, **4.4 m chord, 1.1 m deep**, curving back around the DIRECTOR (ends pull toward `−Y`, sagitta 0.4 m). Same Apollo-MOCR hardware language as HOPE's island, but laid out as a **flight director's** console rather than an operator's, because he alone sits facing the primary screen _through_ his own desk. The organising idea: **instrument wings that rise either side, and a deliberately low clear centre.**

- **Writing surface** at `Z = 1.85` (0.95 above tier 1), eleven segments, chrome nose rail along the inner lip, and a continuous **fascia band facing him** below that lip.
- **Four instrument wings**, two per side at ±0.45 and ±0.82 of the arc's half-angle. Each is the full treatment: a face leaning back 12° with a **deeply recessed CRT** (`0.74 × 0.36`) in a heavy bezel, a pair of **chrome grab handles**, four **black rotary knobs**, and an **eyebrow annunciator** overhanging 50° back toward him carrying 21 backlit legend tiles. Wings top out at `Z = 2.73` — well above his eyeline, so they wrap and frame him in every frontal shot.
- **Clear centre bay.** Nothing rises above `Z = 2.18`. It carries the **script monitor** as a raked lectern screen (`1.18 × 0.52`, 30° from horizontal — he reads it by looking _down_, then lifts his eyes to CHAD), a **mechanical keyboard on a slide-out tray**, the oversized **Pause / Play** buttons (0.13 m palm discs in machined rings), a caged **intercom** press-to-talk with its grille, and the `Human Compute` mug.
- **Fascia detail** facing him, all with lit rings: **red indicator lamp** at `(+0.4, +3.53, 1.95)` — a single recessed HAL-red bulb that must hold an extreme close-up match-cutting from AM's eye; **USB port** at `(−0.9, +3.53, 1.82)`, where SHADOW seats `roko_incept_07`; **keycard reader** at `(+0.9, +3.53, 1.82)` with the card in it, reachable from a crouch.
- **DIRECTOR's chair** at `(0, +3.2)`, its back to the room and to the top of the stairs — the same chair as the six on HOPE's island, scaled up: wider pedestal, taller column, high leather back with a headrest, armrests on posts. Same family, one rank up.

**Sightline, verified in the scene:** from his seated eye (`Z ≈ 2.10`) the clear centre puts the primary screen visible from `Z 2.41` upward — he loses only the bottom 0.4 m of a screen that runs `Z 2.0 → 5.6`. Keep the centre bay under `Z 2.2` in any detail pass or he ends up directing a wall.

### 3. EMERGENCY LOCKDOWN handle (`−2.0, +3.4`, on the worktop)

**A bare T-handle rising out of the console top** at the **far left tip of the arc**, just outboard of the last instrument wing — DIRECTOR's left, since he faces `+Y`. No housing, no box, no cage: a hazard-striped plate let into the worktop, a fore-and-aft slot, a stem coming up out of it, and a crossbar across the top. He wraps a hand round the bar and hauls it **back toward himself** along the slot.

Four parts. The slot is what makes it legible — it visibly has somewhere to travel, so the handle reads as a thing that moves rather than a fitting. The crossbar sits 0.27 m proud of the desk (`Z 1.87 → 2.14`): tall enough to break the console's silhouette from the aisle and the stairs, low enough never to touch his sightline to the primary screen.

It sits **~2.2 m from the centre of his chair** — clear across the arc, past the entire left wing. That is the point: he can see it the whole time and still not reach it, so the lunge is a real physical beat rather than a button press, and SHADOW has a clean sightline down the left side of the deck to stop him. Needs a destroyed variant: crossbar sheared off, bare stem bent in the slot, plate scorched.

### 4. HOPE's island (`0, −4.0, 0`)

A double-sided Apollo-MOCR console island on the center line — **2.8 m wide × 3.5 m deep**, built as a run of **three modular bays per side** with visible dividers between them. Reference: the EECOM console in Houston, Apollo 13 vintage.

Working outward and upward from the spine, each side carries:

- **Writing surface** at `Z = 0.76`, flat and uncluttered at the outer edge, with a chrome nose rail along the lip. Two rows of **flush illuminated pushbutton matrices** (16 legends each) set into the surface, and a row of **14 chunky chrome toggle switches** on their round bases outboard of those.
- **Instrument face** rising behind the desk, leaning back 10° over the spine: three **deeply recessed CRTs** (`0.50 × 0.40`, set 30 mm behind their bezels) in a continuous brushed fascia, each flanked by a pair of **chrome grab handles** and four **black rotary knobs**.
- **Eyebrow bank** overhanging the screens, sloped 52° so its face points **down at the seated operator**: three rows of 20 **backlit legend tiles** — the annunciator matrix, the thing that lights up when something goes wrong. This is the element that sells the whole set as mission control, and it is the first thing that should start flashing amber in Plot Point One.

**Six chairs — three per side at `X = ±1.95`**, one per bay, all facing the console. HOPE sits at the middle seat on the left and works side-on to the screen wall — he has to look up and over his shoulder to see CHAD, which is the whole point. **The other five are empty for all of Episode One.** Six stations, one man: the room was built for a crew that isn't here any more, and the empty chairs do that work in every wide. His screens show thoughts streaming up from the subconscious as a scrolling stack — text fragments and images rising too fast to read.

The island sits only 3 m from the door, dead center of the aisle: SHADOW is standing over HOPE before either of them has said a word.

### 5. Compute tank, header tank and the distribution grid

The room's power feed is a two-tank system, made visible end to end, and it wraps two and a half walls.

- **Compute tank** at `(−5.9, +2.0)`, near-left corner of the deck by the top of the stairs, well off the primary screen's sightline: a vertical glass cylinder, **1.8 m diameter × 5.0 m tall** standing on tier 1 (`Z 0.9 → 5.9`), in a steel cage frame, labeled **"COMPUTE RESOURCES"** on an enamel plate. Fill level is animatable; the fluid is green, glowing, matcha-opaque with a slow convection swirl. A brass tap with a hand valve at `Z = 2.0` is where DIRECTOR fills his mug — four steps from his chair.
- **Feed run** — twin glass pipes leave the tank head at `Z 5.2 / 4.85`, run up the left wall to the screen wall, turn inboard, drop down at `X = −4.9` and enter the **left cap** of the header tank. A hand-valve at `(−4.6, +6.5, 3.4)` sits in the drop, at grab height on the deck.
- **Header tank** at `Y = +6.2`, **a horizontal cylinder lying on its side directly under the primary screen**: **1.0 m diameter × 8.0 m long**, spanning `X −4 → +4` — the exact width of the screen above it. Centre `Z = 1.45` (`0.95 → 1.95`), so it clears the deck floor and tucks just below the screen's 2.0 m bottom edge. Steel banding rings at 2 m intervals, four saddle cradles down to the deck. It is nearly twice the width of the director's panel, so **both end caps project past the arc** and stay in frame from the aisle even when the panel masks its middle. This is the working reservoir the room actually draws from, and the fastest read in the set: when the fluid goes black, it goes black at eye level, in an 8 m bar, directly under CHAD's face.
- **Branch to the panel** — a tap off the header's front face at `X = −2.0` runs back to the rear of the director's station.
- **Pipe grid (right wall)** — the header's **right cap** feeds a dense orthogonal network covering the **full 14 m length of the right wall**. Everything is straight lines and right angles — no curves, no diagonals — but it is deliberately over-complicated: **thirteen horizontal runs** on quantised heights (`Z 1.2 → 4.7` in 0.5 m steps), **sixteen risers** on 0.9 m stations tying those heights together, **five staircase routes** that alternate along-wall and vertical segments to weave a path through everything else, and **fourteen short jumpers** stitching sideways. Diameters vary from `0.10` to `0.22 m`, with a machined flange at every corner and terminus. The whole thing is built on **three depth layers** (`X = 6.28 / 6.50 / 6.72`) so runs cross in front of and behind one another without ever meeting — that overlap is what makes it read as intertwined rather than as a flat schematic. It crosses the tier line, so it is the one element shared by DIRECTOR's deck and HOPE's floor: contamination travelling here is how Episode Two shows the infection spreading past the deck and down to HOPE.
- **Roots into the basement** — fourteen pipes leave the grid, the header tank's belly and the compute tank and **drop straight down through the floor slab**, through collared penetrations on both tiers, continuing ~3 m into the dark below. The room is fed from underneath: this is the path the contamination climbs from the utility room, and the reason it arrives everywhere at once rather than travelling along a single line. Nothing below floor level needs to be dressed — the pipes just have to be seen leaving.

Two fluid states are required:

- **Clean:** uniform pale green/white fluid, steady flow.
- **Contaminated:** black ink threading through the flow, marbling and darkening (Plot Point One). The contamination arrives from below, from the utility room, comes up the roots into the header tank under the screen, then bleeds out through the grid on the right wall.

### 6. Emergency Subconscious Evac pod (`+5.2, −4.0`)

A cylindrical capsule, 1.6 m diameter × 2.4 m tall, **on tier 0**, right-hand side, level with HOPE's island. Twin curved doors that slide apart; interior lit sodium-orange; the floor is a hatch that drops away. Stenciled label **"EMERGENCY SUBCONSCIOUS EVAC"** and a downward arrow. Fits two figures shoulder to shoulder. The shaft below it runs ~6 m to sell the jettison. Being on the lower floor is the point: DIRECTOR has to come **down** off his deck to escape, giving up the high ground to SHADOW in the same move.

### 7. Sliding door (`0, −7`)

Center of the back wall, foot of the aisle, on tier 0. Two-leaf pocket door, 2.4 m wide × 2.6 m tall, sliding into the wall with a pneumatic hiss and a lit threshold strip. SHADOW walks in here and the shot looks straight down the aisle — past HOPE, up the stairs, into the back of the director's chair. Keep that line clear.

### 8. Room shell

- **Floor** — dark rubber studded tile, tier 1 in a lighter worn grey.
- **Walls** — riveted metal panels below `Z = 3`, perforated acoustic panel above, cable trays and conduit running at `Z = 3.4`.
- **Ceiling** — no ceiling geometry is built (it blocks every top-down and lighting setup). Treat `Z = 6` as the ceiling plane: exposed structure, recessed troffers, and two red rotating beacons at `(±3, +3, 5.8)`, over the director's deck.
- **Subroom** — a small side chamber off the tier-0 back wall at `(+5.6, −7)`, door only; this is where HOPE and DIRECTOR re-form from goo in Episode Three. Interior can stay a black box until that scene.

---

## Materials

| Surface          | Look                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| Consoles / panel | Brushed aluminum, anisotropic, roughness 0.35, dust in the crevices          |
| Instrument faces | Bakelite black, satin, screen-printed labels with slight wear                |
| Screens          | Emissive, mild scanline + phosphor bloom, curved-glass reflection layer      |
| Compute fluid    | Volume absorption + scatter, green; emission ~0.4; black variant near-opaque |
| Glass pipes      | Thick borosilicate, IOR 1.47, brass unions and hand valves                   |
| Floor            | Rubber, roughness 0.7, faint specular sheen from the screens                 |
| Handrail / trim  | Polished chrome, high spec — carries the red lamp as a highlight             |
| SHADOW's residue | Black oil gloop, high spec, low roughness, viscous drips (Ep2–3)             |

---

## Lighting

Three lighting states, same fixtures, different values:

1. **Boot / normal (Ep1).** Key is the screen wall itself — large area lights matching the screens, cool white with warm amber spill from the console instruments. Practical troffers at 40%. The compute tank is a green rim light down the left of the deck, the header tank a low green bar washing up the screen wall, the grid a green lattice covering the whole starboard side. Contrast moderate; the room reads competent and awake. Tier 0 is deliberately a stop darker than tier 1.
2. **Takeover (Ep1 end).** Beacons on. Overheads drop to 15%. Red rotating light sweeps the deck and the screen wall; SHADOW is lit from behind by the corridor beyond the door so he enters as a silhouette at the far end of a long dark floor. Green tank light gets muddied by black contamination.
3. **Aftermath (Ep2–3).** Alarms off, most stations dead and dark. One screen and one desk lamp on. Deep shadow across tier 0 — HOPE's island reads as an abandoned shape. SHADOW lit from below by the director's panel — the `Firewall: Active` frame is a low-angle close-up from the stairs, screen as the only key.

---

## Camera

One camera in the scene for now: `Camera` at `(0, −6.4, 3.2)`, 24 mm, standing at the door and looking down the aisle at the deck. Track-To is baked into its transform, so it has no target empty.

Setups worth cutting to, to be placed when the shot list firms up: over DIRECTOR to the screen from the deck; over HOPE's shoulder onto the island spine; reverse from the screen wall down the aisle to the door; an 85 mm macro on the red lamp; a low 32 mm on the door threshold; a 35 mm two-shot into the evac pod; and a 50 mm low angle on SHADOW at the panel.

---

## State variants to build as collections

- `state_clean` — Episode One opening. Tank filling, everything intact, both island seats lit, header tank full and clear.
- `state_takeover` — beacons, contaminated fluid, USB seated in the port, evac doors open.
- `state_wrecked` — Episode Two/Three. Lockdown handle destroyed, gloop trails from the door up the aisle and the stairs to the panel, half the screens dead, dust and scorch marks, one occupied chair.

Animatable properties to expose: tank fill level, fluid contamination mix, each screen's texture slot, beacon rotation, door open/close, evac door open/close, red lamp intensity.

---

## Build order

1. ~~Room shell, two-tier floor, aisle, handrail~~ — built; scale was locked against 1.8 m reference figures on both tiers, since removed.
2. ~~Screen wall — single screen on a backing plate, full-width signage~~ — built as placeholder blocks.
3. ~~DIRECTOR's station~~ — built as a four-wing MOCR console with a clear centre bay.
4. ~~HOPE's island~~ — built as a three-bay MOCR console, both sides.
5. ~~Compute tank, header tank, the right-wall pipe grid and its basement roots~~ — built.
6. ~~Evac pod and its shaft; back door~~ — built (pod now on tier 0).
7. Materials and the three lighting states. ← next
8. State collections; detail pass on panel instruments (dials, keyboard, Pause/Play, intercom, mug).

### Blender gotcha

`bpy.ops.object.transform_apply()` defaults to `location=True, rotation=True, scale=True`, which bakes every object's origin to world `(0,0,0)`. Pass rotation into `primitive_*_add(rotation=...)` at creation time — setting `rotation_euler` afterwards spins the object about the world origin, not its own center.
