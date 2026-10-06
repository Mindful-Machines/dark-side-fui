import { useEffect, type ReactNode } from 'react'
import { CAPTURE } from './config'
import { applyCssCaptureTime, seekCapture, waitCaptureAssets } from './runtime'
import type { MocCaptureApi } from './api'
import './capture.css'

export function CaptureHost({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!CAPTURE.enabled) {
      delete window.__MOC_CAPTURE__
      return
    }

    const api: MocCaptureApi = {
      ready: false,
      duration: CAPTURE.duration,
      fps: CAPTURE.fps,
      seed: CAPTURE.seed,
      seek: seekCapture,
    }
    window.__MOC_CAPTURE__ = api

    document.documentElement.dataset.capture = 'loop'
    document.documentElement.style.cursor = 'none'

    let cancelled = false
    void (async () => {
      await waitCaptureAssets()
      if (cancelled) return
      await seekCapture(0)
      applyCssCaptureTime(0)
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      api.ready = true
    })()

    return () => {
      cancelled = true
      delete document.documentElement.dataset.capture
      document.documentElement.style.cursor = ''
      if (window.__MOC_CAPTURE__ === api) delete window.__MOC_CAPTURE__
    }
  }, [])

  return children
}
