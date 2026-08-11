import { useLayoutEffect, useRef } from 'react'
import { useMotionTemplate, useMotionValue, useScroll } from 'framer-motion'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/**
 * Scroll-linked "curve in / curve out" reveal: tilt, lift and fade are a continuous function
 * of the element's position in the viewport (not a one-shot trigger), so it curves up as it
 * arrives and curves back as it leaves. See design_handoff_landing_page/README.md for the
 * formula this ports (originally a raw scroll listener in the design prototype) — here driven
 * by framer-motion's own RAF-batched `scrollY` instead of a manual listener.
 *
 * `inDivisor` widens/narrows the arrival window — used to stagger paired elements (e.g. the
 * right-hand card in a two-card row) without timers.
 */
export function useCurveReveal<T extends HTMLElement>(inDivisor = 0.42) {
  const ref = useRef<T>(null)
  const rotateX = useMotionValue(0)
  const translateY = useMotionValue(0)
  const scale = useMotionValue(1)
  const opacity = useMotionValue(1)
  const { scrollY } = useScroll()

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function update() {
      const el = ref.current
      if (!el) return
      if (reducedMotion) {
        rotateX.set(0)
        translateY.set(0)
        scale.set(1)
        opacity.set(1)
        return
      }
      const rect = el.getBoundingClientRect()
      const p = (rect.top + rect.height / 2) / window.innerHeight
      const tIn = clamp01((0.98 - p) / inDivisor)
      const tOut = clamp01((0.24 - p) / 0.44)
      rotateX.set(11 * (1 - tIn) - 7 * tOut)
      translateY.set(64 * (1 - tIn) - 26 * tOut)
      scale.set(0.968 + 0.032 * tIn - 0.012 * tOut)
      opacity.set(clamp01(0.05 + 0.95 * tIn - 0.55 * tOut))
    }

    // Runs once synchronously before paint: an element already in view on first load settles
    // straight to its resting state (tIn = 1) instead of flashing through the hidden state.
    update()
    const unsubscribe = scrollY.on('change', update)
    window.addEventListener('resize', update)
    return () => {
      unsubscribe()
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const transform = useMotionTemplate`perspective(1400px) rotateX(${rotateX}deg) translateY(${translateY}px) scale(${scale})`

  return {
    ref,
    style: { transform, opacity, transformOrigin: '50% 100%', willChange: 'transform, opacity' },
  }
}
