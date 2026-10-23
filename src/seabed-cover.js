// Keep the display's small parallax independent from the sail aperture and
// horizontal chapter transform. All decorative motion sleeps offscreen.
export function initSeabedCover(article) {
  if (!article) return () => {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const pointer = matchMedia('(hover: hover) and (pointer: fine)')
  const controller = new AbortController()
  const { signal } = controller
  const silt = article.querySelector('.sail-project__silt')
  const motes = Array.from({ length: 16 }, (_, i) => {
    const mote = document.createElement('i')
    mote.style.setProperty('--silt-x', `${8 + (i * 37 % 83)}%`)
    mote.style.setProperty('--silt-y', `${14 + (i * 23 % 71)}%`)
    mote.style.setProperty('--silt-size', `${.8 + (i % 4) * .4}px`)
    mote.style.setProperty('--silt-opacity', `${.12 + (i % 4) * .045}`)
    mote.style.setProperty('--silt-duration', `${15 + i % 6 * 2}s`)
    mote.style.setProperty('--silt-delay', `${-i * 2.7}s`)
    silt.append(mote)
    return mote
  })
  let visible = false
  let frame = 0
  let lastTime = 0
  let x = 0, y = 0, targetX = 0, targetY = 0

  function clear() {
    cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
    x = y = targetX = targetY = 0
    for (const property of ['--scene-x', '--scene-y']) article.style.removeProperty(property)
  }
  function animate(now) {
    frame = 0
    if (!visible || document.hidden || reduced.matches) return
    const delta = lastTime ? Math.min(.1, (now - lastTime) / 1000) : 1 / 60
    lastTime = now
    const ease = 1 - Math.exp(-delta * 4)
    x += (targetX - x) * ease
    y += (targetY - y) * ease
    article.style.setProperty('--scene-x', `${(x * 6).toFixed(3)}px`)
    article.style.setProperty('--scene-y', `${(y * 4).toFixed(3)}px`)
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .001) frame = requestAnimationFrame(animate)
    else lastTime = 0
  }
  function start() {
    if (!frame && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(animate)
  }
  function resetPointer() { targetX = targetY = 0; start() }
  function sync() {
    const active = visible && !document.hidden && !reduced.matches
    article.classList.toggle('is-scene-active', active)
    if (!active) clear()
  }
  article.addEventListener('pointermove', event => {
    if (!pointer.matches || reduced.matches || event.pointerType === 'touch') return
    const bounds = article.getBoundingClientRect()
    targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
    targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
    start()
  }, { signal })
  article.addEventListener('pointerleave', resetPointer, { signal })
  pointer.addEventListener('change', resetPointer, { signal })
  reduced.addEventListener('change', sync, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > .03)
    sync()
  }, { threshold: [0, .03] })
  observer.observe(article)
  return () => {
    controller.abort()
    observer.disconnect()
    clear()
    motes.forEach(mote => mote.remove())
    article.classList.remove('is-scene-active')
  }
}
