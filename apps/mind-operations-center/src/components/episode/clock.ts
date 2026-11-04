import { useEffect, useState } from 'react'
import { useScene } from '../../context/SceneContext'

/** True when the app motion policy is holding animation still. */
export function useMotionReduced() {
  const { motion } = useScene()
  const [osReduce, setOsReduce] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setOsReduce(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return motion === 'reduce' || (motion === 'auto' && osReduce)
}

export function readBeat() {
  const beat = new URLSearchParams(window.location.search).get('beat')
  if (beat === 'alert' || beat === 'diagnostic' || beat === 'loop') return beat
  return 'sequence'
}

/** Elapsed visible time. Stays at 0 when motion is reduced. */
export function useEpisodeClock(active = true) {
  const reduced = useMotionReduced()
  const [ms, setMs] = useState(0)

  useEffect(() => {
    if (!active || reduced) return
    const started = performance.now()
    let id = 0
    const tick = () => setMs(performance.now() - started)
    const start = () => {
      if (id !== 0) return
      id = window.setInterval(tick, 50)
    }
    const stop = () => {
      if (id === 0) return
      window.clearInterval(id)
      id = 0
    }
    const onVis = () => {
      if (document.hidden) stop()
      else start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active, reduced])

  return reduced ? 0 : ms
}
