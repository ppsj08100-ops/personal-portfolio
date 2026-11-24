import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createApproachEditorial } from './approach-editorial.js'

gsap.registerPlugin(ScrollTrigger)
const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const orbitAt = value => smooth((value - .22) / .22) + smooth((value - .55) / .22)

export function initDesignProcess(section) {
  if (!section) return () => {}
  const journey = section.querySelector('[data-approach-journey]')
  const stage = section.querySelector('[data-approach-stage]')
  const scenes = [...section.querySelectorAll('[data-approach-scene]')]
  if (!journey || !stage || scenes.length !== 3) return () => {}
  const centers = scenes.map(scene => scene.querySelector('.design-process__center'))
  const lines = scenes.map(scene => [...scene.querySelectorAll('[data-approach-reveal]')])
  const actions = scenes.map(scene => scene.querySelector('[data-approach-action]'))
  const buttons = [...section.querySelectorAll('[data-approach-step]')]
  const elements = [section, ...scenes, ...centers, ...lines.flat(), ...actions].filter(Boolean)
  const originals = new Map(elements.map(element => [element, {
    style: element.getAttribute('style'),
    active: element.classList.contains('is-active'),
    hidden: element.getAttribute('aria-hidden'),
    inert: element.hasAttribute('inert'),
    tabindex: element.getAttribute('tabindex'),
  }]))
  const originalButtons = buttons.map(button => button.getAttribute('aria-current'))
  const originalStep = section.getAttribute('data-active-step')
  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  const hadInViewClass = document.body.classList.contains('has-approach-gallery-in-view')
  let inViewport = false
  const inView = new IntersectionObserver(entries => {
    inViewport = entries.some(entry => entry.isIntersecting)
    document.body.classList.toggle('has-approach-gallery-in-view', inViewport)
    updateAtmosphere()
  })
  inView.observe(stage)
  let destroyed = false
  let pinned = false
  let active = -1
  let trigger
  let transition
  let nativeVisualTrigger
  let refreshFrame = 0
  let hashFrame = 0
  let pendingFocus = -1
  let drag = null
  const state = { progress: 0 }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const editorial = createApproachEditorial(section, {
    onFrame: frame => renderCopy(state.progress, frame),
  })

  function paintJourney(progress) {
    const frame = editorial.setProgress(progress)
    const orbit = reducedMotion.matches ? Math.round(orbitAt(progress)) : orbitAt(progress)
    section.dataset.approachProgress = clamp(progress).toFixed(4)
    if (!pinned && Math.round(orbit) !== active) updateSelection(Math.round(orbit))
    return frame
  }

  function updateAtmosphere() {
    if (destroyed) return
    section.style.setProperty('--approach-bubble-play', inViewport && pinned && !document.hidden ? 'running' : 'paused')
  }
  document.addEventListener('visibilitychange', updateAtmosphere, { signal })

  function restore(element, attribute, value) {
    if (value === null) element.removeAttribute(attribute)
    else element.setAttribute(attribute, value)
  }

  function updateSelection(index) {
    active = index
    section.dataset.activeStep = String(index)
    buttons.forEach(button => {
      if (Number(button.dataset.approachStep) === index) button.setAttribute('aria-current', 'step')
      else button.removeAttribute('aria-current')
    })
    scenes.forEach((scene, position) => {
      scene.classList.toggle('is-active', position === index)
      if (pinned) {
        scene.inert = position !== index
        scene.setAttribute('aria-hidden', String(position !== index))
      } else {
        scene.removeAttribute('aria-hidden')
        scene.removeAttribute('inert')
      }
    })
  }

  function render(progress) {
    if (destroyed || !pinned) return
    const value = clamp(progress)
    const frame = paintJourney(value)
    renderCopy(value, frame)
  }

  function renderCopy(progress, frame) {
    if (destroyed || !pinned) return
    const value = clamp(progress)
    const orbit = orbitAt(value)
    const index = Math.round(orbit)
    if (index !== active) {
      const focusedInOld = active >= 0 && scenes[active].contains(document.activeElement)
      const moveFocus = pendingFocus === index || (focusedInOld && pendingFocus < 0)
      // The destination receives focus after its delayed copy becomes readable.
      scenes[index].style.visibility = 'visible'
      scenes[index].inert = false
      scenes[index].removeAttribute('aria-hidden')
      if (moveFocus) pendingFocus = index
      updateSelection(index)
    }
    scenes.forEach((scene, position) => {
      const action = actions[position]
      const distance = position - orbit
      // Entrance time belongs to the creature, so the message can finish
      // appearing even when the visitor stops between scroll chapters.
      const opacity = clamp(frame?.copyWeights?.[position] ?? (position === index ? 1 : 0))
      const shift = Math.sign(distance) * (1 - opacity) * 18
      scene.style.opacity = '1'
      scene.style.visibility = position === index || opacity > .0001 ? 'visible' : 'hidden'
      scene.style.pointerEvents = position === index && opacity > .8 ? 'auto' : 'none'
      if (opacity <= .8 && centers[position].contains(document.activeElement)) {
        buttons.find(button => Number(button.dataset.approachStep) === position)?.focus({ preventScroll: true })
      }
      centers[position].style.opacity = opacity.toFixed(5)
      centers[position].style.pointerEvents = position === index && opacity > .8 ? 'auto' : 'none'
      centers[position].setAttribute('aria-hidden', String(opacity < .001))
      if (action) action.tabIndex = position === index && opacity > .8 ? 0 : -1
      for (const line of [...lines[position], action].filter(Boolean)) {
        line.style.transform = `translate3d(0, ${shift.toFixed(3)}px, 0)`
      }
      if (position === index && pendingFocus === position && opacity > .8) {
        scene.querySelector('h3')?.focus({ preventScroll: true })
        pendingFocus = -1
      }
    })
  }

  function syncProgress(progress) {
    const value = clamp(progress)
    trigger?.getTween()?.pause()
    transition?.progress(value, true)
    state.progress = value
    render(value)
  }

  function navigate(index, { focus = false, hash = false, behavior = 'smooth' } = {}) {
    if (destroyed || !scenes[index]) return
    if (hash) window.history.replaceState(window.history.state, '', '#' + scenes[index].id)
    pendingFocus = focus ? index : -1
    if (!pinned || !trigger) {
      scenes[index].scrollIntoView({ behavior: 'instant' })
      updateSelection(index)
      if (focus) scenes[index].querySelector('h3')?.focus({ preventScroll: true })
      pendingFocus = -1
      return
    }
    const target = trigger.start + (trigger.end - trigger.start) * ((index + .5) / 3)
    if (active === index && focus && Number(centers[index].style.opacity) > .8) {
      scenes[index].querySelector('h3')?.focus({ preventScroll: true })
      pendingFocus = -1
    }
    window.scrollTo({ top: target, behavior })
    if (behavior === 'instant') {
      ScrollTrigger.update()
      syncProgress((index + .5) / 3)
    }
  }

  function hashIndex() {
    let id
    try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return -1 }
    return scenes.findIndex(scene => scene.id === id)
  }

  function revealHash() {
    const index = hashIndex()
    if (index < 0 || destroyed) return
    cancelAnimationFrame(hashFrame)
    hashFrame = requestAnimationFrame(() => { hashFrame = 0; navigate(index, { behavior: 'instant' }) })
  }

  function queueRefresh() {
    if (destroyed || refreshFrame) return
    const preserved = pinned && trigger?.isActive ? trigger.progress : null
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (destroyed) return
      editorial.refresh?.()
      ScrollTrigger.refresh()
      if (preserved !== null && trigger) {
        window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * preserved, behavior: 'instant' })
        syncProgress(preserved)
      }
    })
  }

  function stopPinned() {
    trigger?.kill()
    trigger = undefined
    transition?.kill()
    gsap.killTweensOf(elements)
    pinned = false
    section.classList.remove('is-pinned')
    originals.forEach((original, element) => {
      restore(element, 'style', original.style)
      restore(element, 'tabindex', original.tabindex)
      restore(element, 'aria-hidden', original.hidden)
    })
    editorial.refresh?.()
    updateAtmosphere()
    updateSelection(Math.max(0, active))
  }

  function startPinned() {
    pinned = true
    active = -1
    section.classList.add('is-pinned')
    editorial.refresh?.()
    updateAtmosphere()
    state.progress = 0
    transition = gsap.to(state, {
      progress: 1, duration: 1, ease: 'none', paused: true,
      onUpdate: () => render(state.progress),
    })
    trigger = ScrollTrigger.create({
      id: 'design-process-pinned',
      trigger: journey,
      animation: transition,
      scrub: .28,
      start: 'top top',
      end: 'bottom bottom',
      invalidateOnRefresh: true,
      onRefresh: self => syncProgress(self.progress),
      onLeave: self => syncProgress(self.progress),
      onLeaveBack: self => syncProgress(self.progress),
    })
    syncProgress(trigger.progress)
    return stopPinned
  }

  buttons.forEach(button => button.addEventListener('click', () => navigate(Number(button.dataset.approachStep), { hash: true }), { signal }))
  section.querySelector('.design-process__pagination')?.addEventListener('keydown', event => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!direction) return
    event.preventDefault()
    const index = Math.max(0, Math.min(2, active + direction))
    buttons[index]?.focus({ preventScroll: true })
    navigate(index, { hash: true })
  }, { signal })
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
    const destination = new URL(link.href, window.location.href)
    if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname || destination.search !== window.location.search) return
    const index = scenes.findIndex(scene => '#' + scene.id === destination.hash)
    if (index < 0) return
    event.preventDefault()
    navigate(index, { focus: true, hash: true })
  }, { signal })
  window.addEventListener('hashchange', revealHash, { signal })
  window.addEventListener('popstate', revealHash, { signal })
  window.addEventListener('resize', queueRefresh, { signal, passive: true })
  // Horizontal swipes advance the collection; vertical touch scrolling remains
  // native and continues to scrub the same three-chapter timeline.
  stage.addEventListener('pointerdown', event => {
    if (!pinned || event.button !== 0 || event.target.closest('a, button, .design-process__center')) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, index: active }
  }, { signal })
  stage.addEventListener('pointerup', event => {
    const start = drag
    drag = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    navigate(Math.max(0, Math.min(2, start.index + (dx < 0 ? 1 : -1))), { hash: true })
  }, { signal })
  stage.addEventListener('pointercancel', () => { drag = null }, { signal })
  const cancelPendingFocus = () => { pendingFocus = -1 }
  window.addEventListener('wheel', cancelPendingFocus, { signal, passive: true })
  window.addEventListener('touchstart', cancelPendingFocus, { signal, passive: true })
  window.addEventListener('pointerdown', cancelPendingFocus, { signal, passive: true })
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelPendingFocus()
  }, { signal })
  section.querySelectorAll('img').forEach(image => {
    if (!image.complete) image.addEventListener('load', queueRefresh, { signal, once: true })
  })
  media.add('(prefers-reduced-motion: no-preference) and (min-width: 900px) and (min-height: 600px), (prefers-reduced-motion: no-preference) and (min-width: 360px) and (min-height: 820px)', startPinned)
  nativeVisualTrigger = ScrollTrigger.create({
    id: 'design-process-editorial-native', trigger: journey,
    start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
    onUpdate: self => { if (!pinned) paintJourney(self.progress) },
    onRefresh: self => { if (!pinned) paintJourney(self.progress) },
  })
  if (!pinned) paintJourney(nativeVisualTrigger.progress)
  if (!pinned && active < 0) updateSelection(0)
  revealHash()
  document.fonts?.ready.then(() => { if (!destroyed) queueRefresh() })
  window.addEventListener('load', queueRefresh, { signal, once: true })

  return () => {
    destroyed = true
    controller.abort()
    inView.disconnect()
    document.body.classList.toggle('has-approach-gallery-in-view', hadInViewClass)
    cancelAnimationFrame(refreshFrame)
    cancelAnimationFrame(hashFrame)
    media.revert()
    nativeVisualTrigger?.kill()
    editorial.destroy()
    stopPinned()
    originals.forEach((original, element) => {
      restore(element, 'style', original.style)
      restore(element, 'aria-hidden', original.hidden)
      restore(element, 'tabindex', original.tabindex)
      element.toggleAttribute('inert', original.inert)
      element.classList.toggle('is-active', original.active)
    })
    buttons.forEach((button, index) => restore(button, 'aria-current', originalButtons[index]))
    restore(section, 'data-active-step', originalStep)
    delete section.dataset.approachProgress
  }
}
