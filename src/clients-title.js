import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initClientsTitle(section) {
  if (!section) return () => {}
  const heading = section.querySelector('.clients-title__heading')
  // Copy lives in the three HTML rows. Split by words while retaining the
  // decorative C/O runs, just as SplitType does in the reference.
  const runs = [...heading.querySelectorAll('[data-clients-run]')]
  runs.forEach(run => {
    const pieces = run.textContent.split(/(\s+)/)
    run.replaceChildren(...pieces.filter(Boolean).map(text => {
      if (/^\s+$/.test(text)) return document.createTextNode(text)
      const span = document.createElement('span')
      span.className = 'clients-title__word'
      span.textContent = text
      return span
    }))
  })
  const media = gsap.matchMedia()
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(heading.querySelectorAll('.clients-title__word'), {
      filter: 'blur(.8vw)', opacity: 0, scale: .95,
    }, {
      filter: 'blur(0px)', opacity: 1, scale: 1,
      duration: 1.8, ease: 'power1.inOut', stagger: { amount: .4 },
      scrollTrigger: {
        id: 'clients-title-entry', trigger: heading, start: 'top 85%',
        once: true,
      },
    })
  })
  return () => {
    media.revert()
    runs.forEach(run => { run.textContent = run.textContent })
  }
}
