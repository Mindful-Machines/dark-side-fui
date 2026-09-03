import { FIELD } from '../field'

export function ReconstructionContours() {
  return (
    <g className="enc-contours">
      <path className="enc-contour" d={FIELD.contours.outer} />
      <path className="enc-contour mid" d={FIELD.contours.mid} />
      <path className="enc-contour hi" d={FIELD.contours.inner} />
    </g>
  )
}
