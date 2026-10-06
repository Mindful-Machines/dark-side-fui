import { useEffect } from 'react'
import { CAPTURE } from '../capture/config'

/**
 * Runs `setInterval` only while the document is visible.
 * Clears on unmount and on hide; restarts on show without stacking timers.
 */
export function useWhenVisibleInterval(
  callback: () => void,
  ms: number | null,
  deps: unknown[] = [],
) {
  useEffect(() => {
    if (ms === null || CAPTURE.enabled) return

    let id = 0
    const tick = () => {
      callback()
    }
    const start = () => {
      if (id !== 0) return
      id = window.setInterval(tick, ms)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, [ms, ...deps])
}
