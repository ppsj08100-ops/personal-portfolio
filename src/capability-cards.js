import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initAboutFish } from './about-fish.js'

gsap.registerPlugin(ScrollTrigger)

// Observed on Naya's public a-49 / e-60 continuous interaction (1440 × 936).
// These are source scroll percentages, not playback durations. Preserve the
// original approach/settling rates and the front-to-back upward departures.
const referenceCards = [
  { entry: 7, mid: 9, opaque: 10, land: 11, rotation: 9, landRotation: -1, turn: 17, turnRotation: -5, exit: 82, gone: 83 },
  { entry: 11, mid: 16, opaque: 17, land: 18, rotation: -9, landRotation: -1, turn: 21, turnRotation: 6, exit: 67, gone: 69 },
  { entry: 18, mid: 20, opaque: 21, land: 22, rotation: -9, landRotation: 0, turn: 25, turnRotation: -2, exit: 52, gone: 54 },
  { entry: 22, mid: 24, opaque: 25, land: 26, rotation: 9, landRotation: 4, turn: 37, turnRotation: 0, exit: 37, gone: 39 },
]
const sourceDuration = referenceCards[0].gone - referenceCards[0].entry
const portfolioEntry = {
  start: referenceCards[1].gone,
  fade: 3,
  contact: referenceCards[0].exit - 2,
}

