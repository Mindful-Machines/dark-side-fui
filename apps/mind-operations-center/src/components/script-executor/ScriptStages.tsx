import { useEffect, useMemo, useState } from 'react'
import { CAPTURE } from '../../capture/config'
import { wrapLoop } from '../../capture/runtime'
import { useCaptureTime } from '../../capture/useCaptureTime'
import type { Scene, ScriptLine } from '../../types'

function LineList({ lines, heroN }: { lines: ScriptLine[]; heroN?: number }) {
  return (
    <ol className="script-lines">
      {lines.map((entry) => (
        <li
          key={entry.n}
          className={`script-line state-${entry.state}${heroN === entry.n ? ' is-hero' : ''}`}
        >
          <span className="ln">{String(entry.n).padStart(2, '0')}</span>
          <span className="code">
            {entry.code}
            {entry.state === 'current' || entry.state === 'inserted' || entry.state === 'selected' ? (
              <span className="script-cursor" aria-hidden="true" />
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Scene 26 — active execution of the spoken line. */
export function CogitoScriptStage({ scene }: { scene: Scene }) {
  const captureTime = useCaptureTime()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (captureTime === null) return
    setTick(Math.floor(wrapLoop(captureTime) / 1200))
  }, [captureTime])

  useEffect(() => {
    if (CAPTURE.enabled) return
    let id = 0
    const tick = () => setTick((n) => n + 1)
    const start = () => {
      if (id !== 0) return
      id = window.setInterval(tick, 1200)
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
  }, [])

  const clock = useMemo(() => {
    const sec = (tick % 60) + 4
    return `00:${String(sec).padStart(2, '0')}.${tick % 10}`
  }, [tick])

  return (
    <div className="script-stage is-cogito">
      <div className="script-exec-banner">
        <span>CURRENT SCRIPT: EXECUTING</span>
        <span className="script-meta-inline">
          LINE 05 · {clock} · AURORA-7
        </span>
      </div>

      <div className="script-hero-line" aria-live="polite">
        <span className="kicker">Active line</span>
        <p>I think, therefore I am.</p>
        <span className="script-cursor is-hero" aria-hidden="true" />
      </div>

      <LineList lines={scene.scriptLines} heroN={5} />
    </div>
  )
}

type EditPhase = 'select' | 'delete' | 'insert' | 'ready'

/** Scene 39 — revision / play-armed edit state. */
export function TowerCranesEditStage({ scene }: { scene: Scene }) {
  const [phase, setPhase] = useState<EditPhase>(CAPTURE.enabled ? 'ready' : 'select')
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (CAPTURE.enabled) return
    const order: EditPhase[] = ['select', 'delete', 'insert', 'ready']
    let i = 0
    const id = window.setInterval(() => {
      i = Math.min(i + 1, order.length - 1)
      setPhase(order[i])
      if (order[i] === 'ready') window.clearInterval(id)
    }, 1100)
    return () => window.clearInterval(id)
  }, [scene.id])

  const lines = useMemo(() => {
    return scene.scriptLines.map((entry) => {
      if (entry.n === 4) {
        if (phase === 'select') return { ...entry, state: 'selected' as const, code: 'LINE.PRIOR             [selected]' }
        if (phase === 'delete') return { ...entry, state: 'deleted' as const }
        return { ...entry, state: 'deleted' as const }
      }
      if (entry.n === 5) {
        if (phase === 'select' || phase === 'delete') {
          return { ...entry, state: 'ok' as const, code: 'LINE.SLOT              awaiting insert' }
        }
        if (phase === 'insert') return { ...entry, state: 'inserted' as const }
        return { ...entry, state: 'inserted' as const }
      }
      return entry
    })
  }, [scene.scriptLines, phase])

  const statusLabel =
    phase === 'select'
      ? 'LINE SELECTED'
      : phase === 'delete'
        ? 'PRIOR CLEARED'
        : phase === 'insert'
          ? 'REVISION INSERTED'
          : armed
            ? 'PLAYING REVISION'
            : 'READY TO PLAY'

  return (
    <div className="script-stage is-edit">
      <div className="script-exec-banner is-edit">
        <span>SCRIPT EDITOR · REVISION 39</span>
        <span className="script-meta-inline">{statusLabel}</span>
      </div>

      <div className="script-hero-line is-edit" aria-live="polite">
        <span className="kicker">Hero line</span>
        <p>This whole idea reminds me of tower cranes</p>
        <span className="script-cursor is-hero" aria-hidden="true" />
      </div>

      <LineList lines={lines} heroN={5} />

      <div className="script-edit-actions">
        <button
          type="button"
          className={`script-play${phase === 'ready' ? ' is-armed' : ''}${armed ? ' is-live' : ''}`}
          disabled={phase !== 'ready'}
          onClick={() => setArmed(true)}
        >
          {armed ? 'EXECUTING REVISION' : 'EXECUTE REVISION'}
        </button>
        <span className="script-edit-hint">
          {phase === 'ready' ? 'Selection locked · play armed' : 'Edit sequence in progress'}
        </span>
      </div>
    </div>
  )
}
