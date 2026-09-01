interface ProgressBarProps {
  value: number
  label?: string
  animated?: boolean
  tone?: 'nominal' | 'warning' | 'critical'
}

export function ProgressBar({
  value,
  label,
  animated = false,
  tone = 'nominal',
}: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)

  return (
    <div className={`progress tone-${tone}${animated ? ' is-animated' : ''}`}>
      <div className="progress-meta">
        <span>{label ?? 'Transfer'}</span>
        <span className="progress-pct">{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
