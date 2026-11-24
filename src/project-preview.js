export function initProjectPreview(device) {
  const videos = [...(device?.querySelectorAll('video') ?? [])]
  const button = device?.querySelector('.project-story__playback')
  if (!videos.length || !button) return () => {}

  const controller = new AbortController()
  const exhibition = device.closest('.project-overview')
  const chapter = device.closest('.project-details')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let visible = false
  let choice = null
  let warmed = false
  const pending = new Set()
  const failed = new Set()
  let disposed = false
  videos.forEach(video => { video.muted = true })
  button.hidden = false

  const shouldPlay = () => !disposed && visible && !document.hidden
    && !device.closest('[inert], [hidden]') && !exhibition?.classList.contains('is-overview-open')
    && (!chapter?.classList.contains('is-project-paged') || chapter.classList.contains('is-project-ready'))
    && (choice === 'play' || (choice !== 'pause' && !reducedMotion.matches))

  function update() {
    if (disposed) return
    const playing = videos.some(video => !video.paused && !video.ended)
    const unavailable = failed.size === videos.length
    device.dataset.previewState = unavailable ? 'unavailable' : playing ? 'playing' : 'paused'
    button.dataset.state = playing ? 'playing' : 'paused'
    button.setAttribute('aria-pressed', String(playing))
    const label = `${device.dataset.projectPreview} 자동 스크롤 ${playing ? '일시정지' : '재생'}`
    button.setAttribute('aria-label', label)
    button.title = label
    button.hidden = unavailable
  }

  function warm() {
    if (warmed || disposed) return
    warmed = true
    videos.forEach(video => {
      video.preload = 'auto'
      video.load()
    })
    warmObserver.disconnect()
  }

  function sync() {
    if (!shouldPlay()) {
      videos.forEach(video => video.pause())
      update()
      return
    }
    warm()
    for (const video of videos) {
      if (!video.paused || pending.has(video) || failed.has(video)) continue
      pending.add(video)
      video.play().then(() => {
        pending.delete(video)
        if (!shouldPlay()) video.pause()
        update()
      }).catch(error => {
        pending.delete(video)
        // An interrupted visibility change is normal. A blocked autoplay keeps
        // the poster and play button available for a direct user gesture.
        if (error.name === 'NotAllowedError') {
          choice = 'pause'
          videos.forEach(video => video.pause())
        }
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
  const stateObserver = new MutationObserver(sync)
  for (let ancestor = device; ancestor; ancestor = ancestor.parentElement) {
    stateObserver.observe(ancestor, { attributes: true, attributeFilter: ancestor === exhibition || ancestor === chapter ? ['inert', 'hidden', 'class'] : ['inert', 'hidden'] })
  }

  button.addEventListener('click', () => {
    choice = videos.some(video => !video.paused) ? 'pause' : 'play'
    sync()
  }, { signal: controller.signal })
  document.addEventListener('visibilitychange', sync, { signal: controller.signal })
  reducedMotion.addEventListener('change', () => { choice = null; sync() }, { signal: controller.signal })
  videos.forEach(video => {
    ;['play', 'pause', 'ended'].forEach(name => video.addEventListener(name, update, { signal: controller.signal }))
    video.addEventListener('error', () => { failed.add(video); video.pause(); update() }, { signal: controller.signal })
  })
  update()

  return () => {
    disposed = true
    controller.abort()
    observer.disconnect()
    warmObserver.disconnect()
    stateObserver.disconnect()
    videos.forEach(video => video.pause())
    button.hidden = true
    delete device.dataset.previewState
  }
}
