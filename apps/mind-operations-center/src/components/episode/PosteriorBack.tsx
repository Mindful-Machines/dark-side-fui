import '../organ-monitor/organ-monitor.css'
import { THORACIC_VIEWBOX, ThoracicAnatomyStage } from '../organ-monitor/thoracic/ThoracicAnatomyStage'

/**
 * Same body, crop, and scan treatment as the thoracic screen.
 * The figure is front-facing: patient right is viewer-left.
 * Marker sits on that upper shoulder, in the thoracic viewBox.
 */
export function PosteriorBack() {
  return (
    <div className="thx-anatomy-column">
      <span className="thx-scan-band" aria-hidden="true" />
      <span className="thx-reg-mark thx-reg-a" aria-hidden="true" />
      <span className="thx-reg-mark thx-reg-b" aria-hidden="true" />

      <div className="anatomy-zone">
        <ThoracicAnatomyStage />
        <svg
          className="ep-scapula-overlay thoracic-anatomy-stage"
          viewBox={THORACIC_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <g className="ep-scapula-mark">
            <path className="ep-scapula-lead" d="M286 430 L118 352" />
            <circle className="ep-pain-ring" cx="286" cy="430" r="18" />
            <circle className="ep-pain-core" cx="286" cy="430" r="6" />
            <text className="ep-post-label" x="24" y="344">
              R-SCAP
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
