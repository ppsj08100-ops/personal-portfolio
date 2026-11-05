import './team-air-support.css'

const upperScenes = [
  ['team-projects', '[data-exhibition-device="computer"]'],
  ['diptyque-overview', '.project-overview__laptop'],
  ['diptyque-experience', '.project-overview__object--primary'],
  ['diptyque-typography', '.project-overview__object--primary'],
  ['diptyque-renewal', '.project-overview__object--secondary'],
  ['diptyque-editorial', '.project-overview__object--primary'],
  ['diptyque-contribution', '.project-overview__object--primary'],
  ['diptyque-together', '.project-overview__object--primary'],
]
const lowerScenes = ['planning', 'research', 'interviews', 'definition', 'structure', 'visual', 'screens']
  .map(id => [`diptyque-${id}`, '.process-device--monitor'])

/** Two small air pockets under each leading display; a single smaller pocket
 * supports companion frames. Original reveals and frame geometry stay intact. */
export function initTeamAirSupport(root = document) {
  const records = []
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let disposed = false
  let measureFrame = 0

  const targets = [...upperScenes, ...lowerScenes].flatMap(([id, selector]) => {
    const page = root.getElementById(id)
    const primary = page?.querySelector(selector)
    if (!primary) return []
    const companions = [...page.querySelectorAll('.project-exhibition__exhibit, .process-exhibit > .process-device')]
      .filter(target => target !== primary)
    return [{ page, target: primary, secondary: false }, ...companions.map(target => ({ page, target, secondary: true }))]
  })
  for (const [index, { page, target, secondary }] of targets.entries()) {
    const field = document.createElement('span')
    field.className = `team-air__field${secondary ? ' team-air__field--secondary' : ''}`
    field.setAttribute('aria-hidden', 'true')
    const animations = []
    for (let i = 0; i < (secondary ? 1 : 2); i++) {
      const pocket = document.createElement('span')
      pocket.className = `team-air__pocket${i ? ' team-air__pocket--two' : ''}`
      field.append(pocket)
      if (secondary) continue
      const float = pocket.animate([
        { translate: '0 0' }, { translate: `0 ${i ? '-1.5px' : '2px'}`, offset: .5 }, { translate: '0 0' },
      ], { duration: i ? 12200 : 10800, iterations: Infinity, easing: 'ease-in-out' })
      float.pause()
      float.currentTime = (index * 1730 + i * 2400) % 9000
      animations.push({ animation: float, kind: 'pocket' })

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
    const previousSize = target.style.getPropertyValue('--team-air-size')
    const previousPriority = target.style.getPropertyPriority('--team-air-size')
    const hadClass = target.classList.contains('team-air-supported')
    target.classList.add('team-air-supported')
    target.prepend(field)
    records.push({ page, target, field, animations, previousSize, previousPriority, hadClass, secondary, visible: false })
  }
  if (!records.length) return () => {}

  function sync() {
    if (disposed) return
    const obscured = Boolean(root.querySelector('dialog[open]'))
    for (const record of records) {
      const running = record.visible && !document.hidden && !reduced.matches && !obscured
        && !record.target.closest('[inert]') && !record.target.hidden
      for (const { animation, kind } of record.animations) {
        if (running) {
          if (animation.playState !== 'running') animation.play()
        } else {
          animation.pause()
          if (reduced.matches) animation.currentTime = kind === 'pocket' ? 0 : 13700
        }
      }
      record.field.dataset.airState = reduced.matches ? 'still' : running ? 'running' : 'paused'
    }
  }
  function measure() {
    measureFrame = 0
    if (disposed) return
    for (const { target, secondary } of records) {
      const limit = innerWidth < 900 ? (secondary ? 16 : 28) : (secondary ? 24 : 56)
      target.style.setProperty('--team-air-size', `${Math.max(12, Math.min(limit, target.clientWidth * .085)).toFixed(2)}px`)
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
  for (const id of ['diptyque-details', 'diptyque-process']) {
    const chapter = root.getElementById(id)
    if (chapter) state.observe(chapter, { attributes: true, subtree: true, attributeFilter: ['inert', 'hidden'] })
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
    dialogs.disconnect()
    for (const record of records) {
      record.animations.forEach(({ animation }) => animation.cancel())
      record.field.remove()
      record.target.classList.toggle('team-air-supported', record.hadClass)
      if (record.previousSize) record.target.style.setProperty('--team-air-size', record.previousSize, record.previousPriority)
      else record.target.style.removeProperty('--team-air-size')
    }
  }
}
