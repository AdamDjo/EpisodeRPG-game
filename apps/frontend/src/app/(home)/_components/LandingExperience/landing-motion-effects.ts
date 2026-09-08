import { gsap, ScrollTrigger } from '@/lib/gsap-init'

/** A fixed overlay escapes section clipping; geometry is read only at refresh. */
export function connectSharedElement(
  root: HTMLElement,
  timeline: gsap.core.Timeline,
  name: string
) {
  const source = root.querySelector<HTMLElement>(`[data-shared="${name}"]`)
  const target = root.querySelector<HTMLElement>(`[data-target="${name}"]`)
  const overlay = root.querySelector<HTMLElement>(`[data-flight="${name}"]`)
  if (!source || !target || !overlay) return () => undefined

  const travel = { progress: 0 }
  let start = { x: 0, y: 0 }
  let finish = { x: 0, y: 0 }
  const setX = gsap.quickSetter(overlay, 'x', 'px') as (value: number) => void
  const setY = gsap.quickSetter(overlay, 'y', 'px') as (value: number) => void
  const measure = () => {
    const a = source.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    start = { x: a.left + a.width / 2, y: a.top + window.scrollY + a.height / 2 }
    finish = { x: b.left + b.width / 2, y: b.top + window.scrollY + b.height / 2 }
  }
  const draw = () => {
    const p = travel.progress
    setX(start.x + (finish.x - start.x) * p)
    setY(start.y + (finish.y - start.y) * p - window.scrollY)
  }
  measure()
  gsap.set(overlay, { xPercent: -50, yPercent: -50, opacity: 0 })
  timeline
    .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.12, immediateRender: false }, 0.06)
    .to(travel, { progress: 1, duration: 0.7, ease: 'power2.inOut', onUpdate: draw }, 0.08)
    .to(overlay, { opacity: 0, duration: 0.18 }, 0.78)
  // Keep the overlay attached to the document during the final settled scrub frame too.
  const position = ScrollTrigger.create({
    trigger: target.closest('.salt-plan'),
    start: 'top bottom',
    end: 'top top',
    onUpdate: draw,
    onRefresh: () => {
      measure()
      draw()
    },
  })
  return () => {
    position.kill()
  }
}

/** Small pointer response only; no essential action depends on it. */
export function attachMagneticButtons(root: HTMLElement) {
  const cleanups: (() => void)[] = []
  root.querySelectorAll<HTMLElement>('.salt-actions .game-button').forEach((button) => {
    const x = gsap.quickTo(button, 'x', { duration: 0.4, ease: 'power3.out' })
    const y = gsap.quickTo(button, 'y', { duration: 0.4, ease: 'power3.out' })
    let rect: DOMRect | undefined
    const enter = () => {
      rect = button.getBoundingClientRect()
    }
    const move = (event: PointerEvent) => {
      if (!rect) return
      x(gsap.utils.clamp(-4, 4, (event.clientX - rect.left - rect.width / 2) * 0.035))
      y(gsap.utils.clamp(-3, 3, (event.clientY - rect.top - rect.height / 2) * 0.06))
    }
    const leave = () => {
      rect = undefined
      x(0)
      y(0)
    }
    button.addEventListener('pointerenter', enter)
    button.addEventListener('pointermove', move)
    button.addEventListener('pointerleave', leave)
    cleanups.push(() => {
      button.removeEventListener('pointerenter', enter)
      button.removeEventListener('pointermove', move)
      button.removeEventListener('pointerleave', leave)
    })
  })
  return () => cleanups.forEach((cleanup) => cleanup())
}

/** Localised living Ash. Timelines sleep offscreen and when the tab is hidden. */
export function animateLivingAsh(root: HTMLElement) {
  const records: { animation: gsap.core.Timeline; visible: boolean }[] = []
  root.querySelectorAll<HTMLElement>('.salt-ash').forEach((field) => {
    const record = { animation: gsap.timeline({ paused: true, repeat: -1 }), visible: false }
    field.querySelectorAll('i').forEach((mote, index) => {
      record.animation.fromTo(
        mote,
        { y: 18, opacity: 0 },
        {
          y: -30 - index * 3,
          x: index % 2 ? 7 : -6,
          opacity: 0.65,
          duration: 2.5 + index * 0.17,
          ease: 'sine.inOut',
          repeat: 1,
          yoyo: true,
        },
        index * 0.31
      )
    })
    records.push(record)
    ScrollTrigger.create({
      trigger: field.closest('.salt-plan'),
      start: 'top bottom',
      end: 'bottom top',
      onToggle: ({ isActive }) => {
        record.visible = isActive
        record.animation.paused(!isActive || document.hidden)
      },
    })
  })
  const visibility = () =>
    records.forEach(({ animation, visible }) => {
      animation.paused(document.hidden || !visible)
    })
  document.addEventListener('visibilitychange', visibility)
  return () => document.removeEventListener('visibilitychange', visibility)
}
