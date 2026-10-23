export function initProjectPreview(device) {
  const video = device?.querySelector('video')
  const button = device?.querySelector('.project-story__playback')
  if (!video || !button) return () => {}

  const controller = new AbortController()
  const exhibition = device.closest('.project-overview')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let visible = false
  let choice = null
  let warmed = false
  let pending = false
  let failed = false
  let disposed = false
  video.muted = true
  button.hidden = false

  const shouldPlay = () => !disposed && !failed && visible && !document.hidden
    && (!exhibition || (!device.closest('[inert]') && !exhibition.classList.contains('is-overview-open')))
    && (choice === 'play' || (choice !== 'pause' && !reducedMotion.matches))

  function update() {
    if (disposed) return
    const playing = !video.paused && !video.ended
    device.dataset.previewState = failed ? 'unavailable' : playing ? 'playing' : 'paused'
    button.dataset.state = playing ? 'playing' : 'paused'
    button.setAttribute('aria-pressed', String(playing))
    const label = `${device.dataset.projectPreview} 자동 스크롤 ${playing ? '일시정지' : '재생'}`
    button.setAttribute('aria-label', label)
    button.title = label
    button.hidden = failed
  }

  function warm() {
    if (warmed || disposed) return
    warmed = true
    video.preload = 'auto'
    video.load()
    warmObserver.disconnect()
  }

  function sync() {
    if (!shouldPlay()) {
      video.pause()
      update()
      return
    }
    warm()
    if (video.paused && !pending) {
      pending = true
      video.play().then(() => {
        pending = false
        if (!shouldPlay()) video.pause()
        update()
      }).catch(error => {
        pending = false
        // An interrupted visibility change is normal. A blocked autoplay keeps
        // the poster and play button available for a direct user gesture.
        if (error.name === 'NotAllowedError') choice = 'pause'
        update()
        if (error.name === 'AbortError' && shouldPlay()) sync()
      })
    }
    update()
  }

  const warmObserver = new IntersectionObserver(entries => {
    if (!reducedMotion.matches && entries.some(entry => entry.isIntersecting)) warm()
  }, { rootMargin: '100% 0px' })
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .1)
    sync()
  }, { threshold: [0, .1] })
  warmObserver.observe(device)
  observer.observe(device)
  const stateObserver = exhibition ? new MutationObserver(sync) : null
  if (stateObserver) {
    for (let ancestor = exhibition; ancestor; ancestor = ancestor.parentElement) {
      stateObserver.observe(ancestor, { attributes: true, attributeFilter: ancestor === exhibition ? ['inert', 'class'] : ['inert'] })
    }
  }

  button.addEventListener('click', () => {
    choice = video.paused ? 'play' : 'pause'
    sync()
  }, { signal: controller.signal })
  document.addEventListener('visibilitychange', sync, { signal: controller.signal })
  reducedMotion.addEventListener('change', () => { choice = null; sync() }, { signal: controller.signal })
  ;['play', 'pause', 'ended'].forEach(name => video.addEventListener(name, update, { signal: controller.signal }))
  video.addEventListener('error', () => { failed = true; video.pause(); update() }, { signal: controller.signal })
  update()

  return () => {
    disposed = true
    controller.abort()
    observer.disconnect()
    warmObserver.disconnect()
    stateObserver?.disconnect()
    video.pause()
    button.hidden = true
    delete device.dataset.previewState
  }
}
