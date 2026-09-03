import { FIELD } from '../field'

export function HeartDataField() {
  return (
    <g className="enc-field">
      {FIELD.dots.map((d, i) => (
        <circle
          key={`d-${i}`}
          className={`enc-dot${d.beat ? ' beat' : ''}${d.fault ? ' fault' : ''}`}
          cx={d.x}
          cy={d.y}
          r={d.beat ? 0.7 : 0.45}
        />
      ))}
      {FIELD.dotsHi.map((d, i) => (
        <circle
          key={`h-${i}`}
          className={`enc-dot hi${d.beat ? ' beat' : ''}${d.fault ? ' fault' : ''}`}
          cx={d.x}
          cy={d.y}
          r={0.45}
        />
      ))}
      <path className="enc-seg" d={FIELD.segs.base} />
      <path className="enc-seg hi" d={FIELD.segs.hi} />
      <path className="enc-seg signal" d={FIELD.segs.signal} />
      <path className="enc-seg fault" d={FIELD.segs.fault} />
      {FIELD.glyphs.map((g, i) => (
        <text key={`g-${i}`} className={`enc-glyph${g.hi ? ' hi' : ''}${g.fault ? ' fault' : ''}`} x={g.x} y={g.y}>
          {g.t}
        </text>
      ))}
    </g>
  )
}
