'use client'

import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap-init'

import {
  animateLivingAsh,
  attachMagneticButtons,
  connectSharedElement,
} from './landing-motion-effects'

import type { RefObject } from 'react'

/** The camera moves; essential text never fades out or waits for scrub progress. */
export function useLandingMotion(root: RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const element = root.current
      if (!element) return
      const media = gsap.matchMedia()
      let mounted = true
      let refreshFrame = 0
      const requestRefresh = () => {
        if (!mounted || refreshFrame) return
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = 0
          if (mounted) ScrollTrigger.refresh()
        })
      }

      media.add(
        {
          desktop: '(min-width: 1121px) and (min-height: 700px)',
          flow: '(max-width: 1120px), (max-height: 699px)',
          reduce: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          if (context.conditions?.reduce) return
          const plans = gsap.utils.toArray<HTMLElement>('.salt-plan', element)
          const cleanups: (() => void)[] = []
          // A small lift follows reading order and is equally safe on reverse scroll.
          plans.slice(1).forEach((plan) => {
            gsap.from(plan.querySelector('.salt-copy'), {
              y: 18,
              duration: 0.7,
              ease: 'power3.out',
              scrollTrigger: { trigger: plan, start: 'top 92%', once: true },
            })
          })
          if (!context.conditions?.desktop) return
          cleanups.push(animateLivingAsh(element))

          const hero = gsap.timeline({
            scrollTrigger: {
              id: 'salt-threshold',
              trigger: '#velkhar',
              start: 'top top',
              end: '+=22%',
              pin: true,
              scrub: 0.45,
              invalidateOnRefresh: true,
            },
          })
          hero
            .to('.salt-seuil .salt-art', { scale: 1.045, yPercent: -1.5, ease: 'none' }, 0)
            .to('.salt-depth', { scaleX: 1.12, yPercent: -3, ease: 'none' }, 0)
            .to('.salt-seuil .salt-copy', { y: -12, ease: 'none' }, 0)

          const raccord = (selector: string) =>
            gsap.timeline({
              scrollTrigger: {
                trigger: selector,
                start: 'top 95%',
                end: 'top 10%',
                scrub: 0.55,
                invalidateOnRefresh: true,
                onLeave: (self) => {
                  self.getTween()?.progress(1)
                },
                onLeaveBack: (self) => {
                  self.getTween()?.progress(1)
                },
              },
            })

          const contract = raccord('#contrat')
          contract
            .to('.salt-seuil .salt-copy', { x: -24, duration: 0.8 }, 0)
            .fromTo(
              '.salt-seuil .salt-door',
              { opacity: 0, clipPath: 'inset(0 48%)' },
              {
                opacity: 0.92,
                clipPath: 'inset(0 0)',
                duration: 0.8,
              },
              0
            )
            .from('.salt-contrat .salt-art', { yPercent: 5, scale: 1.04, duration: 1 }, 0)
          cleanups.push(connectSharedElement(element, contract, 'seal'))

          const game = raccord('#gameplay')
          game
            .fromTo(
              '.salt-paper',
              { opacity: 0, rotate: 16 },
              {
                opacity: 0.85,
                rotate: 0,
                xPercent: 42,
                yPercent: 58,
                scaleX: 0.9,
                duration: 0.5,
              },
              0
            )
            .to('.salt-paper', { opacity: 0, duration: 0.3 }, 0.5)
            .to('.salt-contrat .salt-art', { yPercent: -4, duration: 0.8 }, 0)
            .from('.salt-demo__location', { y: -7, duration: 0.25 }, 0.45)
            .from(
              '.salt-demo__reader > h3, .salt-demo__reader > p',
              { y: 12, stagger: 0.08, duration: 0.35 },
              0.48
            )

          const survival = raccord('#survie')
          survival
            .to('.salt-demo .salt-art', { scale: 1.08, xPercent: 3, duration: 0.9 }, 0)
            .to('.salt-demo .salt-hud', { y: 20, duration: 0.9 }, 0)
            .from('.salt-survie .salt-art', { scale: 1.065, yPercent: 4, duration: 0.9 }, 0)
            .fromTo(
              '.salt-survie .stat-bar__fill',
              { scaleX: 1 },
              {
                scaleX: 0.78,
                transformOrigin: 'left',
                yoyo: true,
                repeat: 1,
                duration: 0.18,
              },
              0.5
            )

          const legacy = raccord('#world')
          legacy
            .to('.salt-wipe', { scaleX: 1, stagger: 0.08, duration: 0.6 }, 0)
            .from('.salt-heritage .salt-art', { yPercent: 4, scale: 1.04, duration: 0.9 }, 0)
            .from('.salt-times i', { scaleX: 0, transformOrigin: 'left', duration: 0.65 }, 0.25)
            .from('.salt-times div', { y: 10, stagger: 0.1, duration: 0.25 }, 0.35)
          cleanups.push(connectSharedElement(element, legacy, 'relic'))

          const inn = raccord('#outro')
          inn
            .fromTo(
              '.salt-heritage .salt-door',
              { opacity: 0, clipPath: 'inset(24% 5% 0 80%)' },
              {
                opacity: 1,
                clipPath: 'inset(0)',
                duration: 0.8,
              },
              0
            )
            .fromTo(
              '.salt-values i',
              { opacity: 0.85 },
              { opacity: 0, stagger: 0.1, duration: 0.45 },
              0.15
            )
            .from('.salt-auberge .salt-art', { scale: 1.035, duration: 0.85 }, 0)
            .from('.salt-auberge .salt-actions', { y: 12, duration: 0.2 }, 0.8)
          cleanups.push(connectSharedElement(element, inn, 'reliquary'))

          plans.forEach((plan) => {
            const art = plan.querySelector<HTMLElement>('.salt-art')
            if (!art) return
            ScrollTrigger.create({
              trigger: plan,
              start: 'top bottom',
              end: 'bottom top',
              onToggle: ({ isActive }) => {
                art.style.willChange = isActive ? 'transform' : 'auto'
              },
            })
          })
          return () => {
            cleanups.forEach((cleanup) => cleanup())
            element.querySelectorAll<HTMLElement>('.salt-art').forEach((art) => {
              art.style.willChange = ''
            })
          }
        }
      )
      media.add(
        '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
        () => attachMagneticButtons(element)
      )

      const decode = async (image: HTMLImageElement) => {
        try {
          await image.decode()
        } catch {
          /* Missing art never blocks reading. */
        }
        requestRefresh()
      }
      const images = Array.from(element.querySelectorAll('img'))
      const onLoad = (event: Event) => {
        void decode(event.currentTarget as HTMLImageElement)
      }
      images.forEach((image) => {
        if (image.complete) void decode(image)
        else image.addEventListener('load', onLoad)
      })
      const fonts = async () => {
        await document.fonts.ready
        requestRefresh()
      }
      void fonts()
      // Demo explanations and translated copy can change height after initial measurement.
      const resize = new ResizeObserver(requestRefresh)
      element.querySelectorAll('.salt-demo, .salt-copy').forEach((node) => resize.observe(node))
      return () => {
        mounted = false
        cancelAnimationFrame(refreshFrame)
        resize.disconnect()
        images.forEach((image) => image.removeEventListener('load', onLoad))
        media.revert()
      }
    },
    { scope: root }
  )
}
