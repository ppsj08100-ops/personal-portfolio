/** Keep a changing chapter selection inside its own horizontal step rail. */
export function initSectionStepNavigation(root = document) {
  const rows = [...root.querySelectorAll('nav.section-step-nav')]
  if (!rows.length) return () => {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const { signal } = controller
  let frame = 0
  let disposed = false

  function align() {
    frame = 0
    if (disposed) return
    for (const row of rows) {
      if (!row.isConnected || !row.clientWidth || row.scrollWidth <= row.clientWidth + 1) continue
      const current = row.querySelector(':scope > button:is([aria-current="step"], [aria-current="page"])')
      if (!current) continue
      const rail = row.getBoundingClientRect()
      const item = current.getBoundingClientRect()
      let next = row.scrollLeft
      if (item.left < rail.left + 6) next += item.left - rail.left - 6
      else if (item.right > rail.right - 6) next += item.right - rail.right + 6
      next = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, next))
      if (Math.abs(next - row.scrollLeft) > 1) {
        row.scrollTo({ left: next, behavior: reduced.matches ? 'instant' : 'smooth' })
      }
    }
  }
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(align)
  }

  // Scrolling the rail changes neither attribute nor size, so it cannot feed
  // back into these observers or interrupt someone browsing adjacent labels.
  const selection = new MutationObserver(schedule)
  const resize = new ResizeObserver(schedule)
  for (const row of rows) {
    selection.observe(row, { subtree: true, attributes: true, attributeFilter: ['aria-current'] })
    resize.observe(row)
  }
  window.addEventListener('resize', schedule, { passive: true, signal })
  reduced.addEventListener('change', schedule, { signal })
  document.fonts?.ready.then(schedule)
  schedule()

  return () => {
    disposed = true
    controller.abort()
    selection.disconnect()
    resize.disconnect()
    cancelAnimationFrame(frame)
  }
}
