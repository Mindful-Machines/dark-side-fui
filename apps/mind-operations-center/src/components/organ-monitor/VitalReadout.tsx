import type { Metric } from '../../types'
import { useTweenedNumber } from './useTweenedNumber'

export function VitalReadout({
  bpm,
  metrics,
}: {
  bpm: number
  metrics: Metric[]
}) {
  const shown = useTweenedNumber(bpm)

  return (
    <div className="om-readout">
      <div className="om-bpm">
        <span className="kicker">Heart rate</span>
        <div className="om-bpm-row">
          <strong>{Math.round(shown)}</strong>
          <span>BPM</span>
        </div>
      </div>
      <dl className="om-metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className={metric.tone ? `tone-${metric.tone}` : undefined}>
            <dt>{metric.label}</dt>
            <dd>
              {metric.value}
              {metric.hint ? <em>{metric.hint}</em> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
