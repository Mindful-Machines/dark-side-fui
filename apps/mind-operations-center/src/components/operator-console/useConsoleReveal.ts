import { useEffect, useState } from 'react'
import { CAPTURE } from '../../capture/config'
import {
  OPERATOR_BOOT_MS,
  OPERATOR_CHAR_MS,
  OPERATOR_LABEL,
  OPERATOR_LINE_MS,
  operatorCommandExecuteMs,
  operatorQuickCommand,
} from '../../capture/intro'
import { useCaptureTime } from '../../capture/useCaptureTime'

export function useTypedText(text: string, active: boolean, ms = 18) {
  const captureTime = useCaptureTime()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (CAPTURE.isLoop) {
      setCount(text.length)
      return
    }
    if (CAPTURE.isIntro) {
      if (!active || captureTime === null) {
        setCount(0)
        return
      }
      const start = CAPTURE.command ? operatorCommandExecuteMs() : OPERATOR_BOOT_MS
      const t = Math.max(0, captureTime - start)
      setCount(Math.min(text.length, Math.floor(t / OPERATOR_CHAR_MS)))
      return
    }
    setCount(0)
    if (!active || !text) return
  }, [text, active, captureTime, ms])

  useEffect(() => {
    if (CAPTURE.enabled) return
    if (!active) return
    if (count >= text.length) return
    const id = window.setTimeout(() => setCount((n) => n + 1), ms)
    return () => window.clearTimeout(id)
  }, [active, count, text, ms])

  return {
    typed: text.slice(0, count),
    done: !active || count >= text.length,
  }
}

export function useRevealLines(lines: string[], active: boolean, delayMs = 90) {
  const captureTime = useCaptureTime()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (CAPTURE.isLoop) {
      setShown(lines.length)
      return
    }
    if (CAPTURE.isIntro) {
      if (!active || captureTime === null) {
        setShown(0)
        return
      }
      const start = CAPTURE.command ? operatorCommandExecuteMs() : OPERATOR_BOOT_MS
      const labelLen = operatorQuickCommand(CAPTURE.command)?.label.length ?? OPERATOR_LABEL.length
      const typedMs = labelLen * OPERATOR_CHAR_MS
      const t = Math.max(0, captureTime - start - typedMs)
      setShown(Math.min(lines.length, Math.floor(t / OPERATOR_LINE_MS)))
      return
    }
    setShown(0)
  }, [lines, active, captureTime, delayMs])

  useEffect(() => {
    if (CAPTURE.enabled) return
    if (!active) return
    if (shown >= lines.length) return
    const id = window.setTimeout(() => setShown((n) => n + 1), delayMs)
    return () => window.clearTimeout(id)
  }, [active, shown, lines, delayMs])

  return {
    visible: lines.slice(0, shown),
    done: !active || shown >= lines.length,
  }
}
