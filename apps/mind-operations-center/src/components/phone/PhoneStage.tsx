import { PhoneShell } from './PhoneShell'
import { useScene } from '../../context/SceneContext'
import './phone.css'

function StatusBar({ label }: { label: string }) {
  return (
    <header className="ph-top">
      <span className="ph-brand">MOC</span>
      <span className="ph-link">{label}</span>
      <span className="ph-clock">14:22</span>
    </header>
  )
}

const TRANSFER_MANIFEST = [
  { id: 'OPENING.SEQ', state: 'received' as const },
  { id: 'CONTEXT.BLK', state: 'received' as const },
  { id: 'NARRATIVE_01.BLK', state: 'received' as const },
  { id: 'NARRATIVE_02.BLK', state: 'received' as const },
  { id: 'ENDING.SEQ', state: 'missing' as const },
]

export function PhoneStoryStatus() {
  return (
    <PhoneShell>
      <div className="ph-ui is-status">
        <StatusBar label="LINK WEAK" />
        <p className="ph-kicker">STORY STATUS</p>
        <div className="ph-hero-pct" aria-live="polite">
          <strong>82%</strong>
        </div>
        <p className="ph-missing">MISSING ENDING</p>
        <div className="ph-progress" role="progressbar" aria-valuenow={82} aria-valuemin={0} aria-valuemax={100}>
          <span className="ph-progress-fill">
            <span className="ph-progress-shim" aria-hidden="true" />
          </span>
        </div>
        <p className="ph-stall">TRANSFER STALLED · ENDING SEQUENCE UNAVAILABLE</p>

        <ul className="ph-manifest" aria-label="Transfer manifest">
          {TRANSFER_MANIFEST.map((row) => (
            <li key={row.id} className={row.state === 'missing' ? 'is-missing' : 'is-received'}>
              <span className="ph-manifest-id">{row.id}</span>
              <span className="ph-manifest-state">{row.state === 'missing' ? 'MISSING' : 'RECEIVED'}</span>
            </li>
          ))}
        </ul>

        <div className="ph-tile" aria-hidden="true">
          <span className="ph-tile-scan" />
          <span>FEED · HOLD</span>
        </div>
        <footer className="ph-foot">
          <span>PHONE-01</span>
          <span>SC 54</span>
        </footer>
      </div>
    </PhoneShell>
  )
}

/** Semi-isometric screen axes (~30° above horizontal). No CSS skew/rotate. */
const ISO_NE = [42, -24] as const
const ISO_NW = [-42, -24] as const
const ISO_UP = [0, 10] as const

type Pt = readonly [number, number]

function add(a: Pt, b: Pt, s = 1): Pt {
  return [a[0] + b[0] * s, a[1] + b[1] * s]
}

function pts(list: Pt[]) {
  return list.map(([x, y]) => `${x},${y}`).join(' ')
}

function pathThrough(list: Pt[]) {
  return list.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
}

/** Rhombus pad whose edges follow ISO_NE / ISO_NW. */
function isoPad(c: Pt, scale: number, className: string) {
  const n = add(c, [0, -24], scale)
  const e = add(c, [42, 0], scale)
  const s = add(c, [0, 24], scale)
  const w = add(c, [-42, 0], scale)
  return <polygon className={className} points={pts([n, e, s, w])} />
}

function nodeAt(c: Pt, kind: 'prior' | 'current' = 'prior') {
  const r = kind === 'current' ? 3.8 : 2.4
  const padScale = kind === 'current' ? 0.38 : 0.28
  return (
    <g>
      {isoPad(c, padScale, kind === 'current' ? 'ph-iso-pad' : 'ph-iso-pad faint')}
      <circle className={kind === 'current' ? 'ph-node current' : 'ph-node'} cx={c[0]} cy={c[1]} r={r} />
      {kind === 'current' ? <circle className="ph-pulse" cx={c[0]} cy={c[1]} r="8" /> : null}
    </g>
  )
}

