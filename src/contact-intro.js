import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const sourceEase = CustomEase.create('contact-source-ease', '.25,.1,.25,1')
const sourceEaseIn = CustomEase.create('contact-source-ease-in', '.42,0,1,1')

export function initContactIntro(section) {
  if (!section) return () => {}
  const media = gsap.matchMedia()
  const intro = section.querySelector('.contact-intro__tag-block')
  const label = section.querySelector('.contact-intro__label')
  const heading = section.querySelector('.contact-intro__heading')
  let disposed = false
  let refreshFrame

  media.add('(prefers-reduced-motion: no-preference)', () => {
    // Measured live Webflow entry: a-44, then ordinary page scrolling.
    // Height reveals the vertical gradient from its top; layout stays fixed.
    const entry = gsap.timeline({
      scrollTrigger: { id: 'contact-decoration', trigger: intro, start: 'top bottom', once: true },
    })
    entry.fromTo(section.querySelector('.contact-intro__vertical-trace'), {
      height: '0%', backgroundColor: 'rgba(244, 241, 234, .7)',
    }, { height: '100%', backgroundColor: 'rgba(244, 241, 234, 0)', duration: .8, ease: sourceEaseIn }, .1)
      // The live reference reveals the small SVG from 0 to its own size.
      // Keep the full-width divider and both line elements out of this tween.
      .fromTo(section.querySelector('.contact-intro__spark'), { scale: 0 }, { scale: 1, duration: .5, ease: sourceEase }, .75)
      // Match the source's width reveal. A transform layer can lose a line
      // thinner than one device pixel on compact screens.
      .fromTo(section.querySelector('.contact-intro__horizontal'), { width: '0%' }, { width: '100%', duration: .7, ease: sourceEaseIn }, .75)
      .fromTo(label, { opacity: 0, scale: .8, y: () => -innerWidth * .003 }, {
        opacity: 1, scale: 1, y: 0, duration: .6, ease: sourceEase,
      }, .8)
      .fromTo(label.firstElementChild, { y: () => innerWidth * .003 }, { y: 0, duration: .5, ease: sourceEase }, .9)

    gsap.fromTo(section.querySelectorAll('.contact-intro__copy > span'), { opacity: 0 }, {
      opacity: 1, duration: .8, ease: 'power1.in', stagger: .15,
      scrollTrigger: { id: 'contact-copy', trigger: section.querySelector('.contact-intro__copy'), start: 'top bottom', once: true },
    })
    gsap.fromTo(heading.querySelectorAll('.contact-intro__word'), {
      opacity: 0, scale: .95, filter: 'blur(.8vw)',
    }, {
      opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.8, ease: 'power1.inOut', stagger: { amount: .4 },
      scrollTrigger: { id: 'contact-heading', trigger: heading, start: 'top 85%', once: true },
    })
  })
  document.fonts.ready.then(() => {
    if (!disposed) refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh())
  })
  return () => {
    disposed = true
    cancelAnimationFrame(refreshFrame)
    media.revert()
  }
}
