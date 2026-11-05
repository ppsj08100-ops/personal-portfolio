// Contact bubbles retain the card's impact timing without any cave artwork.
export function createPortfolioCaveContact(section) {
  const document = section.ownerDocument
  const view = document.defaultView
  const burst = document.createElement('div')
  burst.className = 'portfolio__contact-burst'
  burst.setAttribute('aria-hidden', 'true')
  burst.hidden = true
  burst.dataset.burstCount = '0'
  burst.dataset.activeCount = '0'
  const bubbles = Array.from({ length: 6 }, () => {
    const bubble = document.createElement('i')
    bubble.className = 'portfolio__contact-bubble'
    burst.append(bubble)
    return bubble
  })
  document.body.append(burst)
  const events = new AbortController()
  const animations = new Set()
  let state = { voyage: 0, impact: 0, rise: 0, entry: 0, phase: 0, landingRect: null, scrollRange: null }
  let touched = false, generation = 0, burstCount = 0, disposed = false

  function stopBubbles() {
    generation++
    animations.forEach(animation => animation.cancel())
    animations.clear()
    burst.hidden = true
    burst.dataset.activeCount = '0'
  }

  function releaseBubbles(landing, contactY) {
    stopBubbles()
    const current = generation
    const offsets = [-.23, -.10, .05, .21, .14, -.18]
    const sizes = [6, 9, 5, 10, 7, 5]
    const rises = [58, 82, 49, 94, 72, 64]
    burst.hidden = false
    burst.dataset.burstCount = String(++burstCount)
    bubbles.forEach((bubble, index) => {
      const dx = (index % 2 ? 1 : -1) * (8 + index * 2)
      const dy = Math.min(rises[index], view.innerHeight * .14)
      bubble.style.width = bubble.style.height = `${sizes[index]}px`
      bubble.style.left = `${landing.x + landing.width * (.5 + offsets[index])}px`
      bubble.style.top = `${contactY + 3 + index % 3 * 2}px`
      const animation = bubble.animate([
        { transform: 'translate3d(0,0,0) scale(.55)', opacity: 0 },
        { transform: `translate3d(${dx * .12}px,${-dy * .12}px,0) scale(1)`, opacity: .74, offset: .14 },
        { transform: `translate3d(${dx * .64}px,${-dy * .64}px,0) scale(.94)`, opacity: .54, offset: .68 },
        { transform: `translate3d(${dx}px,${-dy}px,0) scale(.82)`, opacity: 0 },
      ], { duration: 1050 + index * 65, delay: index * 24, easing: 'ease-out', fill: 'both' })
      animations.add(animation)
      const finished = () => {
        if (current !== generation || disposed) return
        animations.delete(animation)
        animation.cancel()
        burst.dataset.activeCount = String(animations.size)
        if (!animations.size) burst.hidden = true
      }
      animation.finished.then(finished, finished)
    })
    burst.dataset.activeCount = String(animations.size)
  }

  function render() {
    if (disposed) return null
    const landing = state.landingRect
    const range = state.scrollRange
    const inDeck = range && view.scrollY >= range.start && view.scrollY <= range.end
    if (!landing) { stopBubbles(); return null }
    const pastContact = !inDeck || state.entry > .02 || state.phase > .0001
    // This is the card's bottom at its 2.4% contact dip, before the rebound.
    const contactY = landing.y + landing.height * 1.024
    if (!inDeck || state.phase > .0001 || state.entry > .12 || document.hidden) stopBubbles()
    return { landing, contactY, canBurst: !document.hidden && !pastContact && state.rise < .22 }
  }

  view.addEventListener('resize', render, { signal: events.signal })
  // Live scroll bounds also guard against late image loads or scrub catch-up.
  view.addEventListener('scroll', render, { passive: true, signal: events.signal })
  document.addEventListener('visibilitychange', render, { signal: events.signal })
  return {
    update(values) {
      state = { ...state, ...values }
      const placement = render()
      // The touch is16% of the existing impact interval; never replay while held.
      const atTouch = state.impact >= .16 || state.rise > 0
      if (atTouch && !touched && placement?.canBurst) releaseBubbles(placement.landing, placement.contactY)
      if (!atTouch && touched) stopBubbles()
      touched = atTouch
    },
    destroy() {
      disposed = true
      events.abort()
      stopBubbles()
      burst.remove()
    },
  }
}
