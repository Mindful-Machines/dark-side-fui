export type CaptureMode = 'off' | 'loop' | 'intro'

export type CaptureConfig = {
  mode: CaptureMode
  enabled: boolean
  isLoop: boolean
  isIntro: boolean
  scene: string
  hold: string
  command: string
  duration: number
  fps: number
  seed: number
}

function num(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function readCaptureConfig(): CaptureConfig {
  const params = new URLSearchParams(window.location.search)
  const capture = params.get('capture')
  const mode: CaptureMode = capture === 'loop' || capture === 'intro' ? capture : 'off'
  return {
    mode,
    enabled: mode !== 'off',
    isLoop: mode === 'loop',
    isIntro: mode === 'intro',
    scene: params.get('scene') ?? '',
    hold: params.get('hold') ?? '',
    command: (params.get('command') ?? '').toLowerCase(),
    duration: num(params.get('duration'), 15),
    fps: num(params.get('fps'), 30),
    seed: Math.max(0, Math.floor(num(params.get('seed'), 1))),
  }
}

export const CAPTURE = readCaptureConfig()

export function captureOrigin(seed: number) {
  return new Date(Date.UTC(2026, 0, 19, 6, 13, seed % 60, 0))
}
