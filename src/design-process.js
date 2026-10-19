import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initDesignProcess(section) {
  if (!section) return () => {}
  const garden = section.querySelector('.design-process__garden')
  const header = section.querySelector('.design-process__header')
  const opener = section.querySelector('.design-process__open')
  const dialog = section.querySelector('.design-process-dialog')
  const details = dialog?.querySelector('[data-approach-details]')
  if (!garden || !opener || !dialog?.showModal || !details) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let destroyed = false
  let pointerInside = false
  let focused = false
  let animation
  let previousOverflow

  // Keep one source for the copy; the drawer shows the original freestanding corals.
  section.querySelectorAll('.design-process__group .design-process__specimen').forEach((card, index) => {
    const item = document.createElement('li')
    const clone = card.cloneNode(true)
    const title = clone.querySelector('.design-process__title')
    title.id = 'approach-drawer-title-' + (index + 1)
    clone.setAttribute('aria-labelledby', title.id)
    item.append(clone)
    details.append(item)
  })

  section.classList.add('is-enhanced')

  function fan(immediate = false) {
    const open = reducedMotion.matches || (!dialog.open && (pointerInside || focused))
    gsap.to(garden, {
      '--reef-open': open ? 1 : 0,
      duration: immediate || reducedMotion.matches ? 0 : open ? .85 : .7,
      ease: 'power3.out', overwrite: 'auto',
    })
  }

  function restorePage() {
    if (previousOverflow !== undefined) {
      document.documentElement.style.overflow = previousOverflow
      previousOverflow = undefined
    }
  }

  function closeDrawer(immediate = false) {
    if (!dialog.open || dialog.dataset.closing === 'true') return
    animation?.cancel()
    const finish = () => {
      animation?.cancel()
      animation = undefined
      delete dialog.dataset.closing
      dialog.close()
    }
    if (immediate || reducedMotion.matches) { finish(); return }
    dialog.dataset.closing = 'true'
    animation = dialog.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(100%)', opacity: .8 },
    ], { duration: 260, easing: 'cubic-bezier(.4, 0, .7, .2)', fill: 'both' })
    animation.finished.then(finish).catch(() => {})
  }

  function openDrawer() {
    if (dialog.open) return
    previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    details.scrollLeft = 0
    fan()
    if (!reducedMotion.matches) {
      const opening = dialog.animate([
        { transform: 'translateY(100%)', opacity: .8 },
        { transform: 'translateY(0)', opacity: 1 },
      ], { duration: 620, easing: 'cubic-bezier(.16, 1, .3, 1)' })
      animation = opening
      opening.finished.then(() => { if (animation === opening) animation = undefined }).catch(() => {})
    }
  }

  opener.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    pointerInside = true
    fan()
  }, { signal })
  opener.addEventListener('pointerleave', () => { pointerInside = false; fan() }, { signal })
  opener.addEventListener('focus', () => { focused = true; fan() }, { signal })
  opener.addEventListener('blur', () => { focused = false; fan() }, { signal })
  opener.addEventListener('click', openDrawer, { signal })
  dialog.querySelector('.design-process-dialog__close').addEventListener('click', () => closeDrawer(), { signal })
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDrawer() }, { signal })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const box = dialog.getBoundingClientRect()
    if (event.clientY < box.top || event.clientX < box.left || event.clientX > box.right) closeDrawer()
  }, { signal })
  dialog.addEventListener('close', () => {
    animation?.cancel()
    animation = undefined
    delete dialog.dataset.closing
    restorePage()
    opener.focus({ preventScroll: true })
    fan()
  }, { signal })
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      if (dialog.dataset.closing === 'true') {
        animation?.cancel()
        delete dialog.dataset.closing
        closeDrawer(true)
      } else {
        animation?.cancel()
        animation = undefined
      }
    }
    fan(true)
  }, { signal })
  fan(true)

  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(header, {
      opacity: 0, y: 14, duration: .75, ease: 'power2.out',
      scrollTrigger: { trigger: header, start: 'top 92%', once: true },
    })
    gsap.from(garden, {
      opacity: 0, y: 32, duration: .95, ease: 'power2.out',
      scrollTrigger: { trigger: garden, start: 'top 88%', once: true },
    })
  })
  document.fonts.ready.then(() => { if (!destroyed) ScrollTrigger.refresh() })

  return () => {
    destroyed = true
    controller.abort()
    animation?.cancel()
    if (dialog.open) dialog.close()
    restorePage()
    media.revert()
    gsap.killTweensOf(garden)
    garden.style.removeProperty('--reef-open')
    section.classList.remove('is-enhanced')
    details.replaceChildren()
    delete dialog.dataset.closing
  }
}
