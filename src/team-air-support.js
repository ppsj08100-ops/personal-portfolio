import './team-air-support.css'

const upperScenes = [
  ['team-projects', '[data-exhibition-device="computer"]'],
  ['diptyque-overview', '.project-overview__laptop'],
  ['diptyque-experience', '.project-overview__object--primary'],
  ['diptyque-typography', '.project-overview__object--primary'],
  ['diptyque-galerie', '.project-overview__object--primary'],
  ['diptyque-history', '.project-overview__object--primary'],
  ['diptyque-planet', '.project-overview__object--primary'],
  ['diptyque-contribution', '.project-overview__object--primary'],
  ['diptyque-together', '.project-overview__object--primary'],
]
const lowerScenes = ['planning', 'research', 'interviews', 'definition', 'structure', 'visual', 'screens']
  .map(id => [`diptyque-${id}`, '.process-device--monitor'])

const fraction = value => value - Math.floor(value)
const random = seed => fraction(Math.sin(seed * 127.1 + 311.7) * 43758.5453)

function addRisingBubbles(field, animations, seed, secondary) {
  // Side streams remain visible around opaque displays. Inner lanes emerge
  // below and above the frame, leaving the actual website unobscured.
  const lanes = [-.025, 1.025, -.05, 1.05, -.075, 1.075, -.035, 1.035, .055, .945]
  for (let index = 0; index < (secondary ? 14 : 28); index++) {
    const value = seed * 47 + index + 1
    const bubble = document.createElement('span')
    bubble.className = 'team-air__bubble'
    bubble.style.left = `${((lanes[index % lanes.length] + (random(value) - .5) * .035) * 100).toFixed(2)}%`
    bubble.style.setProperty('--team-bubble-scale', (.18 + random(value + 1) * .22).toFixed(3))
    field.append(bubble)
    const direction = index % 2 ? 1 : -1
    const sway = direction * (1.5 + random(value + 2) * 3.5)
    const peak = .52 + random(value + 3) * .2
    const duration = 30000 + random(value + 4) * 16000
    const rise = bubble.animate([
      { transform: 'translate3d(-50%, 0, 0) scale(.58)', opacity: 0 },
      { transform: `translate3d(calc(-50% + ${sway * .2}px), calc(var(--team-air-rise) * -.08), 0) scale(.76)`, opacity: peak * .85, offset: .08 },
      { transform: `translate3d(calc(-50% + ${-sway * .55}px), calc(var(--team-air-rise) * -.4), 0) scale(.92)`, opacity: peak, offset: .4 },
      { transform: `translate3d(calc(-50% + ${sway}px), calc(var(--team-air-rise) * -.82), 0) scale(1.06)`, opacity: peak * .72, offset: .82 },
      { transform: `translate3d(calc(-50% + ${sway * .7}px), calc(var(--team-air-rise) * -1), 0) scale(1.13)`, opacity: 0 },
    ], { duration, iterations: Infinity, easing: 'linear' })
    rise.pause()
    rise.currentTime = random(value + 5) * duration
    animations.push({ animation: rise, kind: 'bubble', stillTime: rise.currentTime })
  }
}

/** Small, transparent bubbles accompany every Intro–08 and 01–07 display.
 * Only visible frames animate; reduced motion keeps the same quiet still air. */
