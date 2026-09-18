import type { OperatorCommand } from './commands'

export function CommandPalette({
  commands,
  selected,
  onSelect,
  onExecute,
}: {
  commands: OperatorCommand[]
  selected: number
  onSelect: (index: number) => void
  onExecute: (index: number) => void
}) {
  return (
    <div className="oc-palette" role="listbox" aria-label="Operator commands">
      <span className="oc-kicker">Quick commands · Q–T · Enter</span>
      <ul>
        {commands.map((cmd, index) => {
          const active = index === selected
          const key = 'QWERT'[index]
          return (
            <li key={cmd.id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={active ? 'is-active' : undefined}
                onClick={() => {
                  onSelect(index)
                  onExecute(index)
                }}
              >
                <span className="oc-idx">{key}</span>
                <span className="oc-cmd">{cmd.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
