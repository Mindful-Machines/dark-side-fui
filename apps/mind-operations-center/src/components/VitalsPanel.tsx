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
  'heart-idle': [0.16, 0.18, 0.17, 0.2, 0.19, 0.22, 0.21, 0.2, 0.22, 0.23, 0.21, 0.22],
  'heart-elevated': [0.34, 0.42, 0.4, 0.51, 0.48, 0.58, 0.55, 0.6, 0.56, 0.59, 0.57, 0.58],
  'heart-irregular': [0.38, 0.52, 0.44, 0.61, 0.49, 0.66, 0.58, 0.7, 0.55, 0.64, 0.6, 0.66],
  'heart-intervention': [0.48, 0.62, 0.7, 0.66, 0.78, 0.74, 0.82, 0.79, 0.81, 0.8, 0.78, 0.81],
  'heart-recovered': [0.14, 0.16, 0.15, 0.18, 0.17, 0.19, 0.18, 0.17, 0.19, 0.2, 0.18, 0.19],
  'thoracic-scan': [0.16, 0.18, 0.17, 0.2, 0.19, 0.22, 0.21, 0.2, 0.22, 0.23, 0.21, 0.22],
  'thoracic-idle': [0.16, 0.18, 0.17, 0.2, 0.19, 0.22, 0.21, 0.2, 0.22, 0.23, 0.21, 0.22],
  'thoracic-elevated': [0.34, 0.42, 0.4, 0.51, 0.48, 0.58, 0.55, 0.6, 0.56, 0.59, 0.57, 0.58],
  'thoracic-irregular': [0.38, 0.52, 0.44, 0.61, 0.49, 0.66, 0.58, 0.7, 0.55, 0.64, 0.6, 0.66],
  'thoracic-intervention': [0.48, 0.62, 0.7, 0.66, 0.78, 0.74, 0.82, 0.79, 0.81, 0.8, 0.78, 0.81],
  'thoracic-recovered': [0.14, 0.16, 0.15, 0.18, 0.17, 0.19, 0.18, 0.17, 0.19, 0.2, 0.18, 0.19],
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
            <strong
              className={
                scene.id === 'elevated' ||
                scene.id === 'heart-elevated' ||
                scene.id === 'heart-intervention' ||
                scene.id === 'thoracic-elevated' ||
                scene.id === 'thoracic-intervention'
                  ? 'is-pulse'
                  : undefined
              }
            >
              {scene.heartRate}
            </strong>
            <span className="unit">BPM</span>
          </div>
        </div>
        <div className="vital-block">
          <span className="kicker">Neural load</span>
          <div className="vital-row">
            <strong>{formatPct(scene.neuralLoad)}</strong>
            <Sparkline values={LOAD_SERIES[scene.id] ?? LOAD_SERIES.idle} />
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
        irregular={scene.id === 'heart-irregular' || scene.id === 'thoracic-irregular'}
        tone={hrTone ?? scene.tone}
        mode="ecg"
        height={64}
      />
    </Panel>
  )
}
