import { gsap } from 'gsap'

export function initFooterContact(footer) {
  const trigger = footer.querySelector('[data-footer-contact-open]')
  const dialog = footer.querySelector('.footer-contact')
  const panel = dialog?.querySelector('[data-footer-contact-float]')
  const closeButton = dialog?.querySelector('[data-footer-contact-close]')
  if (!trigger || !panel || !closeButton) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const triggerImage = trigger.querySelector('img')
  const panelImages = [...panel.querySelectorAll('img')]
  // Prepare the same artwork once its seabed version has loaded, including
  // when reduced motion opens the dialog without a long rise animation.
  function prepareArtwork() {
    panelImages.forEach(image => {
      image.loading = 'eager'
      image.decode().catch(() => {})
    })
  }
  if (triggerImage?.complete && triggerImage.naturalWidth) prepareArtwork()
  else triggerImage?.addEventListener('load', prepareArtwork, { signal, once: true })
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let tween
  let state = 'closed'
  let returnFocus
  let disposed = false

  function stopTween() {
    tween?.kill()
    tween = null
  }

  function originPose() {
    const origin = trigger.getBoundingClientRect()
    const target = panel.getBoundingClientRect()
    const style = getComputedStyle(trigger)
    return {
      x: origin.left + origin.width / 2 - (target.left + target.width / 2),
      y: origin.top + origin.height / 2 - (target.top + target.height / 2),
      scale: origin.width / target.width,
      rotation: parseFloat(style.getPropertyValue('--footer-tag-turn')) || 0,
      rotationX: parseFloat(style.getPropertyValue('--footer-tag-tilt')) || 0,
      transformPerspective: 1000,
    }
  }

  function float() {
    if (!dialog.open || state === 'closing') return
    state = 'floating'
    gsap.set(panel, { clearProps: 'transform' })
    dialog.classList.add('is-floating')
  }

  function finishClose(restoreFocus = true) {
    stopTween()
    state = 'closed'
    dialog.classList.remove('is-floating')
    trigger.classList.remove('is-lifted')
    trigger.setAttribute('aria-expanded', 'false')
    delete footer.dataset.contactOpen
    document.documentElement.classList.remove('has-footer-contact-open')
    gsap.set(panel, { clearProps: 'transform,opacity' })
    if (dialog.open) dialog.close()
    if (restoreFocus && !disposed && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  }

  function open() {
    if (disposed || state !== 'closed') return
    prepareArtwork()
    returnFocus = trigger
    dialog.showModal()
    state = 'rising'
    footer.dataset.contactOpen = 'true'
    document.documentElement.classList.add('has-footer-contact-open')
    trigger.setAttribute('aria-expanded', 'true')
    closeButton.focus({ preventScroll: true })
    const pose = originPose()
    trigger.classList.add('is-lifted')
    if (reduced.matches) return float()
    gsap.set(panel, pose)
    tween = gsap.to(panel, {
      x: 0, y: 0, scale: 1, rotation: 0, rotationX: 0,
      duration: 1.25, ease: 'power2.out', onComplete: float,
    })
  }

  function close() {
    if (state === 'closed' || state === 'closing') return
    stopTween()
    state = 'closing'
    dialog.classList.remove('is-floating')
    if (reduced.matches) return finishClose()
    const current = Object.fromEntries(['x', 'y', 'scale', 'rotation', 'rotationX'].map(key => [key, gsap.getProperty(panel, key)]))
    // Measure a centered plate, then resume from its current pose if closed mid-rise.
    gsap.set(panel, { clearProps: 'transform' })
    const destination = originPose()
    gsap.set(panel, current)
    tween = gsap.to(panel, {
      ...destination, duration: .8, ease: 'power2.inOut', onComplete: finishClose,
    })
  }

  trigger.addEventListener('click', open, { signal })
  closeButton.addEventListener('click', close, { signal })
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return
    const targets = [...dialog.querySelectorAll('a[href], button:not([disabled])')]
    const first = targets[0]
    const last = targets.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }, { signal })
  dialog.addEventListener('cancel', event => { event.preventDefault(); close() }, { signal })
  // Both ends of a click must land outside the plate to dismiss it.
  let backdropPointer = false
  dialog.addEventListener('pointerdown', event => { backdropPointer = event.target === dialog }, { signal })
  dialog.addEventListener('click', event => {
    if (backdropPointer && event.target === dialog) close()
    backdropPointer = false
  }, { signal })
  dialog.addEventListener('close', () => {
    if (state !== 'closed') finishClose()
  }, { signal })
  reduced.addEventListener('change', () => {
    if (!reduced.matches || state === 'closed') return
    stopTween()
    if (state === 'closing') finishClose()
    else float()
  }, { signal })
  document.addEventListener('visibilitychange', () => {
    tween?.paused(document.hidden)
    dialog.style.setProperty('--footer-float-play-state', document.hidden ? 'paused' : 'running')
  }, { signal })

  return () => {
    disposed = true
    controller.abort()
    finishClose(false)
    dialog.style.removeProperty('--footer-float-play-state')
  }
}
