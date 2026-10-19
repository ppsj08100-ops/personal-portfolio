import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initProjectPlanning(section) {
  if (!section) return () => {}
  const template = section.querySelector('template')
  const preview = section.querySelector('[data-lean-preview]')
  const full = section.querySelector('[data-lean-full]')
  const dialog = section.querySelector('dialog')
  const opener = section.querySelector('[data-lean-open]')
  const controller = new AbortController()
  const media = gsap.matchMedia()
  preview.replaceChildren(template.content.cloneNode(true))
  full.replaceChildren(template.content.cloneNode(true))
  const fitPreview = () => preview.style.setProperty('--lean-canvas-scale', preview.clientWidth / preview.firstElementChild.offsetWidth)
  const observer = new ResizeObserver(fitPreview)
  observer.observe(preview)
  fitPreview()

  opener.hidden = false
  opener.addEventListener('click', () => {
    dialog.showModal()
    dialog.scrollTop = 0
  }, { signal: controller.signal })
  section.querySelector('[data-lean-close]').addEventListener('click', () => dialog.close(), { signal: controller.signal })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  }, { signal: controller.signal })

  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(section.querySelectorAll('[data-planning-reveal]'),
      { y: 28, opacity: .15 },
      { y: 0, opacity: 1, stagger: .045, ease: 'none', scrollTrigger: { id: 'diptyque-planning-reveal', trigger: section, start: 'top 88%', end: 'top 18%', scrub: .4 } })
  })
  return () => {
    if (dialog.open) dialog.close()
    controller.abort()
    observer.disconnect()
    media.revert()
    preview.replaceChildren()
    full.replaceChildren()
    opener.hidden = true
  }
}
