import { createAmbientAudio } from './ambient-audio.js'

function tokenDuration(element, name) {
  const value = getComputedStyle(element).getPropertyValue(name).trim()
  const amount = Number.parseFloat(value) || 0
  return value.endsWith('ms') ? amount : amount * 1000
}

export function initHero(hero) {
  if (!hero) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const image = hero.querySelector('.hero__artwork')
  const dialog = document.querySelector('#portfolio-menu')
  const openButtons = [...document.querySelectorAll('[data-menu-open]')]
  const closeButton = dialog.querySelector('[data-menu-close]')
  const soundButtons = [...document.querySelectorAll('[data-sound-toggle]')]
  const status = document.querySelector('#hero-status')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const audio = createAmbientAudio()
  let returnFocus
  let closeTimer
  let closing = false
  let focusHeroOnClose = false
  let soundEnabled = false
  let soundBusy = false

  hero.classList.add('is-loading')

  function imageReady() {
    hero.classList.remove('is-loading')
    hero.classList.add('is-ready')
  }

  function imageFailed() {
    imageReady()
    hero.classList.add('has-image-error')
    image.hidden = true
    hero.querySelector('.hero__error').hidden = false
    status.textContent = 'HERO 이미지를 불러오지 못했습니다.'
  }

  if (image.complete) {
    image.naturalWidth > 0 ? imageReady() : imageFailed()
  } else {
    image.addEventListener('load', imageReady, { once: true, signal })
    image.addEventListener('error', imageFailed, { once: true, signal })
  }

  function setMenuExpanded(expanded) {
    openButtons.forEach((button) => button.setAttribute('aria-expanded', String(expanded)))
  }

  function finishClose() {
    clearTimeout(closeTimer)
    closing = false
    dialog.classList.remove('is-closing', 'is-opening')
    if (dialog.open) dialog.close()
  }

  function closeMenu() {
    if (!dialog.open || closing) return
    closing = true
    dialog.classList.remove('is-opening')
    const duration = reducedMotion.matches ? 0 : tokenDuration(dialog, '--duration-page')
    if (duration === 0) {
      finishClose()
      return
    }
    dialog.classList.add('is-closing')
    // Completion is independent of animationend (reduced motion / cancellation).
    closeTimer = setTimeout(finishClose, duration + 50)
  }

  function openMenu(event) {
    if (dialog.open) return
    returnFocus = event.currentTarget
    focusHeroOnClose = false
    dialog.classList.remove('is-closing')
    document.body.classList.add('has-menu-open')
    setMenuExpanded(true)
    dialog.showModal()
    dialog.classList.add('is-opening')
    closeButton.focus({ preventScroll: true })
  }

  openButtons.forEach((button) => button.addEventListener('click', openMenu, { signal }))
  closeButton.addEventListener('click', closeMenu, { signal })
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return
    const targets = [...dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')]
      .filter((element) => element.getClientRects().length)
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
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeMenu()
  }, { signal })
  dialog.addEventListener('animationend', (event) => {
    if (event.target === dialog && event.animationName === 'menu-dismiss') finishClose()
    if (event.target === dialog && event.animationName === 'menu-reveal') dialog.classList.remove('is-opening')
  }, { signal })
  dialog.addEventListener('close', () => {
    clearTimeout(closeTimer)
    closing = false
    dialog.classList.remove('is-closing', 'is-opening')
    document.body.classList.remove('has-menu-open')
    setMenuExpanded(false)
    if (focusHeroOnClose) {
      hero.focus({ preventScroll: true })
      hero.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' })
      focusHeroOnClose = false
    } else {
      const focusTarget = returnFocus?.getClientRects().length
        ? returnFocus
        : openButtons.find((button) => button.getClientRects().length)
      focusTarget?.focus({ preventScroll: true })
    }
  }, { signal })
  dialog.querySelector('[data-menu-home]').addEventListener('click', (event) => {
    event.preventDefault()
    focusHeroOnClose = true
    closeMenu()
  }, { signal })
  dialog.querySelectorAll('a:not([data-menu-home])').forEach((link) => {
    link.addEventListener('click', closeMenu, { signal })
  })

  function motionPreferenceChanged() {
    if (reducedMotion.matches && closing) finishClose()
  }
  reducedMotion.addEventListener('change', motionPreferenceChanged)

  async function toggleSound() {
    if (soundBusy) return
    soundBusy = true
    try {
      soundEnabled = await audio.setEnabled(!soundEnabled)
      soundButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(soundEnabled))
        button.setAttribute('aria-label', soundEnabled ? '배경 사운드 끄기' : '배경 사운드 켜기')
      })
      status.textContent = soundEnabled ? '배경 사운드를 켰습니다.' : '배경 사운드를 껐습니다.'
    } catch {
      status.textContent = '현재 브라우저에서 사운드를 재생할 수 없습니다.'
    } finally {
      soundBusy = false
    }
  }
  soundButtons.forEach((button) => button.addEventListener('click', toggleSound, { signal }))
  document.addEventListener('visibilitychange', () => {
    audio.setVisible(!document.hidden).catch(() => {})
  }, { signal })

  return () => {
    clearTimeout(closeTimer)
    controller.abort()
    reducedMotion.removeEventListener('change', motionPreferenceChanged)
    if (dialog.open) dialog.close()
    document.body.classList.remove('has-menu-open')
    dialog.classList.remove('is-opening', 'is-closing')
    setMenuExpanded(false)
    soundButtons.forEach((button) => {
      button.setAttribute('aria-pressed', 'false')
      button.setAttribute('aria-label', '배경 사운드 켜기')
    })
    audio.dispose()
    hero.classList.remove('is-loading', 'is-ready')
  }
}

