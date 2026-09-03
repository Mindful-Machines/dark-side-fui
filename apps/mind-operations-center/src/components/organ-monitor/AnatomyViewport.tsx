import type { ReactNode } from 'react'

export function AnatomyViewport({
  state,
  beatMs,
  caption,
  children,
}: {
  state: string
  beatMs: number
  caption: string
  children: ReactNode
}) {
  return (
    <div
      className="anatomy-viewport"
      data-organ-state={state}
      style={{ ['--beat' as string]: `${beatMs}ms` }}
    >
      <div className="anatomy-frame" aria-hidden="true">
        <span className="anatomy-corner tl" />
        <span className="anatomy-corner tr" />
        <span className="anatomy-corner bl" />
        <span className="anatomy-corner br" />
      </div>
      <div className="anatomy-scan" aria-hidden="true" />
      <div className="anatomy-stage">{children}</div>
      <p className="anatomy-caption">{caption}</p>
    </div>
  )
}
