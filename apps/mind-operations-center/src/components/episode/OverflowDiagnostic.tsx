import { useState } from 'react'
import { readBeat, useEpisodeClock, useMotionReduced } from './clock'
import { EpisodeReplay } from './EpisodeReplay'
import { PosteriorBack } from './PosteriorBack'
import {
  OVERFLOW_ALERT_MS,
  OVERFLOW_CYCLE_MS,
  OVERFLOW_DISMISS_MS,
  OVERFLOW_MODAL_GONE_MS,
  OVERFLOW_PULSE_MS,
} from './overflowTiming'

function modalOpacity(ms: number, beat: string, reduced: boolean) {
  if (beat === 'diagnostic' || (reduced && beat !== 'alert')) return 0
  if (beat === 'alert') return 1
  const t = beat === 'loop' ? ms % OVERFLOW_CYCLE_MS : ms
  if (t < OVERFLOW_ALERT_MS) return 1
  if (t >= OVERFLOW_MODAL_GONE_MS) return 0
  return 1 - (t - OVERFLOW_ALERT_MS) / OVERFLOW_DISMISS_MS
}

export function OverflowDiagnostic() {
  const [run, setRun] = useState(0)
  return <OverflowPass key={run} onReplay={() => setRun((n) => n + 1)} />
}

function OverflowPass({ onReplay }: { onReplay: () => void }) {
  const beat = readBeat()
  const reduced = useMotionReduced()
  const ms = useEpisodeClock(beat !== 'diagnostic')
  const opacity = modalOpacity(ms, beat, reduced)
  const caption = opacity < 0.15 ? 1 : 0

  return (
    <div
      className="ep-plate ep-overflow"
      data-system="overflow"
      data-shot="39A.B"
      data-beat={beat}
      data-pulse-ms={OVERFLOW_PULSE_MS}
      data-modal-gone-ms={OVERFLOW_MODAL_GONE_MS}
    >
      <header className="ep-head">
        <div>
          <span className="kicker">Somatic · posterior · diagnostic</span>
          <h3>Overflow</h3>
        </div>
        <span className="ep-head-tools">
          <EpisodeReplay onReplay={onReplay} />
          <span className="ep-stable">CH-3</span>
        </span>
      </header>

      <div className="ep-overflow-stage">
        <div className="ep-posterior">
          <PosteriorBack />
        </div>

        <p className="ep-overflow-caption" style={{ opacity: caption }}>
          OVERFLOW DETECTED - RIGHT SCAPULA
        </p>

        <div
          className="ep-alert"
          role="alert"
          aria-label="Overflow warning"
          style={{ opacity, visibility: opacity <= 0.01 ? 'hidden' : 'visible' }}
        >
          <div className="ep-alert-card" style={{ animationDuration: `${OVERFLOW_PULSE_MS}ms` }}>
            <span className="ep-alert-mark" aria-hidden="true">
              !
            </span>
            <strong>WARNING</strong>
            <b>OVERFLOW</b>
            <em>THRESHOLD EXCEEDED</em>
          </div>
        </div>
      </div>
    </div>
  )
}
