import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initShortForm(section) {
  if (!section) return () => {}
  const films = [...section.querySelectorAll('[data-short-film]')]
  const tabs = [...section.querySelectorAll('[data-short-tab]')]
  const videos = films.map(film => film.querySelector('video'))
  const details = [...section.querySelectorAll('[data-short-detail]')]
  const rail = section.querySelector('.short-form__rail')
  if (!films.length || films.length !== tabs.length || videos.some(video => !video)) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const manualPauses = new WeakSet()
  const internalPauses = new WeakSet()
  const animations = new Set()
  const visibleVideos = new WeakSet()
  let layoutFrame = 0
  let current = -1
  let visible = false

  function pause(video) {
    if (video.paused) return
    internalPauses.add(video)
    video.pause()
  }
  function playActive() {
    const video = videos[current]
    if (!video || !visible || document.hidden || reduced.matches || manualPauses.has(video)) return
    video.preload = 'metadata'
    video.play().catch(() => { /* Native controls remain available if autoplay is blocked. */ })
  }
  function revealCurrentTab(behavior = reduced.matches ? 'instant' : 'smooth') {
    if (!rail || current < 0 || rail.scrollWidth <= rail.clientWidth) return
    const bounds = rail.getBoundingClientRect()
    const tabBounds = tabs[current].getBoundingClientRect()
    const shift = tabBounds.left < bounds.left ? tabBounds.left - bounds.left
      : tabBounds.right > bounds.right ? tabBounds.right - bounds.right : 0
    if (shift) rail.scrollTo({ left: rail.scrollLeft + shift, behavior })
  }
  function refreshLayout() {
    cancelAnimationFrame(layoutFrame)
    layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; ScrollTrigger.refresh() })
  }
  function select(index, { animate = true, focus = false } = {}) {
    const next = (index + films.length) % films.length
    if (next === current) return
    const previousLayout = films[current]?.dataset.shortLayout || 'portrait'
    const direction = index < current ? -1 : 1
    videos.forEach(pause)
    animations.forEach(animation => animation.cancel())
    animations.clear()
    current = next
    visible = visibleVideos.has(videos[current])
    films.forEach((film, i) => {
      film.hidden = i !== current
      film.inert = i !== current
      tabs[i].setAttribute('aria-selected', String(i === current))
      tabs[i].tabIndex = i === current ? 0 : -1
    })
    section.dataset.shortFormIndex = String(current)
    const layout = films[current].dataset.shortLayout || 'portrait'
    section.dataset.shortFormLayout = layout
    let detailsChanged = false
    details.forEach(detail => {
      const hidden = Number(detail.dataset.shortDetail) !== current
      if (detail.hidden !== hidden) detailsChanged = true
      detail.hidden = hidden
      if (hidden && detail.open) detail.open = false
    })
    if (previousLayout !== layout || detailsChanged) refreshLayout()
    section.querySelector('[data-short-current]').textContent = String(current + 1).padStart(2, '0')
    revealCurrentTab()
    if (focus) tabs[current].focus({ preventScroll: true })
    if (animate) {
      section.querySelector('[data-short-status]').textContent = `영상 ${current + 1} / ${films.length} · ${films[current].querySelector('h3').textContent}`
      if (!reduced.matches) {
        const animation = films[current].animate([
          { opacity: 0, transform: `translateX(${direction * 24}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ], { duration: 520, easing: 'cubic-bezier(.22,.61,.36,1)' })
        animations.add(animation)
        animation.finished.then(() => animations.delete(animation), () => {})
      }
    }
    if (visible) videos[current].preload = 'metadata'
    playActive()
  }

  tabs.forEach((tab, index) => tab.addEventListener('click', () => select(index), { signal }))
  details.forEach(detail => detail.addEventListener('toggle', () => {
    if (!detail.hidden) refreshLayout()
  }, { signal }))
  section.querySelector('[data-short-previous]').addEventListener('click', () => select(current - 1), { signal })
  section.querySelector('[data-short-next]').addEventListener('click', () => select(current + 1), { signal })
  section.addEventListener('keydown', event => {
    if (event.target.closest('video, input, textarea, select, details')) return
    const destinations = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: films.length - 1 }
    if (!(event.key in destinations)) return
    event.preventDefault()
    select(destinations[event.key], { focus: true })
  }, { signal })
  videos.forEach((video, index) => {
    video.addEventListener('pause', () => {
      if (!internalPauses.delete(video)) manualPauses.add(video)
    }, { signal })
    video.addEventListener('play', () => manualPauses.delete(video), { signal })
    video.addEventListener('timeupdate', () => {
      const progress = Number.isFinite(video.duration) && video.duration > 0 ? video.currentTime / video.duration : 0
      tabs[index].style.setProperty('--film-progress', String(Math.min(1, Math.max(0, progress))))
    }, { signal })
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(pause)
    else playActive()
  }, { signal })
  reduced.addEventListener('change', () => {
    if (reduced.matches) videos.forEach(pause)
    else playActive()
  }, { signal })
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= .15) visibleVideos.add(entry.target)
      else visibleVideos.delete(entry.target)
    })
    visible = visibleVideos.has(videos[current])
    if (visible) playActive()
    else videos.forEach(pause)
  }, { threshold: [0, .15] })
  videos.forEach(video => observer.observe(video))
  select(0, { animate: false })
  let railWidth = 0
  const railSizeObserver = new ResizeObserver(() => {
    if (!rail || railWidth === rail.clientWidth) return
    railWidth = rail.clientWidth
    revealCurrentTab('instant')
  })
  if (rail) railSizeObserver.observe(rail)

  return () => {
    controller.abort()
    observer.disconnect()
    railSizeObserver.disconnect()
    cancelAnimationFrame(layoutFrame)
    videos.forEach(pause)
    animations.forEach(animation => animation.cancel())
    films.forEach(film => { film.inert = false })
    delete section.dataset.shortFormIndex
    delete section.dataset.shortFormLayout
  }
}
