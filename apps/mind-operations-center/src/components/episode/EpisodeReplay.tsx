import { useScene } from '../../context/SceneContext'

/** Review-only. Hidden in display and capture. */
export function EpisodeReplay({ onReplay }: { onReplay: () => void }) {
  const { mode } = useScene()
  if (mode !== 'review') return null
  return (
    <button type="button" className="ep-replay" onClick={onReplay}>
      Replay
    </button>
  )
}
