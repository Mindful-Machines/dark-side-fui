interface SparklineProps {
  values: number[]
  pulse?: boolean
}

export function Sparkline({ values, pulse = true }: SparklineProps) {
  const w = 72
  const h = 22
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = w / Math.max(values.length - 1, 1)
  const d = values
    .map((v, i) => {
      const x = i * step
      const y = h - 2 - ((v - min) / span) * (h - 4)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      className={`sparkline${pulse ? ' is-pulse' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}
