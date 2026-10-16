import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const sourceEase = CustomEase.create('benefits-source-ease', '.25,.1,.25,1')
const sourceEaseIn = CustomEase.create('benefits-source-ease-in', '.42,0,1,1')

export function initBenefits(section) {
  if (!section) return () => {}
  const lines = [...section.querySelectorAll('.benefits__line')]
  const uiCopy = [section.querySelector('.benefits__label-copy'), section.querySelector('.benefits__eyebrow-copy')]
  const media = gsap.matchMedia()
  let disposed = false
  let refreshFrame
  // Preserve measured glyph widths and staggered line starts with the local font.
  function fitHeading() {
    const compact = innerWidth <= 991
    const titleWidths = compact ? [61.57, 71.62, 60.8, 26.2] : [27.897, 32.453, 27.5, 11.8]
    section.querySelectorAll('.benefits__reason-title > span').forEach((line, index) => {
      line.style.transform = `scaleX(${innerWidth * titleWidths[index] / 100 / line.offsetWidth})`
    })
    section.querySelectorAll('.benefits__description').forEach(paragraph => {
      const spans = [...paragraph.children]
      const scale = innerWidth * .215 / Math.max(...spans.map(line => line.offsetWidth))
      spans.forEach(line => { line.style.transform = compact ? '' : `scaleX(${scale})` })
    })
    const widths = compact ? [.7093, .5583, .2831] : [.4857, .38235, .1939]
    lines.forEach((line, index) => {
      line.style.transform = `scaleX(${innerWidth * widths[index] / parseFloat(getComputedStyle(line).width)})`
    })
    const uiWidths = compact ? [.14992, .46518] : [.03419, .10611]
    uiCopy.forEach((copy, index) => {
      copy.style.transform = `scaleX(${innerWidth * uiWidths[index] / parseFloat(getComputedStyle(copy).width)})`
    })
  }
  const resize = new ResizeObserver(fitHeading)
  resize.observe(section)
  fitHeading()
  document.fonts.ready.then(() => {
    if (!disposed) {
      fitHeading()
      // The gallery has now selected its desktop/compact renderer. Refresh
      // after that flow change and the card pin's initial spacing have settled.
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh())
    }
  })

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const intro = section.querySelector('.benefits__intro')
    const axis = section.querySelector('.benefits__axis-draw')
    const rule = section.querySelector('.benefits__rule')
    const star = section.querySelector('.benefits__star')
    const label = section.querySelector('.benefits__label')
    const labelText = label.firstElementChild
    // The live reference draws once on viewport entry, then all elements move
    // with ordinary page scroll. No pin, parallax, bounce, or replay on return.
    const decoration = gsap.timeline({ scrollTrigger: { id: 'benefits-decoration', trigger: intro, start: 'top bottom', once: true } })
    decoration.fromTo(axis, { scaleY: 0 }, { scaleY: 1, duration: .8, ease: sourceEaseIn }, .1)
      .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: .7, ease: sourceEaseIn }, .75)
      .fromTo(star, { scale: 0 }, { scale: 1, duration: .5, ease: sourceEase }, .75)
      .fromTo(label, { opacity: 0, scale: .8, y: () => -innerWidth * .003 }, { opacity: 1, scale: 1, y: 0, duration: .6, ease: sourceEase }, .8)
      .fromTo(labelText, { y: () => innerWidth * .003 }, { y: 0, duration: .5, ease: sourceEase }, .9)
    gsap.fromTo(section.querySelector('.benefits__eyebrow'), { opacity: 0 }, {
      opacity: 1, duration: 1, ease: 'power3.out',
      scrollTrigger: { id: 'benefits-eyebrow', trigger: section.querySelector('.benefits__eyebrow'), start: 'top 85%', once: true },
    })
    gsap.fromTo(section.querySelector('.benefits__art-entry'), { opacity: 0 }, {
      opacity: 1, duration: 1.8, ease: 'power1.inOut',
      scrollTrigger: { id: 'benefits-art', trigger: section.querySelector('.benefits__visual'), start: 'top 85%', once: true },
    })
    section.querySelectorAll('.benefits__reason').forEach((reason, index) => {
      gsap.fromTo(reason, { opacity: 0 }, {
        opacity: 1, duration: 1, ease: sourceEase,
        scrollTrigger: { id: `benefits-reason-${index}`, trigger: reason, start: 'top 90%', once: true },
      })
    })
    section.querySelectorAll('.benefits__description').forEach((paragraph, index) => {
      gsap.fromTo(paragraph.children, { opacity: 0 }, {
        opacity: 1, duration: .8, ease: 'power1.in', stagger: .15,
        scrollTrigger: { id: `benefits-description-${index}`, trigger: paragraph, start: 'top 100%', once: true },
      })
    })
    const words = section.querySelectorAll('.benefits__word')
    gsap.set(words, { opacity: 0, scale: .95, filter: 'blur(.8vw)' })
    gsap.to(words, {
      opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.8, ease: 'power1.inOut', stagger: { amount: .4 },
      scrollTrigger: { id: 'benefits-heading', trigger: section.querySelector('.benefits__heading'), start: 'top 85%', once: true },
    })
  })
  return () => {
    disposed = true
    cancelAnimationFrame(refreshFrame)
    resize.disconnect()
    media.revert()
    lines.concat(uiCopy, [...section.querySelectorAll('.benefits__reason-title > span, .benefits__description > span')]).forEach(line => line.style.removeProperty('transform'))
  }
}
