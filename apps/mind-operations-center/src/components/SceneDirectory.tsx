import { useState } from 'react'
import { DIRECTORY_GROUPS, VIEW_REGISTRY, canLaunch, viewsInGroup, type ViewMeta } from '../data/registry'
import { useScene } from '../context/SceneContext'
import type { SceneId } from '../types'

function StatusMark({ status }: { status: ViewMeta['status'] }) {
  const cls =
    status === 'READY'
      ? 'ready'
      : status === 'IN PROGRESS'
        ? 'progress'
        : status === 'LOCKED'
          ? 'locked'
          : 'planned'
  return <span className={`dir-status is-${cls}`}>{status}</span>
}

function viewUrl(id: SceneId, mode: string, motion: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('scene', id)
  url.searchParams.set('mode', mode)
  if (motion === 'auto') {
    url.searchParams.delete('motion')
  } else {
    url.searchParams.set('motion', motion)
  }
  return url.toString()
}

function ViewRow({ meta, active }: { meta: ViewMeta; active: boolean }) {
  const { goTo, mode, motion } = useScene()
  const [copied, setCopied] = useState(false)
  const launchable = canLaunch(meta) && meta.id !== 'directory'
  const isDirectory = meta.id === 'directory'

  const launch = (id: SceneId) => {
    if (id === 'directory') {
      goTo('directory', 'review', 'replace')
      return
    }
    goTo(id, undefined, 'push')
  }

  const copyUrl = async () => {
    const text = viewUrl(meta.id, mode, motion)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Fallback for restricted clipboard contexts.
      window.prompt('Copy URL', text)
    }
  }

  return (
    <tr
      className={`${active ? 'is-active' : ''}${launchable || isDirectory ? ' is-launchable' : ''}`}
      data-status={meta.status}
      onClick={() => {
        if (isDirectory || launchable) launch(meta.id)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (isDirectory || launchable) launch(meta.id)
      }}
      tabIndex={launchable || isDirectory ? 0 : -1}
      role="button"
      aria-label={
        launchable || isDirectory ? `Launch ${meta.name}` : `${meta.name}, ${meta.status}`
      }
    >
      <td className="dir-name">
        <span className="dir-index">{meta.indexLabel}</span>
        <span>{meta.name}</span>
      </td>
      <td className="dir-ep">{meta.scene ?? '—'}</td>
      <td className="dir-surface">{meta.surface ?? '—'}</td>
      <td className="dir-imp">{meta.importance ?? '—'}</td>
      <td className="dir-device">{meta.device ?? '—'}</td>
      <td className="dir-format">{meta.format ?? '—'}</td>
      <td>
        <StatusMark status={meta.status} />
      </td>
      <td className="dir-cue">{meta.cue}</td>
      <td className="dir-key">{meta.shortcut}</td>
      <td className="dir-launch">
        {launchable ? (
          <span className="dir-actions">
            <button
              type="button"
              className="dir-launch-btn"
              onClick={(event) => {
                event.stopPropagation()
                launch(meta.id)
              }}
            >
              Launch
            </button>
            <button
              type="button"
              className="dir-launch-btn"
              onClick={(event) => {
                event.stopPropagation()
                void copyUrl()
              }}
            >
              {copied ? 'Copied' : 'URL'}
            </button>
          </span>
        ) : isDirectory ? (
          <span className="dir-here">HERE</span>
        ) : (
          <span className="dir-muted">—</span>
        )}
      </td>
    </tr>
  )
}

export function SceneDirectory() {
  const { sceneId, mode, motion, setMode, setMotion } = useScene()

  const enterCinematicDisplay = () => {
    setMotion('full')
    setMode('display')
  }

  const requestFullscreen = () => {
    setMotion('full')
    const el = document.documentElement
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.()
    } else {
      void document.exitFullscreen?.()
    }
  }

  return (
    <section className="scene-directory" aria-label="Scene directory">
      <header className="dir-head">
        <div>
          <p className="kicker">00 / Production index</p>
          <h2>Scene Directory</h2>
        </div>
        <div className="dir-head-actions">
          <div className="dir-mode" role="group" aria-label="Review or display mode">
            <button
              type="button"
              className={mode === 'review' ? 'is-active' : undefined}
              onClick={() => setMode('review')}
            >
              Review
            </button>
            <button
              type="button"
              className={mode === 'display' ? 'is-active' : undefined}
              onClick={enterCinematicDisplay}
            >
              Display
            </button>
          </div>
          <div className="dir-mode" role="group" aria-label="Motion mode">
            <button
              type="button"
              className={motion === 'auto' ? 'is-active' : undefined}
              onClick={() => setMotion('auto')}
            >
              Motion Auto
            </button>
            <button
              type="button"
              className={motion === 'full' ? 'is-active' : undefined}
              onClick={() => setMotion('full')}
            >
              Motion Full
            </button>
            <button
              type="button"
              className={motion === 'reduce' ? 'is-active' : undefined}
              onClick={() => setMotion('reduce')}
            >
              Motion Reduced
            </button>
          </div>
          <button type="button" className="dir-fs" onClick={requestFullscreen}>
            Fullscreen
          </button>
        </div>
      </header>

      <div className="dir-table-wrap">
        <table className="dir-table">
          <thead>
            <tr>
              <th>View</th>
              <th>Sc</th>
              <th>Surface</th>
              <th>Imp</th>
              <th>Dev</th>
              <th>Fmt</th>
              <th>Status</th>
              <th>Cue</th>
              <th>Key</th>
              <th />
            </tr>
          </thead>
          {DIRECTORY_GROUPS.map((group) => {
            const rows = viewsInGroup(group.id)
            if (rows.length === 0) return null
            return (
              <tbody key={group.id} className="dir-group">
                <tr className="dir-group-row">
                  <td colSpan={10}>{group.label}</td>
                </tr>
                {rows.map((meta) => (
                  <ViewRow key={meta.id} meta={meta} active={sceneId === meta.id} />
                ))}
              </tbody>
            )
          })}
        </table>
      </div>

      <footer className="dir-legend">
        <span>
          <kbd>0</kbd> directory
        </span>
        <span>
          <kbd>1</kbd> ops · <kbd>2</kbd> cardiac · <kbd>3</kbd> thoracic · <kbd>4</kbd> research ·{' '}
          <kbd>5</kbd> operator · <kbd>6</kbd> phone
        </span>
        <span>
          then letter · e.g. <kbd>1</kbd> then <kbd>I</kbd> / <kbd>O</kbd> · <kbd>6</kbd> then{' '}
          <kbd>Q</kbd> / <kbd>W</kbd>
        </span>
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> within section
        </span>
        <span>no key chords · URL copies current mode + motion</span>
        <span className="dir-legend-meta">{VIEW_REGISTRY.directory.indexLabel}</span>
      </footer>
    </section>
  )
}
