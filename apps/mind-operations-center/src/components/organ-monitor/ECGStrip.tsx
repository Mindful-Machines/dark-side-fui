import { Waveform } from '../Waveform'
import type { Tone } from '../../types'

export function ECGStrip({
  bpm,
  noise,
  tone,
  irregular,
}: {
  bpm: number
  noise: number
  tone: Tone
  irregular: boolean
}) {
  return (
    <div className={`ecg-strip${irregular ? ' is-irregular' : ''}`}>
      <div className="ecg-meta">
        <span className="kicker">Lead II</span>
        <span className="kicker">{irregular ? 'Unstable' : 'Live'}</span>
      </div>
      <div className="ecg-plot">
        <Waveform bpm={bpm} noise={noise} tone={tone} mode="ecg" height={56} irregular={irregular} className="ecg-wave" />
        {irregular ? (
          <svg className="ecg-markers" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
            <path d="M18 1 v6 M41 1 v6 M63 1 v6 M82 1 v6" />
          </svg>
        ) : null}
      </div>
    </div>
  )
}
