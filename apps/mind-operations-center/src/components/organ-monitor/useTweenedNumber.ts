import { useEffect, useRef, useState } from 'react'
import { CAPTURE } from '../../capture/config'

export function useTweenedNumber(target: number, ms = 720) {
  const [value, setValue] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    if (CAPTURE.enabled) {
      current.current = target
      setValue(target)
      return
    }
    const from = current.current
    const t0 = performance.now()
    let id = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const next = from + (target - from) * (1 - (1 - p) ** 3)
      current.current = next
      setValue(next)
      if (p < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target, ms])

  return value
}
