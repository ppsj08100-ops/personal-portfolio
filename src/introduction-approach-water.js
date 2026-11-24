import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './introduction-approach-water.css'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p) }
const bubbles = [
  { x: 9, size: 4, duration: 14500, phase: .18, drift: 14 },
  { x: 89, size: 6, duration: 11900, phase: .63, drift: -17 },
  { x: 77, size: 3, duration: 16200, phase: .38, drift: 10 },
]

/** The underwater lens arrives through the same water without adding scenery. */
export function initIntroductionApproachWater(root = document) {
  const introduction = root.querySelector('#introduction')
  const approach = root.querySelector('#design-process')
  const stage = approach?.querySelector('[data-approach-stage]')
  const lens = approach?.querySelector('[data-approach-lens]')
  if (!introduction || !stage || !lens) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const menu = root.querySelector('#portfolio-menu')
  const hosts = []
  const animations = []
  const variables = [[lens, '--connection-lens-y']]
  const originals = variables.map(([node, property]) => [node, property,
    node.style.getPropertyValue(property), node.style.getPropertyPriority(property)])
  let active = true
  let frame = 0
  let inView = false
  let enabled = false

  for (const section of [introduction, approach]) {
    const foreground = document.createElement('div')
    foreground.className = 'approach-connection__foreground'
    foreground.setAttribute('aria-hidden', 'true')
    const air = document.createElement('div')
    air.className = 'approach-connection__air'
    for (const [index, profile] of bubbles.entries()) {
      const bubble = document.createElement('span')
      bubble.className = 'approach-connection__bubble'
      bubble.dataset.connectionBubble = String(index)
      bubble.style.left = `${profile.x}%`
      bubble.style.width = bubble.style.height = `${profile.size}px`
      air.append(bubble)
      const animation = bubble.animate([
        { transform: 'translate3d(0, 0, 0)', opacity: 0 },
        { transform: `translate3d(${profile.drift * .08}px, -8svh, 0)`, opacity: .28, offset: .08 },
        { transform: `translate3d(${profile.drift * .86}px, -86svh, 0)`, opacity: .22, offset: .86 },
        { transform: `translate3d(${profile.drift}px, -100svh, 0)`, opacity: 0 },
      ], { duration: profile.duration, iterations: Infinity, easing: 'linear' })
      animation.pause()
      animation.currentTime = profile.duration * profile.phase
      animations.push(animation)
    }
    foreground.append(air)
    ;(section === introduction ? introduction : stage).append(foreground)
    hosts.push({ section, foreground, air })
    section.classList.add('has-approach-connection')
  }

  function syncBubbles() {
    const running = enabled && inView && !document.hidden && !menu?.open
      && !document.body.classList.contains('has-menu-open')
    animations.forEach(animation => {
      if (running && animation.playState !== 'running') animation.play()
      else if (!running && animation.playState === 'running') animation.pause()
    })
  }

  function render() {
    frame = 0
    if (!active) return
    const height = Math.max(1, innerHeight)
    const introBox = introduction.getBoundingClientRect()
    const stageBox = stage.getBoundingClientRect()
    enabled = !reduced.matches && approach.classList.contains('is-pinned')
    introduction.classList.toggle('has-approach-connection-motion', enabled)
    approach.classList.toggle('has-approach-connection-motion', enabled)
    // The entry offset settles before the chapter's lens movement starts.
    const arrival = enabled ? smooth(clamp((1 - stageBox.top / height) / .90)) : 1
    lens.style.setProperty('--connection-lens-y', `${((1 - arrival) * Math.min(58, height * .07)).toFixed(2)}px`)
    for (const host of hosts) {
      const top = host.section === introduction ? introBox.top : stageBox.top
      const y = enabled ? -top : 0
      host.air.style.setProperty('--connection-plane-y', `${y.toFixed(3)}px`)
    }
    approach.dataset.connectionArrival = arrival.toFixed(4)
    syncBubbles()
  }
  function schedule() { if (active && !frame) frame = requestAnimationFrame(render) }

  const visible = new Map()
  const intersection = new IntersectionObserver(entries => {
    entries.forEach(entry => visible.set(entry.target, entry.isIntersecting))
    inView = [...visible.values()].some(Boolean)
    syncBubbles()
  })
  intersection.observe(introduction)
  intersection.observe(stage)
  const resize = new ResizeObserver(schedule)
  resize.observe(introduction)
  resize.observe(stage)
  const state = new MutationObserver(schedule)
  state.observe(approach, { attributes: true, attributeFilter: ['class'] })
  const menuState = new MutationObserver(syncBubbles)
  if (menu) menuState.observe(menu, { attributes: true, attributeFilter: ['open'] })
  window.addEventListener('scroll', schedule, { passive: true, signal })
  window.addEventListener('resize', schedule, { passive: true, signal })
  reduced.addEventListener('change', schedule, { signal })
  document.addEventListener('visibilitychange', syncBubbles, { signal })
  ScrollTrigger.addEventListener('refresh', schedule)
  document.fonts?.ready.then(schedule)
  render()

  return () => {
    active = false
    controller.abort()
    intersection.disconnect()
    resize.disconnect()
    state.disconnect()
    menuState.disconnect()
    ScrollTrigger.removeEventListener('refresh', schedule)
    cancelAnimationFrame(frame)
    animations.forEach(animation => animation.cancel())
    hosts.forEach(({ section, foreground }) => {
      section.classList.remove('has-approach-connection', 'has-approach-connection-motion')
      foreground.remove()
    })
    originals.forEach(([node, property, value, priority]) => {
      if (value) node.style.setProperty(property, value, priority)
      else node.style.removeProperty(property)
    })
    delete approach.dataset.connectionArrival
  }
}
