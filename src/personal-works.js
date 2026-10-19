import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initPersonalWorks(section) {
  if (!section) return () => {}
  const media = gsap.matchMedia()

  media.add('(prefers-reduced-motion: no-preference)', () => {
    section.querySelectorAll('[data-personal-reveal]').forEach(block => {
      gsap.from(block, {
        y: 24,
        autoAlpha: 0,
        duration: .9,
        ease: 'power2.out',
        scrollTrigger: { trigger: block, start: 'top 92%', once: true },
      })
    })
  })

  return () => media.revert()
}
