import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createPortfolioCaveContact } from './portfolio-cave-contact.js'

gsap.registerPlugin(ScrollTrigger)
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t

// The card's contact lifts the photographs immediately into the next scene.
export function initPortfolioReveal(section) {
  const work = section?.querySelector('.portfolio__work')
  const heading = section?.querySelector('.portfolio__heading')
  const line = heading?.querySelector('.portfolio__title-line')
  const context = section?.querySelector('.portfolio__context')
  const gallery = section?.querySelector('.portfolio__gallery')
  if (!work || !heading || !line || !context || !gallery) return () => {}
  const media = gsap.matchMedia()

  media.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', () => {
    section.classList.add('is-unfolding', 'is-darkroom')
    const atmosphere = document.createElement('div')
    const light = document.createElement('div')
    atmosphere.className = 'portfolio__darkroom-atmosphere'
    light.className = 'portfolio__darkroom-light'
    for (const node of [atmosphere, light]) { node.setAttribute('aria-hidden', 'true'); work.prepend(node) }
    const cardSequence = document.querySelector('.capability-cards__sequence')
    const cave = createPortfolioCaveContact(section)
    const words = [...line.querySelectorAll('.portfolio__word')]
    const state = { progress: 0 }
    const entry = { progress: 0 }
    let approach = 0, galleryShift = 0
    let cardImpact = Number(section.dataset.cardImpact) || 0
    let cardVoyage = Number(section.dataset.cardVoyage) || 0
    let cardRise = Number(section.dataset.cardRise) || 0
    let progress = 0, scene = 0, active = false, metrics = null
    let trigger

    function landingRect() {
      const cardWidth = cardSequence?.offsetWidth || innerWidth * .30
      const cardHeight = cardSequence?.offsetHeight || innerHeight * .55
      return { x: (innerWidth - cardWidth) / 2, y: (innerHeight - cardHeight) / 2, width: cardWidth, height: cardHeight }
    }

    function positionGallery() {
      // Layout follows a centered, unwarped print. The currently rotating or
      // dragged photograph must never move the whole gallery's vertical stage.
      const anchor = metrics?.anchorRect ?? metrics?.rect
      if (!anchor) return
      const captionGap = Math.max(24, anchor.height * .08)
      gallery.style.setProperty('--cave-controls-y', `${anchor.y + anchor.height - gallery.getBoundingClientRect().top + captionGap}px`)
      if (!active) {
        galleryShift = 0
        section.style.setProperty('--darkroom-gallery-y', '0px')
        return
      }
      const currentTop = anchor.y - galleryShift
      const compact = innerWidth >= 992 && innerWidth >= innerHeight * 2
      const titleBottom = line.getBoundingClientRect().bottom
      // Match the reference's natural title → gallery flow, including the
      // centered photograph's inset within the full-size WebGL canvas.
      const photoInset = anchor.y - gallery.getBoundingClientRect().top
      const galleryMargin = Number.parseFloat(getComputedStyle(gallery).marginTop) || 0
      const titlePadding = Number.parseFloat(getComputedStyle(heading).paddingBottom) || 0
      const endTop = titleBottom + titlePadding + galleryMargin + photoInset
      const printTop = titleBottom + (innerWidth < 600 ? 48 : compact ? 24 : 38)
      const landing = landingRect()
      const contactTop = landing.y + landing.height * 1.024 + 24
      const liftTop = mix(contactTop, printTop, smooth(cardRise))
      const entryTop = cardSequence && cardRise < 1 && entry.progress < .001 ? liftTop : printTop
      galleryShift = mix(entryTop, endTop, smooth(state.progress / .72)) - currentTop
      section.style.setProperty('--darkroom-gallery-y', `${galleryShift.toFixed(3)}px`)
    }
    const frame = event => { metrics = event.detail; positionGallery() }
    section.addEventListener('portfolio:photo-frame', frame)

    function publish() {
      const phase = state.progress
      active = cardRise > 0 || entry.progress > .0001 || phase > .0001
      scene = Math.max(cardRise * .30, Math.max(0, Math.min(1, entry.progress * .30 + phase * .70)))
      const develop = smooth((scene - .43) / .43)
      progress = Math.max(cardRise * .16, smooth((scene - .18) / .82))
      const root = heading.getBoundingClientRect()
      const reading = trigger && scrollY > trigger.end
      const compact = innerWidth >= 992 && innerWidth >= innerHeight * 2
      const normalTop = Math.max(84, innerHeight * .14)
      const titleTop = compact ? Math.max(44, innerHeight * .07) : normalTop
      const readingShift = -innerHeight * .04 - (normalTop - titleTop)
      const titleShift = !active ? 0 : reading ? readingShift : titleTop - root.top
      section.style.setProperty('--portfolio-open', progress)
      section.style.setProperty('--portfolio-develop', develop)
      section.style.setProperty('--darkroom-title-y', `${titleShift.toFixed(3)}px`)
      section.style.setProperty('--portfolio-title-opacity', smooth(scene / .07))
      section.style.setProperty('--portfolio-context-opacity', smooth((phase - .25) / .25))
      section.style.setProperty('--portfolio-context-offset', `${8 * (1 - smooth((phase - .25) / .25))}px`)
      section.style.setProperty('--portfolio-gallery-opacity', Math.max(smooth(cardRise / .12), smooth((scene - .025) / .085)))
      section.style.setProperty('--darkroom-stage-top', `${-work.getBoundingClientRect().top}px`)
      const illumination = smooth((scene - .42) / .12) * (1 - smooth((scene - .86) / .14))
      section.style.setProperty('--darkroom-light-opacity', illumination)
      section.style.setProperty('--darkroom-light-x', `${mix(-44, 135, develop)}vw`)
      section.style.setProperty('--darkroom-atmosphere', smooth(scene / .09) * (1 - smooth((scene - .76) / .24)))
      const title = line.getBoundingClientRect()
      const front = mix(-title.width * .35, title.width * 1.35, develop)
      words.forEach(word => word.style.setProperty('--ink-front', `${(front - word.getBoundingClientRect().left + title.left).toFixed(2)}px`))
      section.style.setProperty('--darkroom-ink-feather', `${Math.max(72, title.width * .18)}px`)
      section.dataset.portfolioOpen = progress.toFixed(4)
      section.dataset.portfolioPhase = phase.toFixed(4)
      section.dataset.portfolioDevelop = develop.toFixed(4)
      section.dataset.portfolioReady = String(progress >= .985)
      const deck = ScrollTrigger.getById('capability-depth')
      cave.update({ impact: cardImpact, voyage: cardVoyage, rise: cardRise, entry: entry.progress, phase,
        scrollRange: deck ? { start: deck.start, end: deck.end } : null,
        landingRect: cardSequence ? landingRect() : null })
      section.dispatchEvent(new CustomEvent('portfolio:reveal', { detail: { progress, phase, develop, fishExit: approach } }))
    }

    const cardDeparted = event => {
      cardImpact = Math.max(0, Math.min(1, event.detail.progress || 0))
      cardVoyage = Math.max(0, Math.min(1, event.detail.voyage || 0))
      cardRise = Math.max(0, Math.min(1, event.detail.rise || 0))
      publish()
    }
    section.addEventListener('portfolio:card-impact', cardDeparted)
    publish()
    const motion = gsap.to(state, { progress: 1, duration: 1, ease: 'none', paused: true, onUpdate: publish })
    trigger = ScrollTrigger.create({
      id: 'portfolio-unfold', trigger: heading,
      start: () => `top ${Math.round(innerHeight * .16)}px`,
      end: () => `+=${Math.round(innerHeight * 1.15)}`,
      pin: work, pinSpacing: true, anticipatePin: 1,
      animation: motion, scrub: .65, invalidateOnRefresh: true,
      onRefresh: publish,
    })
    const incoming = ScrollTrigger.create({
      id: 'portfolio-fish-approach',
      start: () => (ScrollTrigger.getById('capability-depth')?.end ?? trigger.start) - innerHeight * .58,
      end: () => (ScrollTrigger.getById('capability-depth')?.end ?? trigger.start) - innerHeight * .03,
      onUpdate: self => { approach = self.progress; publish() },
      onRefresh: self => { approach = self.progress; publish() },
    })
    const approachMotion = gsap.to(entry, { progress: 1, duration: 1, ease: 'none', paused: true, onUpdate: publish })
    const voyage = ScrollTrigger.create({
      id: 'portfolio-darkroom-entry',
      start: () => ScrollTrigger.getById('capability-depth')?.end ?? incoming.start,
      end: () => trigger.start,
      animation: approachMotion, scrub: .55, invalidateOnRefresh: true,
      onRefresh: self => { entry.progress = self.progress; publish() },
    })
    const open = () => window.scrollTo({ top: trigger.end + 1, behavior: 'instant' })
    section.addEventListener('portfolio:open-request', open)
    return () => {
      section.removeEventListener('portfolio:open-request', open)
      section.removeEventListener('portfolio:photo-frame', frame)
      section.removeEventListener('portfolio:card-impact', cardDeparted)
      voyage.kill(); approachMotion.kill(); incoming.kill(); trigger.kill(); motion.kill()
      cave.destroy()
      atmosphere.remove(); light.remove()
      section.classList.remove('is-unfolding', 'is-darkroom')
      gallery.style.removeProperty('--cave-controls-y')
      words.forEach(word => word.style.removeProperty('--ink-front'))
      for (const property of ['--portfolio-open', '--portfolio-develop', '--darkroom-title-y', '--darkroom-gallery-y', '--portfolio-title-opacity', '--portfolio-context-opacity', '--portfolio-context-offset', '--portfolio-gallery-opacity', '--darkroom-stage-top', '--darkroom-light-opacity', '--darkroom-light-x', '--darkroom-atmosphere', '--darkroom-ink-feather']) section.style.removeProperty(property)
      delete section.dataset.portfolioOpen
      delete section.dataset.portfolioPhase
      delete section.dataset.portfolioDevelop
      delete section.dataset.portfolioReady
      section.dispatchEvent(new CustomEvent('portfolio:reveal', { detail: { progress: 1, phase: 1, develop: 1, fishExit: 1 } }))
    }
  })
  return () => media.revert()
}
