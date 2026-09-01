import { Panel } from './Panel'
import { Sparkline } from './Sparkline'
import { Waveform } from './Waveform'
import { useScene } from '../context/SceneContext'

const LOAD_SERIES: Record<string, number[]> = {
  idle: [0.12, 0.14, 0.13, 0.16, 0.15, 0.18, 0.17, 0.16, 0.18, 0.19, 0.17, 0.18],
  elevated: [0.32, 0.41, 0.38, 0.52, 0.48, 0.61, 0.58, 0.66, 0.6, 0.63, 0.59, 0.61],
  thoughts: [0.28, 0.31, 0.4, 0.36, 0.44, 0.41, 0.47, 0.43, 0.45, 0.42, 0.44, 0.44],
  executing: [0.3, 0.34, 0.38, 0.42, 0.48, 0.5, 0.47, 0.53, 0.51, 0.52, 0.5, 0.52],
  paused: [0.44, 0.58, 0.51, 0.7, 0.66, 0.81, 0.74, 0.79, 0.72, 0.77, 0.75, 0.77],
  uploading: [0.18, 0.22, 0.2, 0.26, 0.24, 0.29, 0.27, 0.3, 0.28, 0.29, 0.27, 0.29],
  partial: [0.22, 0.28, 0.25, 0.33, 0.3, 0.36, 0.34, 0.37, 0.35, 0.36, 0.34, 0.36],
}

function formatPct(n: number) {
  return `${Math.round(n * 100)}%`
}

export function VitalsPanel() {
  const { scene } = useScene()
  const hrTone =
    scene.tone === 'critical' ? 'critical' : scene.heartRate >= 100 ? 'warning' : undefined

  return (
    <Panel title="Vitals" meta="SUBJ-04" tone={hrTone}>
      <div className="vital-grid">
        <div className={`vital-block${hrTone ? ` tone-${hrTone}` : ''}`}>
          <span className="kicker">Heart rate</span>
          <div className="vital-row">
            <strong className={scene.id === 'elevated' ? 'is-pulse' : undefined}>
              {scene.heartRate}
            </strong>
            <span className="unit">BPM</span>
          </div>
        </div>
        <div className="vital-block">
          <span className="kicker">Neural load</span>
          <div className="vital-row">
            <strong>{formatPct(scene.neuralLoad)}</strong>
            <Sparkline values={LOAD_SERIES[scene.id]} />
          </div>
        </div>
        <div className="vital-stat">
          <span>Coherence</span>
          <b>{scene.coherence.toFixed(3)}</b>
        </div>
        <div className="vital-stat">
          <span>Latency</span>
          <b>{scene.latencyMs} ms</b>
        </div>
      </div>
      <Waveform
        bpm={scene.heartRate}
        noise={scene.waveformNoise}
        paused={scene.waveformPaused}
        tone={hrTone ?? scene.tone}
        mode="ecg"
        height={64}
      />
    </Panel>
  )
}
