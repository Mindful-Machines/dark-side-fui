import type { OperatorCommand } from './commands'

export function OperatorStatusCard({
  selected,
  last,
  status,
}: {
  selected: OperatorCommand
  last: OperatorCommand | null
  status: string
}) {
  return (
    <aside className="oc-status" aria-label="Operator status">
      <p className="oc-kicker">Console state</p>
      <dl>
        <div>
          <dt>Current</dt>
          <dd>{selected.label}</dd>
        </div>
        <div>
          <dt>Last action</dt>
          <dd>{last ? last.label : '—'}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>04</dd>
        </div>
        <div>
          <dt>Script</dt>
          <dd>{last?.script ?? selected.script ?? 'AURORA-7'}</dd>
        </div>
        <div>
          <dt>Uplink</dt>
          <dd>{last?.uplink ?? selected.uplink ?? 'STABLE'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
        {last?.relatedScene ? (
          <div>
            <dt>Linked</dt>
            <dd>{last.relatedScene}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  )
}
