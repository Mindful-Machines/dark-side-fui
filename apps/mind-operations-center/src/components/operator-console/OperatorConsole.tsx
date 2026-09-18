import { useCallback, useEffect, useState } from 'react'
import { CommandPalette } from './CommandPalette'
import { ConsoleTerminal } from './ConsoleTerminal'
import { OPERATOR_COMMANDS } from './commands'
import { OperatorStatusCard } from './OperatorStatusCard'
import './operator-console.css'

export function OperatorConsole() {
  const [selected, setSelected] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [runId, setRunId] = useState(0)

  const execute = useCallback((index: number) => {
    setSelected(index)
    setActive(index)
    setRunId((n) => n + 1)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'SELECT' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((n) => (n + 1) % OPERATOR_COMMANDS.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected((n) => (n - 1 + OPERATOR_COMMANDS.length) % OPERATOR_COMMANDS.length)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        execute(selected)
        return
      }

      // Q–T run commands; digits 0–6 are reserved for global section navigation.
      const letter = event.key.toLowerCase()
      const letterIndex = 'qwert'.indexOf(letter)
      if (letterIndex >= 0 && letterIndex < OPERATOR_COMMANDS.length) {
        event.preventDefault()
        event.stopPropagation()
        execute(letterIndex)
      }
    }

    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [execute, selected])

  const selectedCmd = OPERATOR_COMMANDS[selected]
  const activeCmd = active === null ? null : OPERATOR_COMMANDS[active]
  const status = activeCmd?.status ?? 'READY'
  const tone = activeCmd?.tone ?? 'nominal'

  return (
    <div className={`operator-console tone-${tone}`} data-status={status}>
      <header className="oc-head">
        <div className="oc-badge">
          <span className="oc-dot" />
          <span>{status}</span>
        </div>
        <p className="oc-caption">Operator console · subject-04 · blackwood</p>
      </header>

      <div className="oc-body">
        <div className="oc-main">
          <CommandPalette
            commands={OPERATOR_COMMANDS}
            selected={selected}
            onSelect={setSelected}
            onExecute={execute}
          />
          <ConsoleTerminal command={activeCmd} runId={runId} />
        </div>
        <OperatorStatusCard selected={selectedCmd} last={activeCmd} status={status} />
      </div>
    </div>
  )
}
