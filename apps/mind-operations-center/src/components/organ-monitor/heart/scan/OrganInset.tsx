import { CHAMBER_PATHS } from '../source/paths'

const lv = CHAMBER_PATHS[1]

export function OrganInset() {
  return (
    <svg className="organ-inset" viewBox="0 0 72 60" aria-hidden="true">
      <path className="oi-frame" d="M2 2 H8 M2 2 V8 M70 2 H64 M70 2 V8 M2 58 H8 M2 58 V52 M70 58 H64 M70 58 V52" />
      <text className="oi-kicker" x="4" y="11">
        LV
      </text>
      <text className="oi-metric" x="4" y="56">
        WALL 11
      </text>
      <g transform="translate(43 32) scale(0.235) translate(-275 -282)">
        <path className="oi-outline" d={lv} />
      </g>
    </svg>
  )
}
