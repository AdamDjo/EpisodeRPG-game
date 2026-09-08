'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'

import { ScrollTrigger, gsap } from '@/lib/gsap-init'

// Singleton module-level : une seule instance Lenis vit à la fois (le hook n'est
// monté qu'une fois par LandingExperience). Les consommateurs hors React
// (MobileMenu, interception d'ancres) lisent l'instance active via getLenis().
// null en reduced-motion → les appelants retombent sur le scroll natif.
let activeLenis: Lenis | null = null

// Miroir du `scroll-margin-top` des `.salt-plan`.
const ANCHOR_OFFSET = -12

export function getLenis(): Lenis | null {
  return activeLenis
}

export function useLenis() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      return undefined
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (time) => 1 - Math.pow(1 - time, 3),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
      anchors: { offset: ANCHOR_OFFSET },
    })

    activeLenis = lenis

    const updateScrollTrigger = () => {
      ScrollTrigger.update()
    }

    lenis.on('scroll', updateScrollTrigger)
    // La hauteur du document bouge après le premier paint (images, polices, démo) :
    // sans ce resync Lenis garde une limite de scroll périmée et bloque le défilement.
    const resizeLenis = () => {
      lenis.resize()
    }
    ScrollTrigger.addEventListener('refresh', resizeLenis)

    const update = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(update)
      lenis.off('scroll', updateScrollTrigger)
      ScrollTrigger.removeEventListener('refresh', resizeLenis)
      lenis.destroy()
      if (activeLenis === lenis) {
        activeLenis = null
      }
    }
  }, [])
}
