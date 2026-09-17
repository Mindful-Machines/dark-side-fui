# Mind Operations Center

Production FUI for filming Mind Operations screens: wall monitors, control desks, research terminal, operator console, and handheld phone views.

Metadata for scenes, surfaces, and keyboard paths lives in `src/data/registry.ts`. Keep that file as the source of truth.

## Install

```bash
cd apps/mind-operations-center
npm install
```

## Local development

```bash
npm run dev
```

Opens the Vite dev server with hot reload (default port 5173).

Other commands:

| Command | Purpose |
| --- | --- |
| `npm run lint` | Lint |
| `npm run build` | Production build (GitHub Pages base `/dark-side-fui/`) |
| `npm run preview` | Serve the last build (localhost) |
| `npm run on-set` | **On-set:** rebuild with base `/`, serve on `0.0.0.0:5191` |

## On-set production launch

Use this on the host laptop during filming. No Cloudflare or internet required.

```bash
cd apps/mind-operations-center
npm run on-set
```

What it does:

1. Typechecks and builds a production bundle with asset base `/`
2. Serves `dist/` via Vite preview
3. Binds to all interfaces on port **5191**
4. Prints **Local** and **Network (LAN)** URLs in the terminal

On set devices (monitors, phones, other laptops), open the **Network** URL shown in the terminal, for example:

`http://192.168.x.x:5191/?scene=script-cogito&mode=display`

Keep the host awake and unlocked while filming.

## Scene Directory

Press **`0`** or use the Directory control / brand title to open the Scene Directory.

From the directory you can:

- Browse every registered view and its readiness status
- **Launch** a view
- **URL** — copy a direct link that preserves the current Review/Display mode

## Review vs Display

| Mode | Use |
| --- | --- |
| **Review** | Production prep. Chrome, side panels, directory, and scene labels stay available so Ryan/Chad can confirm crop and metadata. Phone views appear inside a framed ~390×844 viewport. |
| **Display** | Filming. Strips review chrome. Phone views fill the browser viewport (portrait composition, safe areas). Use fullscreen on the target device. |

Toggle from the header/directory controls, or set `mode=review` / `mode=display` in the URL.

## Keyboard model

One key at a time — **not** chords.

1. Press a **number** to enter a section (loads that section’s first view).
2. Press a **letter** to switch views **inside** the active section.

| Key | Section |
| --- | --- |
| `0` | Scene Directory |
| `1` | Operations |
| `2` | Cardiac |
| `3` | Thoracic |
| `4` | Research Terminal |
| `5` | Operator Console |
| `6` | Phone |

Letter keys (contextual to the active section):

| Section | Letters |
| --- | --- |
| Operations | `Q` `W` `E` `R` `T` `Y` `U` `I` `O` |
| Cardiac | `Q` `W` `E` `R` `T` |
| Thoracic | `Q` `W` `E` `R` `T` |
| Research | `Q` `W` |
| Phone | `Q` `W` |

Examples: `1` then `I` → Scene 26 script line · `6` then `W` → Scene 67 phone map.

Arrow Left/Right step within the active section. See `PRODUCTION-GUIDE.md` for the full scene table.

## Direct URLs

Pattern:

```
http://<host>:5191/?scene=<slug>&mode=<review|display>
```

Examples (on-set host):

```
http://127.0.0.1:5191/?scene=directory&mode=review
http://127.0.0.1:5191/?scene=script-cogito&mode=display
http://127.0.0.1:5191/?scene=phone-story-status&mode=display
http://127.0.0.1:5191/?scene=phone-map&mode=display
```

GitHub Pages (after merge to `master`) uses base path `/dark-side-fui/`:

```
https://mindful-machines.github.io/dark-side-fui/?scene=script-cogito&mode=display
```

Directory **URL** copies the current origin + path + `scene` + `mode`.

## Fullscreen

Use the app **Fullscreen** control or the browser/OS fullscreen shortcut on the display device. Prefer Display mode first, then fullscreen, then confirm motion and exposure in camera.

## Phone operation

- Section **`6`**, then `Q` (Scene 54 story status) or `W` (Scene 67 map).
- **Review:** framed crop for prep.
- **Display:** full viewport; usable on a real phone at ~390×844.
- Open the phone’s LAN URL, then Add to Home Screen / fullscreen if helpful.
- Landscape desktop loading of a phone URL still presents a portrait composition (not stretched).

## Open from another device on the same network

1. Host and devices on the **same Wi‑Fi / LAN** (guest networks often block device-to-device).
2. Run `npm run on-set` on the host.
3. Note the **Network** URL from the terminal (not only Local).
4. On the other device, open that URL (add `?scene=…&mode=display` as needed).
5. If it fails, see Troubleshooting below.

## Keep the host awake

- Plug in power.
- Disable sleep / screen lock for the filming window (macOS: System Settings → Lock Screen / Battery; or `caffeinate` in a separate terminal).
- Do not close the laptop lid unless external display + clamshell is already validated.
- Leave the `on-set` terminal running.

## Troubleshooting

**Blank screen**

- Hard-refresh (cache). Prefer a Display-mode direct URL.
- Confirm you are not on an old `dist` — re-run `npm run on-set`.
- Local/tunnel builds need asset base `/` (`on-set` sets this). GitHub Pages builds use `/dark-side-fui/`.

**Stale build / wrong UI**

- Stop the preview process (Ctrl+C).
- Run `npm run on-set` again so build + serve both refresh.
- Confirm the terminal shows a new build before opening devices.

**Port 5191 occupied**

```bash
lsof -nP -iTCP:5191 -sTCP:LISTEN
```

Stop the other process, or free the port, then re-run `npm run on-set` (`--strictPort` will not silently switch ports).

**LAN URL unreachable**

- Same network / VLAN; avoid client isolation / guest Wi‑Fi.
- Use the Network IP from the host terminal, not `127.0.0.1`, on remote devices.
- Check OS firewall allows inbound TCP 5191.
- Host must keep `on-set` running and stay awake.

**Animations look frozen**

- Confirm OS “Reduce motion” is off if you need motion for camera.
- The app honors `prefers-reduced-motion` and will dampen or stop some motion.

## Production screen guide

See [`PRODUCTION-GUIDE.md`](./PRODUCTION-GUIDE.md) for the scene/surface table, provisional monitor labels, and on-set checklist.

## GitHub Pages

Automatic deploy runs on pushes to **`master`** that touch this app (or the Pages workflow). Merging this feature branch is required for the public site to update. Expected URL:

`https://mindful-machines.github.io/dark-side-fui/`

The workflow publishes only `apps/mind-operations-center/dist` — not `docs/` or other repo content.

### Search indexing during production

The Pages site is **public by URL** (anyone with the link can open it). During production it is intentionally marked `noindex` / `nofollow` (and related robots directives) in `index.html` so search engines should not list or follow it.

- Remove those meta directives when the project is ready for public discovery.
- **`noindex` is not authentication or password protection.** It only asks crawlers not to index the site; it does not keep the URL private.
