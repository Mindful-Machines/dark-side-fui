import type { ReactNode } from 'react'
import type { Tone } from '../types'

interface PanelProps {
  title: string
  meta?: string
  tone?: Tone
  children: ReactNode
  className?: string
}

export function Panel({ title, meta, tone, children, className }: PanelProps) {
  return (
    <section className={`panel${tone ? ` tone-${tone}` : ''}${className ? ` ${className}` : ''}`}>
      <header className="panel-head">
        <h2>{title}</h2>
        {meta ? <span className="panel-meta">{meta}</span> : null}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}
