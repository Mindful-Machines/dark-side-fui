import { useId } from 'react'
import { FIELD } from '../heart/field'
import { AORTA_PATHS, CHAMBER_PATHS, SILHOUETTE_PATHS } from '../heart/source/paths'

/** Registration nodes in heart source space. */
const NODES = [
  [170, 200],
  [230, 250],
  [150, 270],
  [210, 310],
] as const

/**
 * Fixed placement in the shared thoracic silhouette coordinate system
 * (viewBox 0 0 970 1180). Do not change per viewport or mode.
 *
 * Center ≈ (548, 600): chest, viewer’s right of midline (x=485).
 * Scale 0.34 → heart width ≈ 135 ≈ 22–25% of chest width.
 */
export const THORACIC_HEART_TRANSFORM = 'translate(548 600) scale(0.34) translate(-198 -244)' as const

/** Existing heart paths as a <g> for ThoracicAnatomyStage — not a nested <svg>. */
export function CardiacFocusRegion() {
  const clipId = useId().replace(/:/g, '')

  return (
    <g className="thx-focus" transform={THORACIC_HEART_TRANSFORM}>
      <g className="thx-heart">
        <defs>
          <clipPath id={clipId}>
            <path d={SILHOUETTE_PATHS[0]} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
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
        d="M48 48 H78 M48 48 V78 M348 48 H318 M348 48 V78 M48 442 H78 M48 442 V412 M348 442 H318 M348 442 V412"
      />
      <g className="thx-crosshair">
        <path d="M198 210 V230 M198 258 V278 M178 244 H198 M198 244 H218" />
      </g>
      {NODES.map(([x, y], i) => (
        <circle key={i} className={`thx-node${i === 1 ? ' fault' : ''}`} cx={x} cy={y} r={i === 1 ? 5 : 3.5} />
      ))}
    </g>
  )
}
