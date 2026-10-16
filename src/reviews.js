import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const referenceEase = CustomEase.create('reviews-reference', '.25,.1,.25,1')
// Reference content is placeholder copy; replace this array with actual reviews.
const reviews = [
  { name: 'Omar', role: 'Hospitality Brand Manager', quote: 'Everything was delivered on time and with zero stress.', description: 'We needed a clean, elegant setup for a private dinner. The team handled everything quietly and efficiently. The space looked sharp, exactly how we imagined it — no distractions, no noise, just quality.' },
  { name: 'Layla', role: 'Event Producer', quote: 'They listen — and that shows in the result.', description: 'We had a layered concept and limited time. They didn’t overcomplicate anything. Just understood the direction, kept it clean, and delivered something that made sense visually and emotionally.' },
  { name: 'Zain', role: 'Founder, Boutique Fashion Label', quote: 'Our brand’s character came through in every detail.', description: 'The team understood our visual language from the start. Materials, colors, and proportions felt consistent with our identity. The finished space had a quiet confidence that suited the occasion beautifully.' },
  { name: 'Hana', role: 'Bride', quote: 'The celebration felt personal from beginning to end.', description: 'They took time to understand the atmosphere we wanted. Thoughtful choices brought our ideas together, and the final arrangement felt warm, considered, and completely our own.' },
  { name: 'Tarek', role: 'Creative Director, PR Agency', quote: 'A clear brief became a thoughtfully resolved space.', description: 'The proposal brought our priorities together with very little back and forth. Everything worked as a coherent whole, and our guests noticed the care behind the smallest details.' },
]

