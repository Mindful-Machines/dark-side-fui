import { FIELD } from '../field'
import { SOURCE_SIZE } from '../source/paths'

export function ScanField() {
  return (
    <g className="enc-scan">
      {FIELD.scans.map((y) => (
        <path key={y} className="enc-band" d={`M12 ${y} H${SOURCE_SIZE.w - 12}`} />
      ))}
    </g>
  )
}
