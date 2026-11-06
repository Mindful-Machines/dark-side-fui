import { AnatomyViewport } from '../organ-monitor/AnatomyViewport'
import { CardiacTomographyLab } from '../organ-monitor/lab/CardiacTomographyLab'
import { Waveform } from '../Waveform'
import '../organ-monitor/organ-monitor.css'

const NORMAL_CODE = [
  'HR.LOCK         68 BPM',
  'RHYTHM          sinus',
  'RR              882 ms',
  'LEAD.II         clean',
  'SYMPATHETIC     nominal',
  'AFFECT.DAMP     holding',
  'SCRIPT          idle',
  'WARN            none',
]

const ELEVATED_CODE = [
  'HR.LOCK         124 BPM',
  'RHYTHM          stressed',
  'RR              484 ms',
  'LEAD.II         clean · fast',
  'SYMPATHETIC     HIGH +2.4σ',
  'AFFECT.DAMP     off',
  'SCRIPT          standby',
  'WARN            threshold 95',
]

export function HeartMonitorPlate({ variant }: { variant: 'elevated' | 'normal' }) {
  const elevated = variant === 'elevated'
  const bpm = elevated ? 124 : 68
  const lines = elevated ? ELEVATED_CODE : NORMAL_CODE

  return (
    <div
      className="ep-plate ep-heart"
      data-system="heart"
      data-shot={elevated ? '12.K' : '12.KA'}
      data-state={variant}
    >
      <header className="ep-head">
        <div>
          <span className="kicker">Cardiac · control</span>
          <h3 className="ep-cluster">
            {elevated ? 'ELEVATED HEART RATE' : 'HEART RATE'}
            <span className="ep-cluster-dot" aria-hidden="true">
              ·
            </span>
            <span>{bpm} BPM</span>
            <span className="ep-cluster-dot" aria-hidden="true">
              ·
            </span>
            {elevated ? <span className="ep-cluster-warn">WARN</span> : <span className="ep-cluster-quiet">NOMINAL</span>}
          </h3>
        </div>
      </header>

      <div className="ep-heart-grid">
        <div
          className="heart-monitor ep-heart-scope"
          data-cardiac={elevated ? 'elevated' : 'idle'}
          data-view="organ"
        >
          <AnatomyViewport
            state={elevated ? 'elevated' : 'idle'}
            beatMs={Math.round(60_000 / bpm)}
            caption={elevated ? 'Rate high · sinus tach' : 'Sinus · steady'}
          >
            <CardiacTomographyLab presentation="inset" pace={elevated ? 'elevated' : 'steady'} />
          </AnatomyViewport>
        </div>
        <ol className="ep-code" aria-label="Cardiac code">
          {lines.map((line) => (
            <li key={line}>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      </div>

      <Waveform
        bpm={bpm}
        noise={elevated ? 0.14 : 0.03}
        tone={elevated ? 'warning' : 'nominal'}
        mode="ecg"
        height={72}
      />
    </div>
  )
}
