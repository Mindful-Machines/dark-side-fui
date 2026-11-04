/** 39A.B warning clock. Change these to retimes the modal without rewriting the motion. */
export const OVERFLOW_PULSE_MS = 800
export const OVERFLOW_ALERT_MS = OVERFLOW_PULSE_MS * 6
export const OVERFLOW_DISMISS_MS = 480
/** SFX cutoff: the modal has finished leaving at this elapsed time. */
export const OVERFLOW_MODAL_GONE_MS = OVERFLOW_ALERT_MS + OVERFLOW_DISMISS_MS
export const OVERFLOW_CYCLE_MS = 16_000
