import { useEffect, useState } from 'react'
import { CAPTURE } from './config'
import { getCaptureTimeMs, subscribeCapture } from './runtime'

export function useCaptureTime() {
  const [timeMs, setTimeMs] = useState(() => (CAPTURE.enabled ? getCaptureTimeMs() : 0))
  useEffect(() => {
    if (!CAPTURE.enabled) return
    return subscribeCapture(() => setTimeMs(getCaptureTimeMs()))
  }, [])
  return CAPTURE.enabled ? timeMs : null
}
