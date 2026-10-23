// This scene moves inside the horizontal chapter; the chapter owns its scroll.
export function initProjectOverview(section) {
  if (!section) return () => {}
  const dialog = section.querySelector('.project-overview__dialog')
  const opener = section.querySelector('[data-overview-open]')
  const closer = section.querySelector('[data-overview-close]')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  const controller = new AbortController()
  const { signal } = controller
  const properties = ['--overview-x', '--overview-y']
  const originalHidden = opener?.hidden
  const originalExpanded = opener?.getAttribute('aria-expanded')
  const canOpen = dialog && opener && typeof dialog.showModal === 'function'
  let visible = false
  let disposed = false
  let frame = 0
  let lastTime = 0
  let x = 0, y = 0, targetX = 0, targetY = 0
  let modalAnimation = null
  let modalState = 'closed'
  let overflowBefore = null

  const inert = () => Boolean(section.closest('[inert]'))
  const motionAllowed = () => visible && !disposed && !inert() && !document.hidden
    && !reduced.matches && !dialog?.open

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

  function lockScroll() {
    if (overflowBefore) return
    const style = document.documentElement.style
    overflowBefore = { value: style.getPropertyValue('overflow'), priority: style.getPropertyPriority('overflow') }
    style.setProperty('overflow', 'hidden')
  }

  function unlockScroll() {
    if (!overflowBefore) return
    const style = document.documentElement.style
    if (overflowBefore.value) style.setProperty('overflow', overflowBefore.value, overflowBefore.priority)
    else style.removeProperty('overflow')
    overflowBefore = null
  }

  function cancelModalAnimation() {
    modalAnimation?.cancel()
    modalAnimation = null
  }

  function finishClose(restoreFocus) {
    cancelModalAnimation()
    if (dialog?.open) dialog.close()
    modalState = 'closed'
    unlockScroll()
    section.classList.remove('is-overview-open')
    opener?.setAttribute('aria-expanded', 'false')
    syncMotion()
    if (restoreFocus && !disposed && !inert() && opener?.isConnected && !opener.hidden) {
      opener.focus({ preventScroll: true })
    }
  }

  function close({ immediate = false, restoreFocus = true } = {}) {
    if (!dialog?.open || modalState === 'closed') return
    if (modalState === 'closing' && !immediate) return
    cancelModalAnimation()
    modalState = 'closing'
    if (immediate || reduced.matches || typeof dialog.animate !== 'function') {
      finishClose(restoreFocus)
      return
    }
    const animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'both',
    })
    modalAnimation = animation
    animation.finished.then(() => {
      if (!disposed && modalAnimation === animation) finishClose(restoreFocus)
    }).catch(() => {})
  }

  function syncMotion() {
    const active = motionAllowed()
    section.classList.toggle('is-overview-active', active)
    if (!active) clearMotion()
  }

  function syncState() {
    if ((!visible || inert() || document.hidden) && dialog?.open) {
      close({ immediate: true, restoreFocus: false })
    }
    syncMotion()
  }

  function open() {
    if (!canOpen || disposed || inert() || dialog.open || document.hidden) return
    const origin = opener.getBoundingClientRect()
    cancelModalAnimation()
    try { dialog.showModal() } catch { return }
    modalState = 'open'
    lockScroll()
    section.classList.add('is-overview-open')
    opener.setAttribute('aria-expanded', 'true')
    syncMotion()
    const article = dialog.querySelector('[data-overview-scroll]')
    if (article) article.scrollTop = 0
    if (reduced.matches || typeof dialog.animate !== 'function') return

    const bounds = dialog.getBoundingClientRect()
    const top = Math.max(0, origin.top - bounds.top)
    const right = Math.max(0, bounds.right - origin.right)
    const bottom = Math.max(0, bounds.bottom - origin.bottom)
    const left = Math.max(0, origin.left - bounds.left)
    const animation = dialog.animate([
      { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 24px)`, opacity: .8 },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 },
    ], { duration: 520, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'both' })
    modalAnimation = animation
    animation.finished.then(() => {
      if (modalAnimation !== animation) return
      animation.cancel()
      modalAnimation = null
    }).catch(() => {})
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
  reduced.addEventListener('change', () => {
    if (reduced.matches && modalState === 'closing') finishClose(true)
    else if (reduced.matches) cancelModalAnimation()
    syncMotion()
  }, { signal })
  document.addEventListener('visibilitychange', syncState, { signal })

  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > .08)
    syncState()
  }, { threshold: [0, .08] })
  visibilityObserver.observe(section)
  const inertObserver = new MutationObserver(syncState)
  for (let ancestor = section; ancestor; ancestor = ancestor.parentElement) {
    inertObserver.observe(ancestor, { attributes: true, attributeFilter: ['inert'] })
  }

  if (canOpen) {
    opener.hidden = false
    opener.setAttribute('aria-expanded', 'false')
    opener.addEventListener('click', open, { signal })
    closer?.addEventListener('click', event => { event.preventDefault(); close() }, { signal })
    dialog.addEventListener('cancel', event => { event.preventDefault(); close() }, { signal })
    dialog.addEventListener('close', () => {
      if (modalState !== 'closed') finishClose(false)
    }, { signal })
    dialog.addEventListener('wheel', event => {
      if (!dialog.open) return
      event.stopPropagation()
      if (event.ctrlKey) return
      // The article scrolls on desktop; the whole dialog scrolls on mobile.
      // Let the nearest available native scroller consume the wheel gesture.
      let scroller = event.target instanceof Element ? event.target : null
      let canScroll = false
      while (scroller && dialog.contains(scroller)) {
        const overflow = getComputedStyle(scroller).overflowY
        if (/^(auto|scroll|overlay)$/.test(overflow) && scroller.scrollHeight > scroller.clientHeight + 1) {
          canScroll = event.deltaY < 0 ? scroller.scrollTop > 1
            : event.deltaY > 0 && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1
          if (canScroll) break
        }
        if (scroller === dialog) break
        scroller = scroller.parentElement
      }
      if (!canScroll) event.preventDefault()
    }, { passive: false, signal })
  }

  return () => {
    disposed = true
    controller.abort()
    visibilityObserver.disconnect()
    inertObserver.disconnect()
    finishClose(false)
    clearMotion()
    section.classList.remove('is-overview-active', 'is-overview-open')
    if (opener) {
      opener.hidden = originalHidden
      if (originalExpanded === null) opener.removeAttribute('aria-expanded')
      else opener.setAttribute('aria-expanded', originalExpanded)
    }
  }
}
