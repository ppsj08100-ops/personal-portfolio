import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { initApproachCardWater } from './approach-card-water.js'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const ease = CustomEase.create('approach-pinned', '.6,0,.2,1')
const clamp = value => Math.max(0, Math.min(1, value))

export function initDesignProcess(section) {
  if (!section) return () => {}
  const journey = section.querySelector('[data-approach-journey]')
  const stage = section.querySelector('[data-approach-stage]')
  const scenes = [...section.querySelectorAll('[data-approach-scene]')]
  if (!journey || !stage || scenes.length !== 3) return () => {}
  const objects = scenes.map(scene => [...scene.querySelectorAll('[data-approach-object]')])
  const centers = scenes.map(scene => scene.querySelector('.design-process__center'))
  const lines = scenes.map(scene => [...scene.querySelectorAll('[data-approach-reveal]')])
  const actions = scenes.map(scene => scene.querySelector('[data-approach-action]'))
  const buttons = [...section.querySelectorAll('[data-approach-step]')]
  const counter = section.querySelector('[data-approach-counter]')
  const elements = [section, ...scenes, ...centers, ...objects.flat(), ...lines.flat(), ...actions]
  const originals = new Map(elements.map(element => [element, {
    style: element.getAttribute('style'),
    active: element.classList.contains('is-active'),
    hidden: element.getAttribute('aria-hidden'),
    inert: element.hasAttribute('inert'),
  }]))
  const originalButtons = buttons.map(button => button.getAttribute('aria-current'))
  const originalStep = section.getAttribute('data-active-step')
  const originalCounter = counter?.textContent
  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  const destroyCardWater = initApproachCardWater(section)
  let destroyed = false
  let pinned = false
  let active = -1
  let trigger
  let transition
  let refreshFrame = 0
  let hashFrame = 0
  let pendingFocus = -1

  function restore(element, attribute, value) {
    if (value === null) element.removeAttribute(attribute)
    else element.setAttribute(attribute, value)
  }

  function pose(side, hidden = false, index = 0) {
    const width = window.innerWidth
    const mobile = width <= 899
    const resting = width <= 360 ? .40 : width <= 520 ? .37 : mobile ? .30 : -.01
    const angle = mobile ? 10 : [[13, 11], [20, 14], [9, 17]][index][side]
    return { x: width * (hidden ? mobile ? 1.05 : .5 : resting) * (side ? 1 : -1), y: 0, yPercent: -50, rotation: (side ? 1 : -1) * (hidden ? 22 : angle) }
  }

  function updateSelection(index) {
    active = index
    section.dataset.activeStep = String(index)
    if (counter) counter.textContent = String(index + 1).padStart(2, '0')
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

  function settle(index) {
    scenes.forEach((scene, position) => gsap.set(scene, { autoAlpha: position === index ? 1 : 0 }))
    centers.forEach((center, position) => gsap.set(center, { opacity: position === index ? 1 : 0 }))
    objects[index].forEach((object, side) => gsap.set(object, pose(side, false, index)))
    gsap.set(lines[index], { yPercent: 0 })
    gsap.set(actions[index], { yPercent: 0, opacity: 1 })
  }

  function show(index, { immediate = false, entrance = false } = {}) {
    if (destroyed || !pinned || (index === active && !immediate && !entrance)) return
    const previous = active
    const focusedInOld = previous >= 0 && previous !== index && scenes[previous].contains(document.activeElement)
    const moveFocus = pendingFocus === index || (focusedInOld && pendingFocus < 0)
    transition?.kill()
    // Move focus before hiding the old state; shared navigation never unmounts.
    scenes[index].inert = false
    scenes[index].removeAttribute('aria-hidden')
    gsap.set(scenes[index], { autoAlpha: 1 })
    if (moveFocus) {
      scenes[index].querySelector('h3')?.focus({ preventScroll: true })
      pendingFocus = -1
    }
    updateSelection(index)
    if (immediate || (previous >= 0 && Math.abs(index - previous) > 1)) { settle(index); return }
    scenes.forEach((scene, position) => {
      if (position !== index && position !== previous) gsap.set(scene, { autoAlpha: 0 })
    })
    // Only one text group may paint, including when a scroll interrupts a
    // partially entered chapter. Keep opacity separate from focus visibility.
    centers.forEach((center, position) => {
      if (position !== previous || position === index) gsap.set(center, { opacity: 0 })
    })
    objects[index].forEach((object, side) => gsap.set(object, pose(side, true, index)))
    gsap.set(lines[index], { yPercent: 100 })
    gsap.set(actions[index], { yPercent: 110, opacity: 0 })
    transition = gsap.timeline({ onComplete: () => {
      if (!destroyed && active === index) settle(index)
    } })
    if (previous >= 0 && previous !== index) {
      transition.set(centers[previous], { opacity: 0 }, .5)
        .set(scenes[previous], { autoAlpha: 0 }, .65)
        .to(lines[previous], { yPercent: 100, duration: .5, ease }, 0)
        .to(actions[previous], { yPercent: 110, opacity: 0, duration: .4, ease }, 0)
      objects[previous].forEach((object, side) => transition.to(object, { ...pose(side, true, previous), duration: .65, ease }, 0))
    }
    const changing = previous >= 0 && previous !== index
    const textDelay = changing ? .56 : 0
    transition.set(centers[index], { opacity: 1 }, textDelay)
      .to(lines[index], { yPercent: 0, duration: 1.1, ease, stagger: .07 }, textDelay)
      .to(actions[index], { yPercent: 0, opacity: 1, duration: .9, ease }, textDelay + .15)
    objects[index].forEach((object, side) => transition.to(object, { ...pose(side, false, index), duration: 1.1, ease }, changing ? .28 : 0))
  }

  function render(progress, immediate = false, entrance = false) {
    const value = clamp(progress)
    show(Math.min(2, Math.floor(value * 3)), { immediate, entrance })
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
    if (active === index && focus) {
      scenes[index].querySelector('h3')?.focus({ preventScroll: true })
      pendingFocus = -1
    }
    window.scrollTo({ top: target, behavior })
    if (behavior === 'instant') {
      ScrollTrigger.update()
      render((index + .5) / 3, true)
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
      ScrollTrigger.refresh()
      if (preserved !== null && trigger) {
        window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * preserved, behavior: 'instant' })
        render(preserved, true)
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
    originals.forEach((original, element) => restore(element, 'style', original.style))
    updateSelection(Math.max(0, active))
  }

  function startPinned() {
    pinned = true
    active = -1
    section.classList.add('is-pinned')
    gsap.set(scenes, { autoAlpha: 0 })
    trigger = ScrollTrigger.create({
      id: 'design-process-pinned',
      trigger: journey,
      start: 'top top',
      end: 'bottom bottom',
      invalidateOnRefresh: true,
      onUpdate: self => render(self.progress),
      onRefresh: self => render(self.progress, true),
      onEnter: self => render(self.progress, false, true),
      onEnterBack: self => render(self.progress, false, true),
      onLeave: self => render(self.progress, true),
      onLeaveBack: self => render(self.progress, true),
    })
    render(trigger.progress, true)
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
  const preload = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting) || destroyed) return
    section.querySelectorAll('.design-process__scene img').forEach(image => { image.loading = 'eager' })
    preload.disconnect()
  }, { rootMargin: '100% 0px' })
  preload.observe(journey)
  media.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', startPinned)
  if (!pinned) updateSelection(0)
  revealHash()
  document.fonts?.ready.then(() => { if (!destroyed) queueRefresh() })
  window.addEventListener('load', queueRefresh, { signal, once: true })

  return () => {
    destroyed = true
    controller.abort()
    destroyCardWater()
    cancelAnimationFrame(refreshFrame)
    cancelAnimationFrame(hashFrame)
    preload.disconnect()
    media.revert()
    stopPinned()
    originals.forEach((original, element) => {
      restore(element, 'style', original.style)
      restore(element, 'aria-hidden', original.hidden)
      element.toggleAttribute('inert', original.inert)
      element.classList.toggle('is-active', original.active)
    })
    buttons.forEach((button, index) => restore(button, 'aria-current', originalButtons[index]))
    restore(section, 'data-active-step', originalStep)
    if (counter) counter.textContent = originalCounter
  }
}
