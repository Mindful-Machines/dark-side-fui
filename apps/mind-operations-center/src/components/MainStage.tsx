import { useEffect, useMemo, useState } from 'react'
import { Panel } from './Panel'
import { ProgressBar } from './ProgressBar'
import { Waveform } from './Waveform'
import { HeartMonitorScene } from './organ-monitor/heart/HeartMonitorScene'
import { useScene } from '../context/SceneContext'
import { isHeartScene } from '../data/scenes'
import type { Scene } from '../types'

function OverviewStage({ scene }: { scene: Scene }) {
  return (
    <>
      <div className="metric-tiles">
        {scene.metrics.map((metric) => (
          <div key={metric.label} className={`tile${metric.tone ? ` tone-${metric.tone}` : ''}`}>
            <span className="kicker">{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.hint ? <em>{metric.hint}</em> : null}
          </div>
        ))}
      </div>
      <div className="stage-wave">
        <span className="kicker">Neural field · 0.2–12 Hz</span>
        <Waveform
          bpm={scene.heartRate}
          noise={scene.waveformNoise}
          tone={scene.tone}
          mode="neural"
          height={120}
        />
      </div>
    </>
  )
}

function HeartRateStage({ scene }: { scene: Scene }) {
  return (
    <div className="hr-stage">
      <div className="hr-hero">
        <span className="kicker">Cardiac response</span>
        <div className="hr-value is-pulse">
          <strong>{scene.heartRate}</strong>
          <span>BPM</span>
        </div>
        <p>Threshold 95 exceeded. Sympathetic band elevated. Script remains on standby.</p>
      </div>
      <div className="stage-wave">
        <span className="kicker">Lead II · live</span>
        <Waveform
          bpm={scene.heartRate}
          noise={scene.waveformNoise}
          tone="warning"
          mode="ecg"
          height={110}
        />
      </div>
      <div className="metric-tiles compact">
        {scene.metrics.map((metric) => (
          <div key={metric.label} className={`tile${metric.tone ? ` tone-${metric.tone}` : ''}`}>
            <span className="kicker">{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.hint ? <em>{metric.hint}</em> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function ThoughtStage({ scene }: { scene: Scene }) {
  const thoughts = scene.thoughts
  const [shown, setShown] = useState(0)
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    const current = thoughts[shown]
    if (current === undefined) return

    if (typed < current.length) {
      const id = window.setTimeout(() => setTyped(typed + 1), 32)
      return () => window.clearTimeout(id)
    }

    const id = window.setTimeout(() => {
      if (shown < thoughts.length - 1) {
        setShown(shown + 1)
        setTyped(0)
      }
    }, 1500)
    return () => window.clearTimeout(id)
  }, [thoughts, shown, typed])

  return (
    <div className="thought-stage">
      <p className="thought-kicker">CH-7 · subconscious · observe only</p>
      <ul className="thought-list">
        {thoughts.slice(0, shown + 1).map((thought, i) => {
          const isCurrent = i === shown
          const text = isCurrent ? thought.slice(0, typed) : thought
          return (
            <li key={`${thought}-${i}`} className={isCurrent ? 'is-current' : 'is-past'}>
              <span>{text || '\u00a0'}</span>
              {isCurrent ? <span className="cursor" aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ScriptStage({ scene }: { scene: Scene }) {
  const isExecuting = scene.id === 'executing'
  const [line, setLine] = useState(scene.executingLine ?? 1)

  useEffect(() => {
    if (!isExecuting) return
    const id = window.setInterval(() => {
      setLine((prev) => (prev >= 8 ? 1 : prev + 1))
    }, 1800)
    return () => window.clearInterval(id)
  }, [isExecuting, scene.id])

  const lines = useMemo(
    () =>
      scene.scriptLines.map((entry) => {
        if (scene.id === 'paused') return entry
        if (!isExecuting) return entry
        return {
          ...entry,
          state: entry.n === line ? ('current' as const) : ('ok' as const),
        }
      }),
    [scene, isExecuting, line],
  )

  return (
    <div className="script-stage">
      {scene.id === 'paused' ? (
        <div className="banner critical" role="alert">
          <span>Contamination detected</span>
          <span>Node kitchen_window · integrity 0.41 · script halted at 04</span>
        </div>
      ) : null}
      <ol className="script-lines">
        {lines.map((entry) => (
          <li key={entry.n} className={`script-line state-${entry.state}`}>
            <span className="ln">{String(entry.n).padStart(2, '0')}</span>
            <span className="code">{entry.code}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function UploadStage({ scene }: { scene: Scene }) {
  const isLive = scene.id === 'uploading'
  const [progress, setProgress] = useState(scene.uploadProgress ?? 0)

  useEffect(() => {
    if (!isLive) return
    const id = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + 0.012
        return next > 0.97 ? 0.14 : next
      })
    }, 180)
    return () => window.clearInterval(id)
  }, [isLive, scene.id])

  return (
    <div className="upload-stage">
      {scene.id === 'partial' ? (
        <div className="banner warning" role="status">
          <span>Partial payload</span>
          <span>Ending sequence not received · do not execute</span>
        </div>
      ) : null}

      <ProgressBar
        value={progress}
        label={isLive ? 'Inbound AURORA-8' : 'Stalled AURORA-8'}
        animated={isLive}
        tone={scene.id === 'partial' ? 'warning' : 'nominal'}
      />

      <ol className="script-lines">
        {scene.scriptLines.map((entry) => (
          <li key={entry.n} className={`script-line state-${entry.state}`}>
            <span className="ln">{String(entry.n).padStart(2, '0')}</span>
            <span className="code">{entry.code}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function MainStage() {
  const { scene } = useScene()

  const title = isHeartScene(scene.id)
    ? 'Cardiac monitor'
    : scene.id === 'idle'
      ? 'System overview'
      : scene.id === 'elevated'
        ? 'Elevated heart rate'
        : scene.id === 'thoughts'
          ? 'Subconscious thought stream'
          : scene.id === 'executing'
            ? 'Current script'
            : scene.id === 'paused'
              ? 'Script halted'
              : scene.id === 'uploading'
                ? 'Uploading new script'
                : 'Incomplete payload'

  const body = isHeartScene(scene.id) ? (
    <HeartMonitorScene />
  ) : scene.id === 'idle' ? (
      <OverviewStage scene={scene} />
    ) : scene.id === 'elevated' ? (
      <HeartRateStage scene={scene} />
    ) : scene.id === 'thoughts' ? (
      <ThoughtStage key={scene.id} scene={scene} />
    ) : scene.id === 'executing' || scene.id === 'paused' ? (
      <ScriptStage key={scene.id} scene={scene} />
    ) : (
      <UploadStage key={scene.id} scene={scene} />
    )

  return (
    <Panel
      title={title}
      meta={scene.shortLabel}
      className={`main-panel${isHeartScene(scene.id) ? ' is-cardiac' : ''}`}
      tone={scene.tone === 'nominal' ? undefined : scene.tone}
    >
      {body}
    </Panel>
  )
}
