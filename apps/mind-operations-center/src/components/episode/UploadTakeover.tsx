import { useState } from 'react'
import { ProgressBar } from '../ProgressBar'
import { EpisodeReplay } from './EpisodeReplay'
import { readBeat, useEpisodeClock, useMotionReduced } from './clock'

const FILL_MS = 12_000

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
  const progress = stalled ? 0.82 : reduced ? 0.36 : live

  return (
    <div
      className={`ep-plate ep-upload${stalled ? ' is-stalled' : ' is-live'}`}
      data-system="upload"
      data-shot={stalled ? '39A.I' : '39A.H'}
    >
      <header className="ep-head">
        <div>
          <span className="kicker">USB · SHADOW · console takeover</span>
          <h3>{stalled ? '82% Partial Script Upload' : 'Uploading New Script'}</h3>
        </div>
        <span className="ep-head-tools">
          {stalled ? null : <EpisodeReplay onReplay={onReplay} />}
          <span className={stalled ? 'ep-stable is-hot' : 'ep-stable'}>{stalled ? 'STALLED' : 'BOOT'}</span>
        </span>
      </header>

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
          <li className="is-missing">
            <span>Missing Ending</span>
          </li>
        ) : null}
      </ol>
    </div>
  )
}
