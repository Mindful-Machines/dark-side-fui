import { FIELD } from '../heart/field'
import { AORTA_PATHS, CHAMBER_PATHS, SILHOUETTE_PATHS } from '../heart/source/paths'

const NODES = [
  [128, 124],
  [142, 142],
  [116, 148],
  [134, 162],
] as const

const DRIFT = [
  [108, 118],
  [150, 122],
  [112, 138],
  [146, 154],
  [100, 144],
  [158, 136],
  [124, 168],
  [138, 112],
]

export function CardiacFocusRegion() {
  return (
    <g className="thx-focus">
      <ellipse className="thx-focus-field" cx="130" cy="140" rx="40" ry="48" />
      <g className="thx-heart" transform="translate(130 140) scale(0.2) translate(-198 -244)">
        <defs>
          <clipPath id="thx-heart-clip">
            <path d={SILHOUETTE_PATHS[0]} />
          </clipPath>
        </defs>
        <path className="thx-heart-fill" d={SILHOUETTE_PATHS[0]} />
        <g clipPath="url(#thx-heart-clip)">
          {AORTA_PATHS.map((d) => (
            <path key={d} className="thx-heart-aorta" d={d} />
          ))}
          <path className="thx-heart-lv" d={CHAMBER_PATHS[1]} />
          <path className="thx-pulse" d={FIELD.pulsePath} />
        </g>
        <path className="thx-heart-outline" d={SILHOUETTE_PATHS[0]} />
      </g>
      <path
        className="thx-lock"
        d="M98 100 H108 M98 100 V110 M162 100 H152 M162 100 V110 M98 180 H108 M98 180 V170 M162 180 H152 M162 180 V170"
      />
      <g className="thx-crosshair">
        <path d="M130 128 V134 M130 146 V152 M122 140 H128 M132 140 H138" />
      </g>
      {NODES.map(([x, y], i) => (
        <circle key={i} className={`thx-node${i === 1 ? ' fault' : ''}`} cx={x} cy={y} r={i === 1 ? 1.8 : 1.3} />
      ))}
      {DRIFT.map(([x, y], i) => (
        <circle key={`d${i}`} className="thx-drift" cx={x} cy={y} r="0.7" />
      ))}
    </g>
  )
}
