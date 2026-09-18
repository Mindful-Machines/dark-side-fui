import type { OperatorCommand } from './commands'
import { useRevealLines, useTypedText } from './useConsoleReveal'

export function ConsoleTerminal({
  command,
  runId,
}: {
  command: OperatorCommand | null
  runId: number
}) {
  const label = command?.label ?? ''
  const { typed, done: typedDone } = useTypedText(label, Boolean(command) && runId > 0, 16)
  const { visible } = useRevealLines(command?.response ?? [], typedDone && Boolean(command), 70)

  return (
    <div className="oc-terminal" aria-live="polite">
      <div className="oc-prompt-row">
        <span className="oc-host">MOC://OPERATOR</span>
        <span className="oc-prompt">&gt;</span>
        <span className="oc-typed">
          {command ? typed : ''}
          <span className={`oc-cursor${!command || !typedDone ? ' is-idle' : ''}`} />
        </span>
      </div>

      {command ? (
        <div className="oc-session" key={runId}>
          <div className="oc-response">
            {visible.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="oc-idle">
          <p>CHANNEL OPEN · AWAITING DIRECTIVE</p>
          <p className="oc-hint">Select a command or press Q–T, then Enter.</p>
        </div>
      )}
    </div>
  )
}
