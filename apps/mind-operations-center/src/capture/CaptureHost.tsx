import { useEffect, type ReactNode } from 'react'
import { CAPTURE } from './config'
import { introDurationMs, operatorCommandDurationMs, operatorQuickCommand } from './intro'
import { applyCssCaptureTime, seekCapture, waitCaptureAssets } from './runtime'
import { SCENES } from '../data/scenes'
import type { SceneId } from '../types'
import type { MocCaptureApi } from './api'
import './capture.css'

export function CaptureHost({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!CAPTURE.enabled) {
      delete window.__MOC_CAPTURE__
      return
    }

    const scene = SCENES[CAPTURE.scene as SceneId]
    const quick = operatorQuickCommand(CAPTURE.command)
    const duration = quick
      ? operatorCommandDurationMs(quick) / 1000
      : CAPTURE.isIntro
        ? introDurationMs(CAPTURE.scene, scene?.thoughts ?? []) / 1000
        : CAPTURE.duration

    const api: MocCaptureApi = {
      ready: false,
      duration,
      fps: CAPTURE.fps,
      seed: CAPTURE.seed,
      seek: seekCapture,
    }
    window.__MOC_CAPTURE__ = api

    document.documentElement.dataset.capture = CAPTURE.mode
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
