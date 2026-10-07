import { useEffect, useRef, useState } from 'react'
import heartStill from '../../../assets/lab/cardiac-3d-lab/cardiac-3d-heart-recognition.png'
import heartMotion from '../../../assets/lab/cardiac-3d-lab/heart-motion-v6.mp4'
import { CAPTURE } from '../../../capture/config'
import { useScene } from '../../../context/SceneContext'
import './cardiac-3d-lab.css'

/**
 * Label anchors in the 1280×720 still, in units of still height from the heart's centre
 * (x) and from the still's top edge (y). Each sits just clear of the silhouette's right edge.
 */
const LANDMARKS = [
  { id: 'arch', label: 'Aortic arch', x: 0.1, y: 0.13 },
  { id: 'mid', label: 'Mid-ventricular region', x: 0.15, y: 0.38, focus: true },
  { id: 'apex', label: 'Apical region', x: 0.27, y: 0.62 },
]

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function CardiacTomographyLab() {
  const { motion } = useScene()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [osReduce, setOsReduce] = useState(prefersReducedMotion)
  const playMotion = motion === 'full' || (motion === 'auto' && !osReduce)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setOsReduce(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () => {
      if (CAPTURE.enabled || !playMotion || document.hidden) {
        video.pause()
        return
      }
      void video.play()
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [playMotion])

  return (
    <div className="ct-lab">
      {playMotion ? (
        <video
          ref={videoRef}
          className="ct-lab-still ct-lab-video"
          src={heartMotion}
          poster={heartStill}
          width={1280}
          height={720}
          autoPlay={!CAPTURE.enabled}
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Intact heart under volumetric cardiac scan, with the aortic arch above"
        />
      ) : (
        <img
          className="ct-lab-still"
          src={heartStill}
          width={1280}
          height={720}
          alt="Intact heart under volumetric cardiac scan, with the aortic arch above"
          decoding="async"
          draggable={false}
        />
      )}
      <div className="ct-lab-title">
        <span className="kicker">Cardiac tomography</span>
        <span className="ct-lab-dim">Volumetric cardiac scan</span>
      </div>
      <ol className="ct-lab-marks" aria-label="Landmarks">
        {LANDMARKS.map((m) => (
          <li
            key={m.id}
            className={m.focus ? 'is-focus' : undefined}
            style={{ ['--ct-x' as string]: m.x, ['--ct-y' as string]: m.y }}
          >
            {m.label}
          </li>
        ))}
      </ol>
      <dl className="ct-lab-status">
        <div>
          <dt>Volumetric lock</dt>
          <dd>Engaged</dd>
        </div>
        <div>
          <dt>Tracking</dt>
          <dd>Engaged</dd>
        </div>
      </dl>
      <span className="ct-lab-source">SRC NIH 3D · 3DPX-002636</span>
    </div>
  )
}
