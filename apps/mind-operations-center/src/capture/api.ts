export type MocCaptureApi = {
  ready: boolean
  duration: number
  fps: number
  seed: number
  seek: (milliseconds: number) => Promise<void>
}

declare global {
  interface Window {
    __MOC_CAPTURE__?: MocCaptureApi
  }
}