export function initTeamAirSupport(root = document) {
  const records = []
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let disposed = false
  let measureFrame = 0

  const scenes = [
    ...upperScenes.map(([id, selector]) => ({ id, selector, rich: true })),
    ...lowerScenes.map(([id, selector]) => ({ id, selector, rich: true })),
  ]
  const targets = scenes.flatMap(({ id, selector, rich }) => {
    const page = root.getElementById(id)
    const primary = page?.querySelector(selector)
    if (!primary) return []
    const companions = [...page.querySelectorAll('.project-exhibition__exhibit, .process-exhibit > .process-device')]
      .filter(target => target !== primary)
    return [{ page, target: primary, secondary: false, rich }, ...companions.map(target => ({ page, target, secondary: true, rich }))]
  })
  for (const [index, { page, target, secondary, rich }] of targets.entries()) {
    const field = document.createElement('span')
    field.className = `team-air__field${secondary ? ' team-air__field--secondary' : ''}${rich ? ' team-air__field--bubbles' : ''}`
    field.setAttribute('aria-hidden', 'true')
    const animations = []
    const pocketCount = rich ? secondary ? 2 : 3 : secondary ? 1 : 2
    for (let i = 0; i < pocketCount; i++) {
      const pocket = document.createElement('span')
      pocket.className = `team-air__pocket${i && !rich ? ' team-air__pocket--two' : ''}`
      if (rich) {
        const positions = secondary ? [22, 80] : [14, 52, 86]
        const scales = secondary ? [.4, .32] : [.38, .25, .32]
        pocket.style.left = `${positions[i]}%`
        pocket.style.setProperty('--team-pocket-scale', String(scales[i]))
      }
      field.append(pocket)
      if (secondary && !rich) continue
      const drift = rich ? (i ? -.6 : .8) : (i ? -1.5 : 2)
      const floatDuration = rich ? (i ? 24000 : 21000) : (i ? 12200 : 10800)
      const float = pocket.animate([
        { translate: '0 0' }, { translate: `0 ${drift}px`, offset: .5 }, { translate: '0 0' },
      ], { duration: floatDuration, iterations: Infinity, easing: 'ease-in-out' })
      float.pause()
      float.currentTime = (index * 1730 + i * 2400) % 9000
      animations.push({ animation: float, kind: 'pocket' })
      if (rich) continue

      const mote = document.createElement('span')
      mote.className = `team-air__mote${i ? ' team-air__mote--two' : ''}`
      field.append(mote)
      const rise = mote.animate([
        { translate: '0 12px', opacity: 0 },
        { translate: `${i ? -1 : 1}px -5px`, opacity: .4, offset: .12 },
        { translate: `${i ? -5 : 7}px -110px`, opacity: .22, offset: .8 },
        { translate: `${i ? -7 : 9}px -150px`, opacity: 0 },
      ], { duration: i ? 15800 : 13700, iterations: Infinity, easing: 'linear' })
      rise.pause()
      rise.currentTime = (index * 2130 + i * 6400) % 12500
      animations.push({ animation: rise, kind: 'mote' })
    }
    if (rich) addRisingBubbles(field, animations, index + 1, secondary)
    const previousSize = target.style.getPropertyValue('--team-air-size')
    const previousPriority = target.style.getPropertyPriority('--team-air-size')
    const previousRise = target.style.getPropertyValue('--team-air-rise')
    const previousRisePriority = target.style.getPropertyPriority('--team-air-rise')
    const hadClass = target.classList.contains('team-air-supported')
    target.classList.add('team-air-supported')
    target.prepend(field)
    records.push({ page, target, field, animations, previousSize, previousPriority, previousRise, previousRisePriority, hadClass, secondary, rich, visible: false })
  }
  if (!records.length) return () => {}

  function sync() {
    if (disposed) return
    const obscured = Boolean(root.querySelector('dialog[open]'))
    for (const record of records) {
      const chapter = record.page.closest('.project-details')
      const ready = !chapter?.classList.contains('is-project-paged') || chapter.classList.contains('is-project-ready')
      const running = record.visible && !document.hidden && !reduced.matches && !obscured
        && ready && !record.page.closest('[inert], [hidden]') && !record.target.closest('[hidden]')
      for (const { animation, kind, stillTime } of record.animations) {
        if (running) {
          if (animation.playState !== 'running') animation.play()
        } else {
          animation.pause()
          if (reduced.matches) animation.currentTime = kind === 'bubble' ? stillTime : kind === 'mote' ? 13700 : 0
        }
      }
      record.field.dataset.airState = reduced.matches ? 'still' : running ? 'running' : 'paused'
    }
  }
  function measure() {
    measureFrame = 0
    if (disposed) return
    for (const { target, secondary, rich } of records) {
      const limit = rich
        ? (innerWidth < 900 ? (secondary ? 13 : 18) : (secondary ? 18 : 24))
        : (innerWidth < 900 ? (secondary ? 16 : 28) : (secondary ? 24 : 56))
      const size = rich
        ? Math.max(secondary ? 10 : 14, Math.min(limit, target.clientWidth * .045))
        : Math.max(12, Math.min(limit, target.clientWidth * .085))
      target.style.setProperty('--team-air-size', `${size.toFixed(2)}px`)
      if (rich) target.style.setProperty('--team-air-rise', `${(target.clientHeight * 1.18 + size * 2.4).toFixed(2)}px`)
    }
  }
  function queueMeasure() { if (!disposed && !measureFrame) measureFrame = requestAnimationFrame(measure) }
  const dimensions = new ResizeObserver(queueMeasure)
  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = records.find(item => item.target === entry.target)
      if (record) record.visible = entry.isIntersecting && entry.intersectionRatio > .08
    }
    sync()
  }, { threshold: [0, .08, .1] })
  for (const record of records) {
    dimensions.observe(record.target)
    intersection.observe(record.target)
  }
  const state = new MutationObserver(sync)
  const readiness = new MutationObserver(sync)
  for (const id of ['diptyque-details', 'diptyque-process']) {
    const chapter = root.getElementById(id)
    if (chapter) state.observe(chapter, { attributes: true, subtree: true, attributeFilter: ['inert', 'hidden'] })
    if (chapter) readiness.observe(chapter, { attributes: true, attributeFilter: ['class'] })
  }
  const dialogs = new MutationObserver(sync)
  root.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] }))
  window.addEventListener('resize', queueMeasure, { passive: true, signal })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', sync, { signal })
  measure()
  sync()

  return () => {
    disposed = true
    controller.abort()
    cancelAnimationFrame(measureFrame)
    dimensions.disconnect()
    intersection.disconnect()
    state.disconnect()
    readiness.disconnect()
    dialogs.disconnect()
    for (const record of records) {
      record.animations.forEach(({ animation }) => animation.cancel())
      record.field.remove()
      record.target.classList.toggle('team-air-supported', record.hadClass)
      if (record.previousSize) record.target.style.setProperty('--team-air-size', record.previousSize, record.previousPriority)
      else record.target.style.removeProperty('--team-air-size')
      if (record.previousRise) record.target.style.setProperty('--team-air-rise', record.previousRise, record.previousRisePriority)
      else record.target.style.removeProperty('--team-air-rise')
    }
  }
}