export function initCapabilityCards(section) {
  if (!section) return () => {}
  const scene = section.closest('.capability-scene')
  const viewport = scene?.querySelector('.capability-scene__viewport')
  const artwork = scene?.querySelector('.capabilities')
  const background = scene?.querySelector('.capability-scene__background') || artwork
  const veil = scene?.querySelector('.capability-scene__veil')
  const header = section.querySelector('.capability-cards__header')
  const stage = section.querySelector('.capability-cards__stage')
  const steps = [...section.querySelectorAll('.capability-step')]
  const remainingCard = steps[0]?.querySelector('.capability-card')
  const portfolio = scene?.nextElementSibling?.matches('.portfolio') ? scene.nextElementSibling : null
  const star = portfolio?.querySelector('.portfolio__star')
  const portfolioIntro = portfolio?.querySelector('.portfolio__intro')
  const contents = steps.map(step => [...step.querySelectorAll('.capability-card__top, .capability-card__body')])
  const current = section.querySelector('.capability-cards__current')
  const previous = section.querySelector('.capability-cards__previous')
  const next = section.querySelector('.capability-cards__next')
  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  let trigger
  let timeline
  let activeIndex = -1
  let destroyed = false
  const readingTimes = [14, 20, 24, 31].map(percent => percent - 7)

  function prepareContact(scrollLead) {
    if (!portfolio || !star || !portfolioIntro || !remainingCard) return { align() {}, occlude() {}, revert() {} }
    const property = '--portfolio-contact-overlap'
    const original = portfolio.style.getPropertyValue(property)
    const runwayProperty = '--portfolio-contact-runway'
    const originalRunway = portfolio.style.getPropertyValue(runwayProperty)
    const maskProperty = '--portfolio-axis-occlusion'
    const originalMask = portfolio.style.getPropertyValue(maskProperty)
    portfolio.classList.add('is-contact-ready')
    function align() {
      // 01 is the final remaining card. Its rotation reaches zero at departure;
      // register the star to that lower edge without moving or resizing the card.
      const height = parseFloat(getComputedStyle(remainingCard).height)
      const inset = parseFloat(getComputedStyle(portfolioIntro).paddingTop)
      const contactBottom = innerHeight - parseFloat(getComputedStyle(stage).height) / 2 + height / 2
      const overlap = innerHeight + scrollLead() + inset - star.getBoundingClientRect().height / 2 - contactBottom
      portfolio.style.setProperty(runwayProperty, `${scrollLead()}px`)
      portfolio.style.setProperty(property, `${Math.max(0, overlap)}px`)
      occlude()
    }
    function occlude() {
      // Keep the axis behind every remaining surface. Reveal the upper stem as
      // the final surface leaves, without fading the stack or moving the star.
      const starTip = star.getBoundingClientRect().top
      const axisTop = portfolioIntro.getBoundingClientRect().top + parseFloat(getComputedStyle(portfolioIntro, '::before').top)
      let coveredBottom = axisTop
      steps.forEach(step => {
        const opacity = Number(gsap.getProperty(step, 'opacity'))
        const rect = step.getBoundingClientRect()
        if (opacity > .01 && rect.bottom > 0 && rect.top < innerHeight) {
          // A rotated corner must never hide the lower stem below the star.
          coveredBottom = Math.max(coveredBottom, Math.min(starTip, rect.bottom))
        }
      })
      portfolio.style.setProperty(maskProperty, `${Math.max(0, coveredBottom - axisTop)}px`)
    }
    align()
    return {
      align,
      occlude,
      revert() {
        portfolio.classList.remove('is-contact-ready')
        if (original) portfolio.style.setProperty(property, original)
        else portfolio.style.removeProperty(property)
        if (originalRunway) portfolio.style.setProperty(runwayProperty, originalRunway)
        else portfolio.style.removeProperty(runwayProperty)
        if (originalMask) portfolio.style.setProperty(maskProperty, originalMask)
        else portfolio.style.removeProperty(maskProperty)
      },
    }
  }

  function activate(index) {
    if (activeIndex === index) return
    activeIndex = index
    const stack = scene?.classList.contains('is-immersive')
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === index)
      step.inert = stack && i !== index
      if (stack && i !== index) {
        step.querySelectorAll('details').forEach(details => { details.open = false })
      }
    })
    if (current) current.textContent = String(Math.max(0, index) + 1).padStart(2, '0')
    // Keep focused navigation buttons in the tab order at either end.
    previous?.setAttribute('aria-disabled', String(index <= 0))
    next?.setAttribute('aria-disabled', String(index === steps.length - 1))
  }

  function navigate(index) {
    if (!trigger || !timeline) return
    const target = Math.max(0, Math.min(steps.length - 1, index))
    const top = trigger.start + readingTimes[target] / timeline.duration() * (trigger.end - trigger.start)
    window.scrollTo({ top, behavior: 'instant' })
  }

  // Tall screens share the reversible sequence, including portrait phones.
  // Short screens, reduced motion and no JS retain the readable document list.
  media.add({
    motion: '(prefers-reduced-motion: no-preference)',
    tall: '(min-height: 600px)',
    phone: '(max-width: 767px)',
    // Allow for the settled stack's six-degree rotated envelope. Keep approved
    // dimensions; a screen that cannot fit it uses the readable document list.
    fits: '(max-width: 479px) and (max-aspect-ratio: 500/487), (min-width: 480px) and (max-width: 991px) and (max-aspect-ratio: 125/99), (min-width: 992px) and (max-aspect-ratio: 500/183)',
  }, context => {
    if (!context.conditions.motion || !context.conditions.tall || !context.conditions.fits) return
    if (!scene || !viewport || !background || !veil || !steps.length) return
    scene.classList.add('is-immersive')
    const fish = initAboutFish(section)
    // The added typography precedes this deck; keep its original card pacing.
    const pixelsPerUnit = () => (innerHeight * 11 - artwork.offsetHeight) / sourceDuration
    const contactDistance = () => pixelsPerUnit() * (referenceCards[0].gone - portfolioEntry.start)
    const contact = prepareContact(contactDistance)
    gsap.set(portfolioIntro, { y: 0, autoAlpha: 0, '--portfolio-entry-y': () => `${innerHeight * .18}px` })
    const placeIntro = gsap.quickSetter(portfolioIntro, 'y', 'px')
    function holdContactPoint(self) {
      // Start the independent screen-position hold only once 01 remains. The
      // reveal offset is separate, so the group can approach the card from below.
      const distance = contactDistance()
      placeIntro(Math.max(0, Math.min(distance, self.scroll() - (self.end - distance))))
      contact.occlude()
    }
    timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    const at = percent => percent - 7
    gsap.set(veil, { opacity: 0 })
    gsap.set(header, { autoAlpha: 0, y: 8 })
    gsap.set(steps, { autoAlpha: 0 })
    steps.forEach((step, index) => gsap.set(step, {
      zIndex: index + 1,
      // Percent offsets use the card's own box; grid handles viewport centering.
      // Right / left / right / left, always ABOVE the central landing position.
      xPercent: index % 2 ? -100 : 100,
      yPercent: -50,
      x: 0, y: 0, scale: 1.1,
      rotation: referenceCards[index].rotation,
      filter: 'blur(5px)',
    }))
    contents.forEach(content => gsap.set(content, { opacity: 1 }))

    // The mirror and complete voyage have already scrolled past. Keep their
    // native sticky scenes outside this pin, preserving the card choreography.
    timeline.to(veil, { opacity: .12, duration: 4 }, at(9))
    timeline.to(header, { autoAlpha: 1, y: 0, duration: 2 }, at(9))
    timeline.to(veil, { opacity: .3, duration: 5 }, at(13))

    referenceCards.forEach((card, index) => {
      const step = steps[index]
      if (!step) return
      const side = index % 2 ? -1 : 1
      // Two continuous legs give a long diagonal approach and a gentle landing.
      // The next approach follows the preceding landing and its settling rotation.
      timeline.to(step, {
        xPercent: side * 50, yPercent: -10, duration: card.mid - card.entry,
      }, at(card.entry))
      timeline.to(step, {
        xPercent: 0, yPercent: 0, duration: card.land - card.mid,
      }, at(card.mid))
      timeline.to(step, { autoAlpha: 1, scale: 1, duration: card.opaque - card.entry }, at(card.entry))
      timeline.to(step, { filter: 'blur(0px)', rotation: card.landRotation, duration: card.land - card.entry }, at(card.entry))
      timeline.to(step, { rotation: card.turnRotation, duration: card.turn - card.land }, at(card.land))
      if (card.exit > card.turn) {
        timeline.to(step, { rotation: 0, duration: card.exit - card.turn }, at(card.turn))
      }
      if (index > 0) {
        // Hide only covered text, retaining the opaque shells and their outlines.
        timeline.to(contents[index - 1], { opacity: 0, duration: card.land - card.opaque }, at(card.opaque))
        timeline.to(contents[index - 1], { opacity: 1, duration: card.gone - card.exit }, at(card.exit))
      }
      // Move only this foreground card. Underlying cards stay in the stack until
      // their own turn; no scale, opacity or shared-parent exit animation.
      timeline.to(step, {
        yPercent: () => -Math.max(170, ((stage.clientHeight + step.offsetHeight) / 2 + 2) / step.offsetHeight * 100),
        rotation: 0, duration: card.gone - card.exit,
      }, at(card.exit))
      if (context.conditions.phone) {
        // On a narrow screen the rising card crosses the navigation. Retire the
        // whole header before that crossing, then restore it after the card clears.
        timeline.to(header, { autoAlpha: 0, duration: .25 }, at(card.exit))
        if (index > 0) timeline.to(header, { autoAlpha: 1, duration: .25 }, at(card.gone))
      }
    })
    if (!context.conditions.phone) timeline.to(header, { autoAlpha: 0, duration: 2 }, at(81))
    // One entry group controls both lines, the star and the label. Nothing is
    // exposed while 02 or any higher card remains in the stack.
    timeline.fromTo(portfolioIntro, { autoAlpha: 0 }, {
      autoAlpha: 1, duration: portfolioEntry.fade, immediateRender: false,
    }, at(portfolioEntry.start))
    timeline.fromTo(portfolioIntro, {
      '--portfolio-entry-y': () => `${innerHeight * .18}px`,
    }, {
      '--portfolio-entry-y': '0px', duration: portfolioEntry.contact - portfolioEntry.start,
      immediateRender: false,
    }, at(portfolioEntry.start))
    // Derive input state from the same reversible sequence as card transforms.
    function syncState() {
      const percent = timeline.time() + 7
      let index = -1
      referenceCards.forEach((card, i) => {
        if (percent >= card.land && percent < card.gone) index = i
      })
      activate(index)
      header.inert = percent < 11 || percent >= referenceCards[0].exit ||
        (context.conditions.phone && referenceCards.some(card => percent >= card.exit && percent < card.gone + .25))
      background.inert = percent > 7.2
      contact.occlude()
      fish.render((percent - 7) / sourceDuration)
    }
    timeline.eventCallback('onUpdate', syncState)
    trigger = ScrollTrigger.create({
      id: 'capability-depth', trigger: viewport,
      // Pin the deck only after the project has finished its own sticky scene.
      // Keep the existing pixels per timeline unit and card departure timing.
      start: 'bottom bottom',
      end: () => `+=${pixelsPerUnit() * timeline.duration()}`,
      pin: viewport, pinSpacing: true, anticipatePin: 1,
      animation: timeline, scrub: .35, invalidateOnRefresh: true,
      onRefreshInit: () => { contact.align(); fish.measure() },
      onUpdate: holdContactPoint,
      onRefresh: self => { holdContactPoint(self); fish.measure() },
    })
    activeIndex = -2
    syncState()
    return () => {
      trigger = undefined
      timeline = undefined
      scene.classList.remove('is-immersive')
      fish.destroy()
      contact.revert()
      background.inert = false
      header.inert = false
      activeIndex = -2
      activate(0)
      steps.forEach(step => { step.inert = false })
    }
  })

  previous?.addEventListener('click', () => navigate(activeIndex - 1), { signal })
  next?.addEventListener('click', () => navigate(activeIndex + 1), { signal })
  section.addEventListener('keydown', event => {
    if (!trigger || event.target.closest('summary, .capability-card__expanded, .capability-card__qa')) return
    const target = { ArrowRight: activeIndex + 1, ArrowLeft: activeIndex - 1, Home: 0, End: steps.length - 1 }[event.key]
    if (target === undefined) return
    event.preventDefault()
    navigate(target)
  }, { signal })
  steps.forEach(step => {
    // ABOUT uses explicit question controls; its blank card surface is not a toggle.
    if (step.querySelector('.capability-card__qa')) return
    const details = step.querySelector('details')
    if (!details) return
    step.addEventListener('click', event => {
      if (event.target.closest('summary, .capability-card__expanded') || getSelection()?.toString()) return
      details.open = !details.open
    }, { signal })
  })
  document.fonts.ready.then(() => { if (!destroyed) ScrollTrigger.refresh() })
  const image = artwork?.querySelector('img')
  // A lazy image can finish loading during the HERO's native smooth scroll.
  // Defer measurement until scrolling settles so it cannot interrupt the dive.
  image?.addEventListener('load', () => ScrollTrigger.refresh(true), { once: true, signal })

  return () => {
    destroyed = true
    controller.abort()
    media.revert()
    steps.forEach(step => { step.inert = false; step.classList.remove('is-active') })
  }
}
