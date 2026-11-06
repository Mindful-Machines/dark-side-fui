import { useState } from 'react'
import { ProgressBar } from '../ProgressBar'
import { EpisodeReplay } from './EpisodeReplay'
import { readBeat, useEpisodeClock, useMotionReduced } from './clock'

const FILL_MS = 12_000
/** Frozen failure. The partial payload stays applied; the transfer does not resume. */
const STALL_PROGRESS = 0.82

const BOOT = [
  { at: 0.04, text: 'USB.MOUNT       SHADOW' },
  { at: 0.16, text: 'BUS             takeover' },
  { at: 0.34, text: 'CONSOLE         boot' },
  { at: 0.55, text: 'SCRIPT.IN       new payload' },
]

export function UploadTakeover({ stalled }: { stalled?: boolean }) {
  const [run, setRun] = useState(0)
  return <UploadPass key={run} stalled={stalled} onReplay={() => setRun((n) => n + 1)} />
}

function UploadPass({ stalled, onReplay }: { stalled?: boolean; onReplay: () => void }) {
  const reduced = useMotionReduced()
  const loop = readBeat() === 'loop'
  const ms = useEpisodeClock(!stalled)
  const live = loop ? (ms % FILL_MS) / FILL_MS : Math.min(1, ms / FILL_MS)
  const progress = stalled ? STALL_PROGRESS : reduced ? 0.36 : live
  const pct = Math.round(progress * 100)

  return (
    <div
      className={`ep-plate ep-upload${stalled ? ' is-stalled' : ' is-live'}`}
      data-system="upload"
      data-shot={stalled ? '39A.I' : '39A.H'}
      data-hold={stalled ? 'indefinite' : undefined}
    >
      <header className="ep-head">
        <div>
          <span className="kicker">USB · SHADOW · console takeover</span>
          <h3>Uploading New Script</h3>
        </div>
        <span className="ep-head-tools">
          <EpisodeReplay onReplay={onReplay} />
          <span className="ep-stable">{stalled ? 'HOLD' : 'BOOT'}</span>
        </span>
      </header>

      <div className="ep-upload-stage">
        <ProgressBar
          value={progress}
          label={stalled ? 'Partial script' : 'New script'}
          animated={!stalled && !reduced}
          tone={stalled ? 'warning' : 'nominal'}
        />

        <ol className="ep-code is-boot">
          {BOOT.map((row) => (
            <li key={row.text} className={!stalled && progress < row.at ? 'is-dim' : ''}>
              <span>{row.text}</span>
            </li>
          ))}
          {stalled ? (
            <li>
              <span>SCRIPT.APPLY     partial</span>
            </li>
          ) : null}
        </ol>

        {stalled ? (
          <div className="ep-alert" role="alert" aria-label="Script upload interrupted">
            {/*
              Held close-up card. A later diagnostic variant could add a compact
              82% bar, access-key status, and partial-script confirmation inside
              this same card. Do not build that variant unless it is requested.
            */}
            <div className="ep-alert-card is-held">
              <span className="ep-alert-mark" aria-hidden="true">
                !
              </span>
              <strong>WARNING</strong>
              <span className="ep-alert-title">SCRIPT UPLOAD INTERRUPTED</span>
              <b>{pct}%</b>
              <span className="ep-alert-facts">
                <em>ACCESS KEY REMOVED</em>
                <em>PARTIAL SCRIPT APPLIED</em>
                <em className="ep-alert-hold">ENDING MISSING</em>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
