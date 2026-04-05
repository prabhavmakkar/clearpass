import { useRef } from 'react'
import { useInView } from 'framer-motion'
import type { Easing } from 'framer-motion'

const EASE: Easing = 'easeOut'

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(delay = 0) {
  const ref = useRef<T>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return {
    ref,
    initial: { opacity: 0, y: 30 },
    animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
    transition: { duration: 0.5, ease: EASE, delay },
  }
}
