import type { Metric } from '../../../types'
import { VitalReadout } from '../VitalReadout'
import { ThoracicAnatomyStage } from './ThoracicAnatomyStage'
import { ThoracicFieldGuides, ThoracicTelemetry } from './ThoracicOverlay'

export function ThoracicScan({ bpm, metrics }: { bpm: number; metrics: Metric[] }) {
  return (
    <div className="thoracic-scan" role="img" aria-label="Thoracic scan">
      <div className="thx-visual-composition">
        <div className="thx-anatomy-column">
          <svg
            className="thx-guides-field"
            viewBox="0 0 400 500"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <ThoracicFieldGuides />
          </svg>

          <div className="thx-scan-band" aria-hidden="true" />
          <span className="thx-reg-mark thx-reg-a" aria-hidden="true" />
          <span className="thx-reg-mark thx-reg-b" aria-hidden="true" />

          <div className="anatomy-zone">
            <ThoracicAnatomyStage />
          </div>

          <span className="thx-dim">142 mm</span>
          <span className="thx-bridge" aria-hidden="true" />
        </div>

        <aside className="thx-telemetry-rail">
          <VitalReadout bpm={bpm} metrics={metrics} />
          <ThoracicTelemetry />
        </aside>
      </div>
    </div>
  )
}
