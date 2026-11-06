import { useState } from 'react'
import { readBeat, useEpisodeClock } from './clock'
import { EpisodeReplay } from './EpisodeReplay'

/** Exact Episode One line. The em dash stays outside the edited span. */
export const SCRIPT_PREFIX = 'If you want to understand the minds of '
export const SCRIPT_CUT = 'the people with their hands around the neck of the future'
export const SCRIPT_NEXT = 'the people building the future'
export const SCRIPT_SUFFIX = '—'

const CYCLE = 12_000
const HOLD = 2_200
const DELETE = 2_600
const TYPE = 3_200

type Phase = 'highlight' | 'delete' | 'type' | 'hold'

function frame(t: number): { phase: Phase; cut: string; typed: string } {
  if (t < HOLD) return { phase: 'highlight', cut: SCRIPT_CUT, typed: '' }
  if (t < HOLD + DELETE) {
    const keep = Math.ceil(SCRIPT_CUT.length * (1 - (t - HOLD) / DELETE))
    return { phase: 'delete', cut: SCRIPT_CUT.slice(0, keep), typed: '' }
  }
  const typedAt = t - HOLD - DELETE
  if (typedAt < TYPE) {
    const n = Math.max(1, Math.floor((typedAt / TYPE) * SCRIPT_NEXT.length))
    return { phase: 'type', cut: '', typed: SCRIPT_NEXT.slice(0, n) }
  }
  return { phase: 'hold', cut: '', typed: SCRIPT_NEXT }
}

const PHASE_LABEL: Record<Phase, string> = {
  highlight: 'HIGHLIGHT LOCKED',
  delete: 'DELETING SELECTION',
  type: 'TYPING REPLACEMENT',
  hold: 'REVISION HELD',
}

export function ScriptHighlightEdit() {
  const [run, setRun] = useState(0)
  return <ScriptPass key={run} onReplay={() => setRun((n) => n + 1)} />
}

function ScriptPass({ onReplay }: { onReplay: () => void }) {
  const loop = readBeat() === 'loop'
  const ms = useEpisodeClock()
  const { phase, cut, typed } = frame(loop ? ms % CYCLE : Math.min(ms, CYCLE - 1))
  const editing = phase === 'highlight' || phase === 'delete'

  return (
    <div
      className="ep-plate ep-script"
      data-system="script"
      data-shot="14.I"
      data-phase={phase}
      data-action-ms={HOLD + DELETE + TYPE}
    >
      <header className="ep-head">
        <div>
          <span className="kicker">DIRECTOR · live edit · line 05</span>
          <h3>Script</h3>
        </div>
        <span className="ep-head-tools">
          <EpisodeReplay onReplay={onReplay} />
        </span>
      </header>

      <div className="ep-script-hero" aria-live="polite">
        <div className="ep-script-edit">
          <span className="ep-script-phase">{PHASE_LABEL[phase]}</span>
        <p>
          {[
            SCRIPT_PREFIX,
            editing ? (
              <mark key="cut">{cut || '\u00a0'}</mark>
            ) : (
              <span key="typed" className="ep-typed">
                {typed}
              </span>
            ),
            SCRIPT_SUFFIX,
            phase === 'delete' || phase === 'type' ? <i key="caret" className="ep-caret" aria-hidden="true" /> : null,
          ]}
        </p>
        </div>
      </div>

      <ol className="ep-script-lines">
        <li>
          <span>04</span>INTENT.HOLD pending director
        </li>
        <li className="is-current">
          <span>05</span>
          {editing ? SCRIPT_CUT : SCRIPT_NEXT}
        </li>
        <li>
          <span>06</span>MOTOR.PRIME withheld
        </li>
      </ol>
    </div>
  )
}