export function PhoneMapStatus() {
  // Alternating NE/NW grid steps + consecutive runs for corridor bends.
  // Built only from ISO_NE / ISO_NW — no arbitrary segment angles.
  const steps: Pt[] = [ISO_NE, ISO_NW, ISO_NE, ISO_NE, ISO_NW, ISO_NW]
  const nodes: Pt[] = []
  let cursor: Pt = [70, 222]
  nodes.push(cursor)
  for (const step of steps) {
    cursor = add(cursor, step)
    nodes.push(cursor)
  }
  // (70,222)(112,198)(70,174)(112,150)(154,126)(112,102)(70,78)
  const current = nodes[nodes.length - 1]
  const objective = add(current, ISO_NE) // (112, 54)

  // 1×1 unmapped room; objective anchored on the far (north) corner.
  const roomScale = 0.7
  const roomNE = objective
  const roomNW = add(objective, ISO_NE, -roomScale)
  const roomSE = add(objective, ISO_NW, -roomScale)
  const roomSW = add(roomNW, ISO_NW, -roomScale)
  const faceSW = add(roomSW, ISO_UP)
  const faceSE = add(roomSE, ISO_UP)

  // Faint axis-aligned iso grid (explicit paths; no patternTransform).
  const gridOrigin: Pt = [100, 250]
  const gridNE = Array.from({ length: 7 }, (_, i) => {
    const o = add(gridOrigin, ISO_NW, i - 2)
    return pathThrough([add(o, ISO_NE, -0.6), add(o, ISO_NE, 2.0)])
  })
  const gridNW = Array.from({ length: 7 }, (_, i) => {
    const o = add(gridOrigin, ISO_NE, i - 2)
    return pathThrough([add(o, ISO_NW, -0.6), add(o, ISO_NW, 2.0)])
  })

  return (
    <PhoneShell>
      <div className="ph-ui is-map">
        <StatusBar label="NAV LIVE" />
        <p className="ph-kicker">FACILITY MAP · SUBCONSCIOUS</p>

        <div className="ph-map" aria-label="Internal navigation map">
          <svg viewBox="0 0 200 300" className="ph-map-svg" aria-hidden="true">
            <defs>
              <clipPath id="ph-map-clip">
                <rect x="20" y="24" width="160" height="252" />
              </clipPath>
            </defs>

            <g className="ph-iso-grid" clipPath="url(#ph-map-clip)">
              {gridNE.map((d, i) => (
                <path key={`ne-${i}`} className="ph-iso-grid-line" d={d} />
              ))}
              {gridNW.map((d, i) => (
                <path key={`nw-${i}`} className="ph-iso-grid-line" d={d} />
              ))}
            </g>

            <path className="ph-path explored" d={pathThrough(nodes)} />
            <path className="ph-path route" d={pathThrough([current, objective])} />

            <polygon className="ph-fog-face" points={pts([roomSW, roomSE, faceSE, faceSW])} />
            <polygon className="ph-fog" points={pts([roomSW, roomSE, roomNE, roomNW])} />
            <path
              className="ph-path unmapped"
              d={pathThrough([roomSW, roomSE, roomNE, roomNW, roomSW])}
            />

            {nodes.slice(0, -1).map((c) => (
              <g key={`${c[0]}-${c[1]}`}>{nodeAt(c)}</g>
            ))}
            {nodeAt(current, 'current')}

            <g className="ph-objective-wrap">
              {isoPad(objective, 0.3, 'ph-iso-pad objective')}
              <polygon
                className="ph-objective"
                points={pts([
                  add(objective, [0, -5.5]),
                  add(objective, [6, 0]),
                  add(objective, [0, 5.5]),
                  add(objective, [-6, 0]),
                ])}
              />
              <circle className="ph-obj-glow" cx={objective[0]} cy={objective[1]} r="12" />
            </g>
          </svg>
          <div className="ph-map-legend">
            <span>POS NODE-4</span>
            <span>OBJ NE</span>
            <span>UNMAPPED</span>
          </div>
        </div>

        <div className="ph-story-strip">
          <span>STORY STATUS</span>
          <strong>82% — MISSING ENDING</strong>
        </div>

        <footer className="ph-foot">
          <span>PHONE-01</span>
          <span>SC 67</span>
        </footer>
      </div>
    </PhoneShell>
  )
}

export function PhoneStage() {
  const { sceneId } = useScene()
  return sceneId === 'phone-map' ? <PhoneMapStatus /> : <PhoneStoryStatus />
}
