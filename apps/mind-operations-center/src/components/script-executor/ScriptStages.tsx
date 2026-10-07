import { useEffect, useMemo, useState } from 'react'
import { CAPTURE } from '../../capture/config'
import {
  COGITO_HERO,
  cogitoConfirmed,
  cogitoHeroCount,
  cogitoPulsing,
  towerHeroAt,
  towerPhaseAt,
  TOWER_DELETE_MS,
  TOWER_HERO,
  TOWER_INSERT_MS,
  TOWER_READY_MS,
  TOWER_SELECT_MS,
  type EditPhase,
} from '../../capture/intro'
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
  const [holdLine, setHoldLine] = useState(5)
  const [heroCount, setHeroCount] = useState(CAPTURE.isIntro ? 0 : COGITO_HERO.length)

  useEffect(() => {
    if (captureTime === null) return
    if (CAPTURE.isIntro) {
      setTick(0)
      setHoldLine(5)
      setHeroCount(cogitoHeroCount(captureTime))
      return
    }
    const t = wrapLoop(captureTime)
    const step = (CAPTURE.duration * 1000) / 10
    setTick(Math.floor(t / step))
    setHeroCount(COGITO_HERO.length)
    const lineStep = (CAPTURE.duration * 1000) / 8
    setHoldLine(1 + (Math.floor(t / lineStep) % 8))
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

  const confirmed = !CAPTURE.isIntro || (captureTime !== null && cogitoConfirmed(captureTime))
  const pulsing = CAPTURE.isIntro && captureTime !== null && cogitoPulsing(captureTime)
  const lines = useMemo(
    () =>
      scene.scriptLines.map((entry) => {
        if (CAPTURE.isIntro) {
          return entry.n === 5 ? { ...entry, state: confirmed ? ('current' as const) : ('ok' as const) } : entry
        }
        return { ...entry, state: entry.n === holdLine ? ('current' as const) : ('ok' as const) }
      }),
    [scene.scriptLines, confirmed, holdLine],
  )

  return (
    <div className="script-stage is-cogito">
      <div className="script-exec-banner is-live-hold">
        <span>CURRENT SCRIPT: EXECUTING</span>
        <span className="script-meta-inline">
          LINE {String(CAPTURE.isIntro ? 5 : holdLine).padStart(2, '0')} · {clock} · AURORA-7
        </span>
      </div>

      <div className={`script-hero-line${pulsing ? ' is-confirm' : ''}`} aria-live="polite">
        <span className="kicker">Active line</span>
        <p>{COGITO_HERO.slice(0, heroCount)}</p>
        <span className="script-cursor is-hero" aria-hidden="true" />
      </div>

      <LineList lines={lines} heroN={confirmed ? 5 : undefined} />
    </div>
  )
}

/** Scene 39 — revision / play-armed edit state. */
const TOWER_HOLD_LINES = [3, 5, 6, 8]

export function TowerCranesEditStage({ scene }: { scene: Scene }) {
  const captureTime = useCaptureTime()
  const [phase, setPhase] = useState<EditPhase>(CAPTURE.isLoop ? 'ready' : 'select')
  const [armed, setArmed] = useState(false)
  const [holdLine, setHoldLine] = useState(TOWER_HOLD_LINES[0])

  useEffect(() => {
    if (captureTime === null) return
    if (CAPTURE.isIntro) {
      setPhase(towerPhaseAt(captureTime))
      return
    }
    const step = (CAPTURE.duration * 1000) / TOWER_HOLD_LINES.length
    setHoldLine(TOWER_HOLD_LINES[Math.floor(wrapLoop(captureTime) / step) % TOWER_HOLD_LINES.length])
  }, [captureTime])

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

  const hero =
    CAPTURE.isIntro && captureTime !== null
      ? towerHeroAt(captureTime)
      : { text: TOWER_HERO, cleared: false }
  const readyAt = TOWER_SELECT_MS + TOWER_DELETE_MS + TOWER_INSERT_MS
  const advancing =
    CAPTURE.isIntro &&
    captureTime !== null &&
    captureTime >= readyAt &&
    captureTime < readyAt + TOWER_READY_MS

  const lines = useMemo(() => {
    return scene.scriptLines.map((entry) => {
      if (CAPTURE.isLoop) {
        if (entry.n === 4) return { ...entry, state: 'deleted' as const }
        if (entry.n === holdLine) return { ...entry, state: 'current' as const }
        if (entry.n === 5) return { ...entry, state: 'inserted' as const }
        return { ...entry, state: 'ok' as const }
      }
      if (entry.n === 4) {
        if (phase === 'select') return { ...entry, state: 'selected' as const, code: 'LINE.PRIOR             [selected]' }
        return { ...entry, state: 'deleted' as const }
      }
      if (entry.n === 5) {
        if (phase === 'select' || phase === 'delete') {
          return { ...entry, state: 'ok' as const, code: 'LINE.SLOT              awaiting insert' }
        }
        if (phase === 'insert') {
          return { ...entry, state: 'inserted' as const, code: hero.text || 'LINE.SLOT              inserting' }
        }
        return { ...entry, state: 'inserted' as const }
      }
      if (entry.n === 6 && advancing) return { ...entry, state: 'current' as const }
      return entry
    })
  }, [scene.scriptLines, phase, hero.text, advancing, holdLine])

  const statusLabel = CAPTURE.isLoop
    ? `VERIFY LINE ${String(holdLine).padStart(2, '0')}`
    : phase === 'select'
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
      <div className="script-exec-banner is-edit is-live-hold">
        <span>SCRIPT EDITOR · REVISION 39</span>
        <span className="script-meta-inline">{statusLabel}</span>
      </div>

      <div className={`script-hero-line is-edit${hero.cleared ? ' is-cleared' : ''}`} aria-live="polite">
        <span className="kicker">Hero line</span>
        <p>{hero.text || '\u00a0'}</p>
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
