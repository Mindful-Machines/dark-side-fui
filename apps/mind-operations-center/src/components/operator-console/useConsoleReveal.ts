import { useEffect, useState } from 'react'

export function useTypedText(text: string, active: boolean, ms = 18) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
    if (!active || !text) return
  }, [text, active])

  useEffect(() => {
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
  const [shown, setShown] = useState(0)

  useEffect(() => {
    setShown(0)
  }, [lines, active])

  useEffect(() => {
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
