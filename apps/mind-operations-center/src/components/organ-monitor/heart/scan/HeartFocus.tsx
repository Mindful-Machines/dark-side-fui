import { HeartDataField } from '../encoded/HeartDataField'
import { InternalFlow } from '../encoded/InternalFlow'
import { ScanField } from '../encoded/ScanField'
import { HEART_CLIP_ID } from '../field'
import { AORTA_PATHS, CHAMBER_PATHS, SILHOUETTE_PATHS } from '../source/paths'

const chambers = CHAMBER_PATHS.slice(0, 2)

export function HeartFocus() {
  return (
    <g className="heart-focus">
      <defs>
        <clipPath id={HEART_CLIP_ID}>
          <path d={SILHOUETTE_PATHS[0]} />
        </clipPath>
      </defs>
      <path className="hf-glow" d={SILHOUETTE_PATHS[0]} />
      <g clipPath={`url(#${HEART_CLIP_ID})`}>
        <ScanField />
        <HeartDataField />
        <InternalFlow />
      </g>
      <g className="src-contours" fill="none">
        <path className="src-outline" d={SILHOUETTE_PATHS[0]} />
        {AORTA_PATHS.map((d) => (
          <path key={d} className="src-aorta" d={d} />
        ))}
        {chambers.map((d, i) => (
          <path key={d} className={i === 1 ? 'src-chamber lv' : 'src-chamber'} d={d} />
        ))}
      </g>
      <path
        className="hf-lock"
        fill="none"
        d="M236 196 H249 M236 196 V209 M318 196 H305 M318 196 V209 M236 348 H249 M236 348 V335 M318 348 H305 M318 348 V335"
      />
      <circle className="hf-node" cx="210" cy="90" r="2.6" />
      <circle className="hf-node" cx="275" cy="282" r="3.1" />
      <circle className="hf-node" cx="248" cy="428" r="2.4" />
      <circle className="hf-anomaly" cx="268" cy="300" r="5.2" />
      <circle className="hf-anomaly" cx="148" cy="252" r="3.8" />
    </g>
  )
}
