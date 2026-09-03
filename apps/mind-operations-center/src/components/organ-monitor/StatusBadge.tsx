import type { Tone } from '../../types'

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <div className={`om-badge tone-${tone}`}>
      <span className="om-badge-dot" />
      <span>{label}</span>
    </div>
  )
}
