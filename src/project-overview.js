// Every description is visible in the page. JavaScript only manages exhibition motion.
export function initProjectOverview(section) {
  if (!section) return () => {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  const controller = new AbortController()
  const { signal } = controller
  const properties = ['--overview-x', '--overview-y']
  let visible = false
  let disposed = false
  let frame = 0
  let lastTime = 0
  let x = 0, y = 0, targetX = 0, targetY = 0

  const inert = () => Boolean(section.closest('[inert]'))
  const motionAllowed = () => visible && !disposed && !inert() && !document.hidden
    && !reduced.matches

  function clearMotion() {
    cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
    x = y = targetX = targetY = 0
    properties.forEach(property => section.style.removeProperty(property))
  }

  function animate(now) {
    frame = 0
    if (!motionAllowed() || !finePointer.matches) return
    const delta = lastTime ? Math.min(.1, (now - lastTime) / 1000) : 1 / 60
    lastTime = now
    const ease = 1 - Math.exp(-delta * 4.2)
    x += (targetX - x) * ease
    y += (targetY - y) * ease
    section.style.setProperty('--overview-x', `${(x * 8).toFixed(3)}px`)
    section.style.setProperty('--overview-y', `${(y * 6).toFixed(3)}px`)
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .001) frame = requestAnimationFrame(animate)
    else lastTime = 0
  }

  function startMotion() {
    if (!frame && motionAllowed() && finePointer.matches) frame = requestAnimationFrame(animate)
  }

  function resetPointer() {
    targetX = targetY = 0
    if (!finePointer.matches) clearMotion()
    else startMotion()
  }

  function syncMotion() {
    const active = motionAllowed()
    section.classList.toggle('is-overview-active', active)
    if (!active) clearMotion()
  }

  section.addEventListener('pointermove', event => {
    if (!motionAllowed() || !finePointer.matches || event.pointerType === 'touch') return
    const bounds = section.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
    targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
    startMotion()
  }, { signal })
  section.addEventListener('pointerleave', resetPointer, { signal })
  finePointer.addEventListener('change', resetPointer, { signal })
  reduced.addEventListener('change', syncMotion, { signal })
  document.addEventListener('visibilitychange', syncMotion, { signal })

  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > .08)
    syncMotion()
  }, { threshold: [0, .08] })
  visibilityObserver.observe(section)
  const inertObserver = new MutationObserver(syncMotion)
  for (let ancestor = section; ancestor; ancestor = ancestor.parentElement) {
    inertObserver.observe(ancestor, { attributes: true, attributeFilter: ['inert'] })
  }

  return () => {
    disposed = true
    controller.abort()
    visibilityObserver.disconnect()
    inertObserver.disconnect()
    clearMotion()
    section.classList.remove('is-overview-active')
  }
}
