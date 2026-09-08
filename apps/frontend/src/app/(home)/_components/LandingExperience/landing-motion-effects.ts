import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap-init'

const LINE_CLASS = 'salt-line'
const MOTION_CLASS = 'salt-landing--motion'
/** The opening never waits longer than this for art and fonts. */
const ENTRANCE_WAIT_MS = 700
/** Resting zoom of every plate; it gives the scroll parallax room inside the clipped art. */
export const PLATE_SCALE = 1.1

const noop = () => undefined

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const decode = async (image: HTMLImageElement | null) => {
  try {
    await image?.decode()
  } catch {
    /* Missing art never blocks the opening. */
  }
}

/** Masked line split; the heading keeps its accessible name and stays selectable. */
function splitLines(heading: HTMLElement, onSplit: (self: SplitText) => void) {
  return SplitText.create(heading, {
    type: 'lines',
    mask: 'lines',
    linesClass: LINE_CLASS,
    autoSplit: true,
    onSplit,
  })
}

/**
 * Cinematic opening. The LCP plate is never hidden: it settles from a slight zoom while the
 * copy rises line by line. CSS hides the copy until the class lands, so nothing flashes.
 */
export function playHeroEntrance(root: HTMLElement) {
  const hero = root.querySelector<HTMLElement>('.salt-seuil')
  const title = hero?.querySelector<HTMLElement>('h1')
  if (!hero || !title) return noop
  const image = hero.querySelector<HTMLImageElement>('.salt-art img')
  const eyebrow = hero.querySelector<HTMLElement>('.salt-eyebrow')
  const body = hero.querySelector<HTMLElement>('.salt-copy > p:not(.salt-eyebrow)')
  const actions = hero.querySelectorAll<HTMLElement>('.salt-actions > *')
  const depth = hero.querySelector<HTMLElement>('.salt-depth')
  const scroll = hero.querySelector<HTMLElement>('.salt-scroll')
  const nav = root.querySelector<HTMLElement>('.main-navigation--marketing')
  root.classList.add(MOTION_CLASS)

  let mounted = true
  let split: SplitText | undefined
  const timeline = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
  if (image) {
    timeline.fromTo(
      image,
      { scale: PLATE_SCALE + 0.12 },
      { scale: PLATE_SCALE, duration: 2.6, ease: 'power2.out' },
      0
    )
  }
  if (depth)
    timeline.fromTo(depth, { opacity: 0 }, { opacity: 1, duration: 2, ease: 'power1.out' }, 0)
  if (eyebrow)
    timeline.fromTo(eyebrow, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.25)
  if (body)
    timeline.fromTo(body, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.8)
  if (actions.length) {
    timeline.fromTo(
      actions,
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 },
      1
    )
  }
  if (nav)
    timeline.fromTo(nav, { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.7)
  if (scroll)
    timeline.fromTo(scroll, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 1 }, 1.3)

  const start = async () => {
    await Promise.race([Promise.all([decode(image), document.fonts.ready]), wait(ENTRANCE_WAIT_MS)])
    if (!mounted) return
    let lines: gsap.core.Tween | undefined
    split = splitLines(title, (self) => {
      gsap.set(title, { autoAlpha: 1, y: 0 })
      // A re-split (fonts, resize) after the opening started leaves the title at rest.
      if (timeline.progress() > 0) return
      lines?.kill()
      lines = gsap.from(self.lines, {
        yPercent: 108,
        duration: 1.4,
        stagger: 0.1,
        ease: 'expo.out',
      })
      timeline.add(lines, 0.35)
    })
    timeline.play()
  }
  void start()

  return () => {
    mounted = false
    timeline.kill()
    split?.revert()
    root.classList.remove(MOTION_CLASS)
  }
}

/** Reading-order reveal: masked heading lines, then the rest of the copy. Once, never back out. */
export function revealPlanCopy(plan: HTMLElement) {
  const copy = plan.querySelector<HTMLElement>('.salt-copy')
  if (!copy) return noop
  const heading = copy.querySelector<HTMLElement>('h2')
  const rest = Array.from(copy.children).filter((child) => child !== heading)
  const timeline = gsap.timeline({
    defaults: { ease: 'expo.out' },
    scrollTrigger: { trigger: plan, start: 'top 72%', once: true },
  })
  timeline.from(rest, { autoAlpha: 0, y: 26, duration: 1.1, stagger: 0.09 }, 0.15)

  let lines: gsap.core.Tween | undefined
  const split = heading
    ? splitLines(heading, (self) => {
        // After the reveal has started, a re-split leaves the heading at rest.
        if (timeline.progress() > 0) return
        lines?.kill()
        lines = gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.2,
          stagger: 0.09,
          ease: 'expo.out',
        })
        timeline.add(lines, 0)
      })
    : undefined
  return () => {
    timeline.kill()
    split?.revert()
  }
}

/** Each plate drifts against the scroll inside its clipped frame. Scrubbed, transform only. */
export function attachPlateParallax(root: HTMLElement, amount: number) {
  root.querySelectorAll<HTMLElement>('.salt-plan').forEach((plan) => {
    const image = plan.querySelector<HTMLElement>('.salt-art img')
    if (!image) return
    gsap.fromTo(
      image,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: {
          trigger: plan,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      }
    )
  })
}

/** Pointer drift on the threshold plate only; the copy stays still so reading is unaffected. */
export function attachPointerParallax(root: HTMLElement) {
  const hero = root.querySelector<HTMLElement>('.salt-seuil')
  const image = hero?.querySelector<HTMLElement>('.salt-art img')
  if (!hero || !image) return noop
  const x = gsap.quickTo(image, 'x', { duration: 1.4, ease: 'power3.out' })
  const y = gsap.quickTo(image, 'y', { duration: 1.4, ease: 'power3.out' })
  const move = (event: PointerEvent) => {
    x((event.clientX / window.innerWidth - 0.5) * -18)
    y((event.clientY / window.innerHeight - 0.5) * -12)
  }
  const leave = () => {
    x(0)
    y(0)
  }
  hero.addEventListener('pointermove', move, { passive: true })
  hero.addEventListener('pointerleave', leave)
  return () => {
    hero.removeEventListener('pointermove', move)
    hero.removeEventListener('pointerleave', leave)
  }
}

/** Gold hairline tracking the reading position. */
export function attachScrollProgress(root: HTMLElement) {
  const bar = root.querySelector<HTMLElement>('.salt-progress')
  if (!bar) return noop
  const tween = gsap.fromTo(
    bar,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    }
  )
  return () => {
    tween.kill()
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
