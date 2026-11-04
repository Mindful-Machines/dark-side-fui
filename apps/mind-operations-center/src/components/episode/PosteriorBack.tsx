import '../organ-monitor/organ-monitor.css'

/**
 * Posterior upper back in the thoracic scan language:
 * silhouette fill, contour, vertebrae, scapulae, and the existing scan planes.
 * Patient right is viewer-left.
 */
export function PosteriorBack() {
  const vertebrae = Array.from({ length: 13 }, (_, i) => 92 + i * 28)

  return (
    <svg className="ep-posterior-svg thoracic-anatomy-stage" viewBox="0 0 400 520" role="img" aria-label="Posterior upper back">
      <g className="thx-guides" fill="none" aria-hidden="true">
        <path className="thx-caliper" d="M28 70 V470" />
        <path className="thx-tick" d="M24 70 H32 M24 470 H32" />
        <path className="thx-span" d="M70 36 H330" />
        <g className="thx-plane">
          <path d="M48 0 H352" />
        </g>
        <g className="thx-plane thx-plane-b">
          <path d="M64 0 H336" />
        </g>
        <path className="thx-reg" d="M52 78 H60 M56 74 V82" />
        <path className="thx-reg" d="M340 78 H348 M344 74 V82" />
        <path className="thx-reg" d="M196 488 H204 M200 484 V492" />
      </g>

      <path
        className="ep-post-skin"
        d="M200 22
           C186 22 178 40 180 58
           L170 74
           C142 92 96 112 78 142
           C62 168 70 198 88 214
           L82 286
           C76 348 98 410 124 452
           C146 478 172 492 200 494
           C228 492 254 478 276 452
           C302 410 324 348 318 286
           L312 214
           C330 198 338 168 322 142
           C304 112 258 92 230 74
           L220 58
           C222 40 214 22 200 22 Z"
      />
      <path
        className="ep-post-depth"
        d="M200 48
           C188 64 168 86 150 108
           C128 136 118 168 122 206
           C126 260 118 330 136 392
           C150 430 174 454 200 458
           C226 454 250 430 264 392
           C282 330 274 260 278 206
           C282 168 272 136 250 108
           C232 86 212 64 200 48 Z"
      />

      <g className="ep-post-ribs" fill="none">
        <path d="M186 168 C160 176 142 196 136 220" />
        <path d="M184 196 C156 206 140 226 136 250" />
        <path d="M184 224 C158 236 146 256 144 280" />
        <path d="M186 252 C164 264 154 284 154 306" />
        <path d="M214 168 C240 176 258 196 264 220" />
        <path d="M216 196 C244 206 260 226 264 250" />
        <path d="M216 224 C242 236 254 256 256 280" />
        <path d="M214 252 C236 264 246 284 246 306" />
      </g>

      <g className="ep-post-spine">
        {vertebrae.map((y) => (
          <g key={y}>
            <rect x="193" y={y} width="14" height="16" rx="1.6" />
            <path d={`M200 ${y + 16} L200 ${y + 24}`} />
          </g>
        ))}
      </g>

      {/* Patient right scapula — viewer left */}
      <g className="ep-post-bone">
        <path d="M124 128 C104 146 96 184 108 224 C118 256 146 274 168 258 C184 246 190 206 180 164 C172 136 150 118 124 128 Z" />
        <path className="ep-post-fossa" d="M128 156 C146 148 166 154 176 170" />
        <path className="ep-post-fossa" d="M118 188 C140 198 158 206 166 228" />
      </g>
      {/* Patient left scapula — viewer right */}
      <g className="ep-post-bone is-quiet">
        <path d="M276 128 C296 146 304 184 292 224 C282 256 254 274 232 258 C216 246 210 206 220 164 C228 136 250 118 276 128 Z" />
        <path className="ep-post-fossa" d="M272 156 C254 148 234 154 224 170" />
        <path className="ep-post-fossa" d="M282 188 C260 198 242 206 234 228" />
      </g>

      <g className="ep-scapula-mark">
        <path className="thx-lead" d="M138 154 L78 118" />
        <circle className="ep-pain-ring" cx="138" cy="154" r="11" />
        <circle className="ep-pain-core" cx="138" cy="154" r="3.2" />
        <text className="ep-post-label" x="18" y="112">
          R-SCAP
        </text>
      </g>
      <text className="ep-post-side" x="168" y="108">
        R
      </text>
      <text className="ep-post-side" x="224" y="108">
        L
      </text>
      <text className="ep-post-side ep-post-posterior" x="200" y="512" textAnchor="middle">
        POSTERIOR
      </text>
    </svg>
  )
}