export function initReviews(section) {
  if (!section) return () => {}
  const viewport = section.querySelector('.reviews__viewport')
  const buttons = [...section.querySelectorAll('.reviews__button')]
  const status = section.querySelector('.reviews__status')
  const media = gsap.matchMedia()
  let active = 0, hasPrevious = false, locked = false, tween, tiltReturn, disposed = false
  const mod = i => (i + reviews.length) % reviews.length
  const slides = reviews.map((review, index) => {
    const slide = document.createElement('article')
    slide.className = 'reviews__slide'
    slide.dataset.reviewIndex = String(index)
    slide.hidden = true
    slide.setAttribute('role', 'group')
    slide.setAttribute('aria-roledescription', 'slide')
    slide.setAttribute('aria-label', `${index + 1} / ${reviews.length}: ${review.name}`)
    slide.innerHTML = '<div class="reviews__card"><div class="reviews__top"><div class="reviews__portrait" aria-hidden="true"></div><div class="reviews__identity"><h3 class="reviews__name"></h3><p class="reviews__role"></p></div></div><div class="reviews__bottom"><p class="reviews__number"></p><div class="reviews__copy"><blockquote class="reviews__quote"></blockquote><p class="reviews__description"></p></div></div></div>'
    for (const key of ['name', 'role', 'quote', 'description']) slide.querySelector(`.reviews__${key}`).textContent = review[key]
    slide.querySelector('.reviews__number').textContent = `( ${String(index + 1).padStart(2, '0')} )`
    return slide
  })
  const cards = slides.map(slide => slide.firstElementChild)
  const compact = () => innerWidth <= 991
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  // Reference: scale about the face center while translating upward by
  // 25% of its unscaled height. These cancel at half scale, keeping the top
  // edge fixed. Previous faces stay centered behind; none exits to the left.
  function position(slot) {
    const mounted = slides.find(slide => slide.parentElement === viewport && !slide.hidden)
    const style = getComputedStyle(mounted)
    const width = parseFloat(style.width), height = parseFloat(style.height)
    if (compact()) {
      // The reference uses a regular 500ms touch carousel below 992px.
      return { x: slot * (width + 20), y: 0, z: 0, scale: 1 }
    }
    if (slot < 0) return { x: 0, y: height * .25 * slot, z: 100 * slot, scale: Math.max(0, 1 + .5 * slot) }
    const viewWidth = viewport.getBoundingClientRect().width
    const sourceOffset = Math.max((Math.round(section.getBoundingClientRect().width) + Math.round(viewWidth)) / (2 * Math.round(viewWidth)), 1) * .75
    return { x: width * sourceOffset * slot, y: -height * .25 * slot, z: 0, scale: Math.max(0, 1 - .5 * slot) }
  }
  function layer(slot) {
    return slot === 0 ? 5 : slot === 1 ? 9999 : slot === -1 ? 4 : 3
  }
  function mount(index, slot) {
    const slide = slides[index]
    if (slide.parentElement !== viewport) {
      gsap.killTweensOf([slide, cards[index]])
      gsap.set(cards[index], { rotationX: 0, rotationY: 0, scale: 1 })
      slide.hidden = false
      viewport.append(slide)
      gsap.set(slide, { ...position(slot), opacity: 1, filter: 'blur(0px)', zIndex: layer(slot), clearProps: 'visibility' })
    }
    return slide
  }
  function retire(index) {
    const slide = slides[index]
    gsap.killTweensOf([slide, cards[index]])
    slide.hidden = true
    slide.remove()
    gsap.set(slide, { opacity: 0, filter: 'blur(0px)', clearProps: 'transform,visibility,zIndex' })
    gsap.set(cards[index], { rotationX: 0, rotationY: 0, scale: 1 })
  }
  function unlock() {
    locked = false
    section.removeAttribute('aria-busy')
    buttons.forEach(button => button.removeAttribute('aria-disabled'))
  }
  function settle(announce = false) {
    const next = mod(active + 1), previous = hasPrevious ? mod(active - 1) : null
    slides.forEach((slide, i) => {
      const slot = i === active ? 0 : i === next ? 1 : i === previous ? -1 : null
      if (slot !== null) {
        const ghost = slot === -1
        mount(i, slot)
        gsap.set(slide, { ...position(slot), opacity: 1,
          filter: 'blur(0px)', zIndex: layer(slot) })
        slide.dataset.reviewState = ghost ? 'previous' : slot === 0 ? 'active' : 'next'
      } else {
        // Only the immediately previous face is retained; older ones cannot
        // accumulate behind it or reappear through a stale animation.
        retire(i)
        slide.dataset.reviewState = 'retired'
      }
      slide.setAttribute('aria-hidden', String(i !== active))
      slide.inert = i !== active
    })
    section.dataset.activeIndex = String(active)
    if (announce) status.textContent = `${active + 1} / ${reviews.length}: ${reviews[active].name}`
    unlock()
  }
  function pulse(button) {
    const circle = button.querySelector('circle')
    gsap.killTweensOf(circle)
    gsap.fromTo(circle, { strokeDashoffset: 0, opacity: 0 }, {
      strokeDashoffset: reduced() ? 0 : -100, duration: reduced() ? .2 : .8,
      ease: 'none', keyframes: { opacity: [0, 1, 1, 0] },
      onComplete: () => gsap.set(circle, { opacity: 0 }),
    })
  }
  function change(direction, button) {
    if (locked || disposed) return
    const old = active, oldNext = mod(old + 1)
    active = mod(old + direction)
    hasPrevious = true
    pulse(button)
    if (reduced()) { settle(true); return }
    locked = true
    section.setAttribute('aria-busy', 'true')
    buttons.forEach(button => button.setAttribute('aria-disabled', 'true'))
    const future = mod(active + 1), previous = mod(active - 1)
    // The previous face grows from the measured centered half-size slot.
    // Older faces shrink to zero at that same center, then detach.
    mount(active, direction < 0 ? -1 : 1)
    mount(future, 2)
    mount(previous, -2)
    const targets = [...viewport.children].map(slide => +slide.dataset.reviewIndex)
    const targetSlot = i => i === active ? 0 : i === future ? 1 : i === previous ? -1 : i === oldNext ? 2 : -2
    const duration = compact() ? .5 : .8
    slides.forEach((slide, i) => {
      if (slide.parentElement === viewport) {
        slide.dataset.reviewState = i === active ? 'active' : i === future ? 'next' : i === previous ? 'previous' : 'retiring'
      }
    })
    if (!compact()) {
      tiltReturn?.kill()
      const movingCards = targets.map(i => cards[i])
      gsap.to(movingCards, { rotationX: -14 * direction, rotationY: 14 * direction, scale: .95, duration: 1, ease: referenceEase, overwrite: true })
      tiltReturn = gsap.delayedCall(.5, () => {
        const mountedCards = movingCards.filter(card => card.parentElement.parentElement === viewport)
        gsap.to(mountedCards, { rotationX: 0, rotationY: 0, scale: 1, duration: 1, ease: referenceEase, overwrite: true })
      })
    }
    tween = gsap.timeline({ onComplete: () => settle(true) })
    targets.forEach(i => {
      const slot = targetSlot(i)
      // Swiper transitions z-index with the same CSS ease as its transform:
      // forward incoming stays above the old face; reverse outgoing stays in
      // front as it returns to the next slot. Do not switch layers instantly.
      // Match the observed two-frame preparation before Webflow's 800ms
      // desktop transition; geometry and z-index share the same start.
      tween.to(slides[i], { ...position(slot), opacity: 1, filter: 'blur(0px)',
        zIndex: layer(slot), duration, ease: referenceEase, delay: compact() ? 0 : 1 / 30 }, 0)
    })
  }
  const next = () => change(1, buttons[1]), previous = () => change(-1, buttons[0])
  buttons[0].addEventListener('click', previous)
  buttons[1].addEventListener('click', next)
  const keydown = event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    event.key === 'ArrowRight' ? next() : previous()
  }
  section.addEventListener('keydown', keydown)
  let pointerStart = null
  const pointerDown = event => { if (compact() && !locked) { pointerStart = { x: event.clientX, y: event.clientY }; viewport.setPointerCapture(event.pointerId) } }
  const pointerUp = event => {
    if (!pointerStart) return
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y
    pointerStart = null
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? next() : previous()
  }
  const pointerCancel = () => { pointerStart = null }
  viewport.addEventListener('pointerdown', pointerDown)
  viewport.addEventListener('pointerup', pointerUp)
  viewport.addEventListener('pointercancel', pointerCancel)
  const resize = new ResizeObserver(() => { tween?.kill(); tiltReturn?.kill(); gsap.killTweensOf(cards); gsap.set(cards, { rotationX: 0, rotationY: 0, scale: 1 }); settle() })
  resize.observe(viewport)
  settle()
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const nav = section.querySelector('.reviews__navigation')
    gsap.fromTo(section.querySelector('.reviews__stage'), { opacity: 0 }, {
      opacity: 1, duration: 2, delay: 1.2, ease: referenceEase,
      scrollTrigger: { id: 'reviews-entry', trigger: viewport, start: 'top bottom', once: true },
    })
    gsap.fromTo(nav, { scale: 1.1 }, { scale: 1, duration: 2, delay: 1.2, ease: referenceEase,
      scrollTrigger: { id: 'reviews-navigation-entry', trigger: viewport, start: 'top bottom', once: true },
    })
  })
  return () => {
    disposed = true
    tween?.kill(); tiltReturn?.kill(); media.revert(); resize.disconnect()
    gsap.killTweensOf([...slides, ...cards, ...section.querySelectorAll('circle')])
    buttons[0].removeEventListener('click', previous); buttons[1].removeEventListener('click', next)
    section.removeEventListener('keydown', keydown)
    viewport.removeEventListener('pointerdown', pointerDown); viewport.removeEventListener('pointerup', pointerUp); viewport.removeEventListener('pointercancel', pointerCancel)
    slides.forEach(slide => slide.remove()); unlock()
  }
}
