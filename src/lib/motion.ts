/**
 * Motion for the Harbour theme.
 *
 * - Lenis smooths wheel/trackpad scroll (the app's content column, or the window on the homepage).
 * - GSAP drives the per-route entrance: the page title splits into rising letters, sections
 *   follow, and cards/rows reveal as they scroll into view (ScrollTrigger, played once).
 *
 * Everything is skipped under prefers-reduced-motion. Transforms are cleared after each reveal
 * so CSS hover lifts keep working.
 */
import { useEffect, useLayoutEffect, type RefObject } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Overlays that scroll on their own: wheel events inside them must not move the page behind. */
const OWN_SCROLL = '.modal-card, .panel-card, .more-sheet, .profile-menu, [data-lenis-prevent]'

let appLenis: Lenis | null = null

/** The Lenis instance driving the app column, if any (used to reset scroll on route change). */
export const getAppLenis = () => appLenis

/**
 * Smooth scroll. Pass the scrolling element + its content wrapper for the app column,
 * or nothing for the window (homepage).
 */
export function useSmoothScroll(wrapper?: RefObject<HTMLElement | null>, content?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (reducedMotion()) return
    const w = wrapper?.current ?? undefined
    const lenis = new Lenis({
      wrapper: w ?? window,
      content: content?.current ?? (w ? undefined : document.documentElement),
      lerp: 0.11,
      anchors: !w,
      wheelMultiplier: 0.95,
      prevent: (node: HTMLElement) => !!node.closest?.(OWN_SCROLL),
    })
    if (w) appLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (appLenis === lenis) appLenis = null
    }
  }, [wrapper, content])
}

const CARD_SEL = '.card, .txn-row, .rec-row, .legend-row'

/**
 * Entrance for one route stage. Call from a component that mounts with each page.
 * `scroller` is the app's scrolling column.
 */
export function useRouteMotion(stage: RefObject<HTMLElement | null>, scroller: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = stage.current
    if (!root || reducedMotion()) return
    const ctx = gsap.context(() => {
      const page = root.querySelector<HTMLElement>('.page')
      if (!page) return
      const title = page.querySelector<HTMLElement>('.page-title')
      // Cards and rows below the fold wait for the scroll; everything else enters now.
      const items = gsap.utils.toArray<HTMLElement>(page.querySelectorAll(CARD_SEL))
      const fold = (scroller.current?.clientHeight ?? window.innerHeight) * 0.92
      const later = items.filter((el) => el.getBoundingClientRect().top > fold)
      const sections = (Array.from(page.children) as HTMLElement[]).filter((el) => !later.includes(el))
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

      if (title) {
        const split = SplitText.create(title, { type: 'words,chars', mask: 'words' })
        tl.from(split.chars, { yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.022 }, 0.05)
      }
      tl.from(sections, { y: 34, autoAlpha: 0, duration: 0.9, stagger: 0.07, clearProps: 'transform,opacity,visibility' }, 0.12)

      if (later.length) {
        gsap.set(later, { y: 46, autoAlpha: 0 })
        ScrollTrigger.batch(later, {
          scroller: scroller.current ?? undefined,
          start: 'top 94%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity,visibility' }),
        })
      }
    }, root)
    return () => ctx.revert()
  }, [stage, scroller])
}
