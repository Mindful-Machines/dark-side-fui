import { useEffect, useMemo, useState } from 'react'
import { Panel } from './Panel'
import { ProgressBar } from './ProgressBar'
import { Waveform } from './Waveform'
import { HeartMonitorScene } from './organ-monitor/heart/HeartMonitorScene'
import { OperatorConsole } from './operator-console/OperatorConsole'
import { CAPTURE } from '../capture/config'
import { thoughtsAt, uploadProgressAt } from '../capture/intro'
import { wrapLoop } from '../capture/runtime'
import { useCaptureTime } from '../capture/useCaptureTime'
import { useScene } from '../context/SceneContext'
import { isHeartScene, isOperatorScene, isResearchScene } from '../data/scenes'
import { ResearchTerminal } from './research-terminal/ResearchTerminal'
import { CogitoScriptStage, TowerCranesEditStage } from './script-executor/ScriptStages'
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
  const captureTime = useCaptureTime()
  const [shown, setShown] = useState(0)
  const [typed, setTyped] = useState(0)
  const [visible, setVisible] = useState(() => typeof document !== 'undefined' && !document.hidden)

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (CAPTURE.isLoop) {
      setShown(Math.max(0, thoughts.length - 1))
      setTyped(thoughts[thoughts.length - 1]?.length ?? 0)
      return
    }
    if (CAPTURE.isIntro && captureTime !== null) {
      const cursor = thoughtsAt(thoughts, captureTime)
      setShown(cursor.shown)
      setTyped(cursor.typed)
      return
    }
    if (CAPTURE.enabled) return
    if (!visible) return
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
  }, [thoughts, shown, typed, visible, captureTime])

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
  const captureTime = useCaptureTime()
  const [line, setLine] = useState(scene.executingLine ?? 1)

  useEffect(() => {
    if (captureTime === null || !isExecuting) return
    const step = (CAPTURE.duration * 1000) / 8
    setLine(1 + (Math.floor(wrapLoop(captureTime) / step) % 8))
  }, [captureTime, isExecuting])

  useEffect(() => {
    if (CAPTURE.enabled || !isExecuting) return
    let id = 0
    const tick = () => setLine((prev) => (prev >= 8 ? 1 : prev + 1))
    const start = () => {
      if (id !== 0) return
      id = window.setInterval(tick, 1800)
    }
    const stop = () => {
      if (id === 0) return
      window.clearInterval(id)
      id = 0
    }
    const onVis = () => {
      if (document.hidden) stop()
      else start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
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
  const captureTime = useCaptureTime()
  const [progress, setProgress] = useState(() => {
    if (CAPTURE.isIntro) return 0
    if (CAPTURE.isLoop && scene.id === 'uploading') return 0.14
    return scene.uploadProgress ?? 0
  })

  useEffect(() => {
    if (captureTime === null) return
    if (CAPTURE.isIntro && scene.id === 'uploading') {
      setProgress(uploadProgressAt(captureTime))
      return
    }
    if (CAPTURE.isIntro && scene.id === 'partial') {
      setProgress(scene.uploadProgress ?? 0.82)
      return
    }
    if (!isLive) return
    const p = wrapLoop(captureTime) / (CAPTURE.duration * 1000)
    const tri = p <= 0.5 ? p * 2 : (1 - p) * 2
    setProgress(0.14 + tri * 0.83)
  }, [captureTime, isLive, scene.id, scene.uploadProgress])

  useEffect(() => {
    if (CAPTURE.enabled || !isLive) return
    let id = 0
    const tick = () => {
      setProgress((prev) => {
        const next = prev + 0.012
        return next > 0.97 ? 0.14 : next
      })
    }
    const start = () => {
      if (id !== 0) return
      id = window.setInterval(tick, 180)
    }
    const stop = () => {
      if (id === 0) return
      window.clearInterval(id)
      id = 0
    }
    const onVis = () => {
      if (document.hidden) stop()
      else start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
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

  const title =
    scene.id === 'script-cogito'
      ? 'Script executor'
      : scene.id === 'script-tower-cranes'
        ? 'Script editor'
        : isResearchScene(scene.id)
          ? 'Research terminal'
          : isOperatorScene(scene.id)
            ? 'Operator console'
            : isHeartScene(scene.id)
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

  const body =
    scene.id === 'script-cogito' ? (
      <CogitoScriptStage scene={scene} />
    ) : scene.id === 'script-tower-cranes' ? (
      <TowerCranesEditStage key={scene.id} scene={scene} />
    ) : isResearchScene(scene.id) ? (
      <ResearchTerminal />
    ) : isOperatorScene(scene.id) ? (
      <OperatorConsole />
    ) : isHeartScene(scene.id) ? (
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
      className={`main-panel${isHeartScene(scene.id) ? ' is-cardiac' : ''}${isOperatorScene(scene.id) || isResearchScene(scene.id) ? ' is-operator' : ''}`}
      tone={scene.tone === 'nominal' ? undefined : scene.tone}
    >
      {body}
    </Panel>
  )
}
