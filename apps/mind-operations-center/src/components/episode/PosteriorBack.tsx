import '../organ-monitor/organ-monitor.css'
import { THORACIC_VIEWBOX, ThoracicAnatomyStage } from '../organ-monitor/thoracic/ThoracicAnatomyStage'

/**
 * Same body, crop, and scan treatment as the thoracic screen.
 * Read as a rear view: the patient's right scapula is on the viewer's right.
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
            <path className="ep-scapula-lead" d="M658 493 L858 352" />
            <circle className="ep-pain-ring" cx="658" cy="493" r="18" />
            <circle className="ep-pain-core" cx="658" cy="493" r="6" />
            <text className="ep-post-label" x="952" y="344" textAnchor="end">
              R-SCAP
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
