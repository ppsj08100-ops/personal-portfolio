export function initIntroduction(section) {
  const content = section?.querySelector('[data-introduction-reveal]')
  if (!content || !('IntersectionObserver' in window)) return () => {}

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const { signal } = controller
  const menu = document.querySelector('#portfolio-menu')
  const mobile = matchMedia('(max-width: 767px)')
  const animations = []
  let observer
  let revealed = false
  let visible = false
  let disposed = false

  const atmosphere = document.createElement('div')
  atmosphere.className = 'introduction__atmosphere'
  atmosphere.setAttribute('aria-hidden', 'true')
  const waterlight = document.createElement('div')
  waterlight.className = 'introduction__waterlight'
  atmosphere.append(waterlight)
  section.prepend(atmosphere)

  function sync() {
    const running = !disposed && revealed && visible && !reducedMotion.matches
      && !document.hidden && !menu?.open && !document.body.classList.contains('has-menu-open')
    atmosphere.dataset.motionState = running ? 'running' : reducedMotion.matches ? 'reduced' : 'paused'
    animations.forEach(animation => running ? animation.play() : animation.pause())
  }

  if (Element.prototype.animate) {
    const light = waterlight.animate([
      { transform: 'translate3d(-34%, 5%, 0) rotate(-18deg)', opacity: 0 },
      { transform: 'translate3d(-14%, 1%, 0) rotate(-16deg)', opacity: .65, offset: .18 },
      { transform: 'translate3d(18%, -3%, 0) rotate(-12deg)', opacity: .4, offset: .65 },
      { transform: 'translate3d(34%, -5%, 0) rotate(-10deg)', opacity: 0 },
    ], { duration: 10500, iterations: Infinity, easing: 'ease-in-out' })
    light.pause()
    animations.push(light)
    const profiles = [
      { x: 4, size: 4, duration: 14500, phase: .34, drift: 10 },
      { x: 96, size: 6.5, duration: 17000, phase: .70, drift: -8 },
      { x: 88, size: 3, duration: 13000, phase: .12, drift: 7 },
      { x: 9, size: 2.5, duration: 18500, phase: .83, drift: -5 },
    ]
    profiles.forEach(profile => {
      const bubble = document.createElement('span')
      bubble.className = 'introduction__bubble'
      Object.assign(bubble.style, { left: `${profile.x}%`, top: '100%', width: `${profile.size}px`, height: `${profile.size}px` })
      atmosphere.append(bubble)
      const animation = bubble.animate([], { duration: profile.duration, iterations: Infinity, easing: 'linear' })
      animation.pause()
      animation.currentTime = profile.duration * profile.phase
      animations.push(animation)
      bubble.motionProfile = { animation, drift: profile.drift }
    })
  }

  function resize() {
    const rise = atmosphere.clientHeight
    atmosphere.querySelectorAll('.introduction__bubble').forEach(bubble => {
      const { animation, drift } = bubble.motionProfile
      const currentTime = animation.currentTime
      animation.effect.setKeyframes([
        { transform: 'translate3d(0,0,0)', opacity: 0 },
        { transform: `translate3d(${drift * .15}px,${-rise * .18}px,0)`, opacity: .48, offset: .18 },
        { transform: `translate3d(${drift * .8}px,${-rise * .8}px,0)`, opacity: .34, offset: .8 },
        { transform: `translate3d(${drift}px,${-rise}px,0)`, opacity: 0 },
      ])
      animation.currentTime = currentTime
    })
    sync()
  }

  function reveal() {
    revealed = true
    content.classList.add('is-revealed')
    sync()
  }

  function observe() {
    observer?.disconnect()
    if (reducedMotion.matches) {
      section.classList.remove('is-motion-ready')
      reveal()
    } else {
      section.classList.add('is-motion-ready')
    }
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
      if (visible && !revealed) reveal()
      sync()
    }, { rootMargin: '0px 0px -24px 0px', threshold: .15 })
    observer.observe(content)
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(section)
  const menuObserver = new MutationObserver(sync)
  if (menu) menuObserver.observe(menu, { attributes: true, attributeFilter: ['open'] })
  menuObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  reducedMotion.addEventListener('change', () => { observe(); resize() }, { signal })
  mobile.addEventListener('change', resize, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  resize()
  observe()

  return () => {
    disposed = true
    observer?.disconnect()
    resizeObserver.disconnect()
    menuObserver.disconnect()
    controller.abort()
    animations.forEach(animation => animation.cancel())
    atmosphere.remove()
    section.classList.remove('is-motion-ready')
    content.classList.remove('is-revealed')
  }
}
