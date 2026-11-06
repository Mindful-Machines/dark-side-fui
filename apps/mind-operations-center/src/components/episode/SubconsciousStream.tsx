import { useEpisodeClock } from './clock'

/** Interface fragments. Not scripted dialogue. */

const FRAGMENTS = [
  'the kettle clicked off',
  'i do not remember standing',
  'keys',
  'where are the keys',
  'the hallway light',
  'that color again',
  'someone is waiting',
  'the car is empty',
  'do not look at the window',
  'a word i was told',
  'not to finish',
  'count backwards',
  'four',
  'three',
  'the door',
  'too fast',
  'hands',
  'do not',
  'the floor is cold',
  'left the tap running',
  'a coat on the chair',
  'not my coat',
  'the clock skipped',
  'or i did',
  'breathe',
  'again',
  'the stair',
  'which stair',
  'hold still',
  'something in the hall',
  'no one there',
  'the lock',
  'already turned',
  'stay',
  'the name',
  'do not say it',
  'quiet',
  'still quiet',
]

export function SubconsciousStream({ overwhelmed }: { overwhelmed?: boolean }) {
  const ms = useEpisodeClock(!!overwhelmed)
  const depth = Math.min(148, 72 + Math.floor(ms / 180))
  const meter = 58 + ((depth - 72) / (148 - 72)) * 38
  const lines = [...FRAGMENTS, ...FRAGMENTS]

  return (
    <div
      className={`ep-plate ep-stream${overwhelmed ? ' is-overwhelmed' : ''}`}
      data-system="subconscious"
      data-shot={overwhelmed ? '14.D' : '12.L'}
    >
      <header className="ep-head">
        <div>
          <span className="kicker">CH-7 · subconscious · observe only</span>
          <h3 className="ep-cluster">
            {overwhelmed ? 'THOUGHT QUEUE' : 'SUBCONSCIOUS STREAM'}
            <span className="ep-cluster-dot" aria-hidden="true">
              ·
            </span>
            {overwhelmed ? (
              <span className="ep-cluster-warn">SATURATED</span>
            ) : (
              <span>INCOMING</span>
            )}
          </h3>
        </div>
      </header>

      <div className="ep-stream-body">
        <div className="ep-stream-window" aria-hidden="true">
          <div className="ep-stream-track">
            {lines.map((line, i) => (
              <p key={`${line}-${i}`}>{line}</p>
            ))}
          </div>
        </div>

        {overwhelmed ? (
          <aside className="ep-queue" aria-label="Reroute queue">
            <span className="kicker">Inbound</span>
            <strong>QUEUE SATURATED</strong>
            <div className="ep-meter" aria-hidden="true">
              <span style={{ width: `${meter}%` }} />
            </div>
            <ul>
              <li>UNROUTED  {depth}</li>
              <li>HOLD  96</li>
              <li>REROUTE  BLOCKED</li>
              <li>DROP  none</li>
              <li>BIND  fail</li>
            </ul>
            <em>cannot clear faster than arrival</em>
          </aside>
        ) : (
          <aside className="ep-queue is-calm" aria-label="Stream status">
            <span className="kicker">Throughput</span>
            <strong>UNBOUND</strong>
            <ul>
              <li>FILTER  open</li>
              <li>BIND  none</li>
              <li>RATE  unread</li>
            </ul>
          </aside>
        )}
      </div>
    </div>
  )
}
