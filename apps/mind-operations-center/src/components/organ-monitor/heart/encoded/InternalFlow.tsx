import { FIELD } from '../field'

export function InternalFlow() {
  return (
    <g className="enc-flow">
      {FIELD.flow.map((d, i) => (
        <path key={d} className={i === 1 ? 'enc-stream pulse-soft' : 'enc-stream'} d={d} />
      ))}
      <path className="enc-stream pulse-travel" d={FIELD.pulsePath} />
    </g>
  )
}
