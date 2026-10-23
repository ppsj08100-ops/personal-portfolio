import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initProjectPreview } from './project-preview.js'

gsap.registerPlugin(ScrollTrigger)

const defaultTiming = { entry: .18, slide: 1, between: .3, exit: .22 }
const voyageTiming = { entry: .3, slide: 1, between: .65, exit: .45 }
const transitionProperties = ['--chapter-visibility', '--chapter-copy-visibility', '--chapter-travel-x', '--chapter-settle-y', '--chapter-scale']

function smoothRange(start, end, value) {
  const progress = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return progress * progress * (3 - 2 * progress)
}

export function initProjectCase(section, { id = 'diptyque-project-pages' } = {}) {
  const chapter = section?.closest('.project-details')
  const stage = chapter?.querySelector('.project-details__stage')
  const track = stage?.querySelector('.project-pages')
  if (!track) return () => {}
  const isVoyage = chapter.classList.contains('project-details--voyage')
  const timing = isVoyage ? voyageTiming : defaultTiming
  const voyage = chapter.closest('.ocean-type.has-sail')
  const runwayHost = voyage || chapter
  const destroyPreviews = [...chapter.querySelectorAll('[data-project-preview]')].map(initProjectPreview)

  const pages = [...track.children]
  const sceneRoots = isVoyage ? pages.map(page => page.matches('.project-overview, .sail-project--seabed')
    ? page : page.querySelector('.sail-project--seabed')) : []
  const duration = timing.entry + (pages.length - 1) * timing.slide
    + Math.max(0, pages.length - 2) * timing.between + timing.exit
  const pageProgress = pages.map((_, index) => index === 0 ? 0
    : (timing.entry + index * timing.slide + (index - 1) * timing.between
      + (index === pages.length - 1 ? timing.exit : timing.between) / 2) / duration)
  const navigation = stage.querySelector('.project-pages__navigation')
  const buttons = [...navigation.querySelectorAll('[data-project-page]')]
  const media = gsap.matchMedia()
  const controller = new AbortController()
  const assetObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    track.querySelectorAll('img').forEach(image => { image.loading = 'eager' })
    assetObserver.disconnect()
  }, { rootMargin: '100% 0px' })
  assetObserver.observe(chapter)
  let activeTrigger
  let lastProgress = 0
  let lastPage = 0
  let activeIndex = -1
  let resume = null
  let restoreFrame
  let destroyed = false
  let stageVisible = false
  let viewport = { width: innerWidth, height: innerHeight }
  let previousScenePage = 0
  let sceneDirection = 1
  const stageObserver = new IntersectionObserver(entries => {
    stageVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5)
  }, { threshold: [0, .5] })
  stageObserver.observe(stage)

  function clearSceneTransition() {
    sceneRoots.forEach(scene => transitionProperties.forEach(property => scene?.style.removeProperty(property)))
    chapter.style.removeProperty('--chapter-shift')
    chapter.style.removeProperty('--chapter-flow')
    previousScenePage = 0
    sceneDirection = 1
  }

  function renderSceneTransition(pagePosition) {
    if (!isVoyage) return
    if (Math.abs(pagePosition - previousScenePage) > .0001) sceneDirection = pagePosition > previousScenePage ? 1 : -1
    previousScenePage = pagePosition
    chapter.style.setProperty('--chapter-flow', String(sceneDirection))
    chapter.style.setProperty('--chapter-shift', smoothRange(0, .5, Math.abs(pagePosition - Math.round(pagePosition))).toFixed(4))
    sceneRoots.forEach((scene, index) => {
      if (!scene) return
      const offset = Math.max(-1, Math.min(1, index - pagePosition))
      const distance = Math.abs(offset)
      const recession = smoothRange(0, .95, distance)
      scene.style.setProperty('--chapter-visibility', (1 - recession * .65).toFixed(4))
      scene.style.setProperty('--chapter-copy-visibility', (1 - smoothRange(.08, .42, distance)).toFixed(4))
      scene.style.setProperty('--chapter-travel-x', `${(offset * 20).toFixed(3)}px`)
      scene.style.setProperty('--chapter-settle-y', `${(recession * 14).toFixed(3)}px`)
      scene.style.setProperty('--chapter-scale', (1 - recession * .015).toFixed(4))
    })
  }

  function select(index) {
    if (index === activeIndex) return
    activeIndex = index
    pages.forEach((page, i) => { page.inert = i !== index })
    buttons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'page')
      else button.removeAttribute('aria-current')
    })
    chapter.dataset.projectPageIndex = String(index)
  }

  function nativePage() {
    if (activeTrigger || destroyed) return
    lastPage = track.scrollLeft / Math.max(1, track.clientWidth)
    select(Math.max(0, Math.min(pages.length - 1, Math.round(lastPage))))
  }

  function remember() {
    if (destroyed || resume) return
    // A width change reflows preceding sections before resize handlers run.
    // The active trigger still knows that this chapter was being viewed.
    // The cached intersection also covers the native horizontal layout when
    // a resize reflows the chapter before its new scroll trigger is created.
    if (!activeTrigger?.isActive && !stageVisible) {
      const rect = chapter.getBoundingClientRect()
      if (rect.top > 0 || rect.bottom < innerHeight - 2) return
    }
    if (activeTrigger && lastProgress > 0) resume = { progress: lastProgress, page: lastPage }
    else if (!activeTrigger && lastPage > 0) resume = { progress: pageProgress[Math.round(lastPage)], page: lastPage }
  }

  function restore() {
    if (!resume || destroyed) return
    cancelAnimationFrame(restoreFrame)
    restoreFrame = requestAnimationFrame(() => {
      if (!resume || destroyed) return
      const saved = resume
      resume = null
      if (activeTrigger) {
        window.scrollTo({ top: activeTrigger.start + saved.progress * (activeTrigger.end - activeTrigger.start), behavior: 'instant' })
        ScrollTrigger.update()
      } else {
        track.scrollTo({ left: Math.round(saved.page) * track.clientWidth, behavior: 'instant' })
        stage.scrollIntoView({ block: 'start', behavior: 'instant' })
        nativePage()
      }
    })
  }

  window.addEventListener('resize', () => {
    const next = { width: innerWidth, height: innerHeight }
    const changed = viewport.width !== next.width || (viewport.height >= 700) !== (next.height >= 700)
      || (!matchMedia('(pointer: coarse)').matches && viewport.height !== next.height)
    if (changed) remember()
    viewport = next
  }, { signal: controller.signal })
  function cancelRestore(event) {
    if (event.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return
    resume = null
    cancelAnimationFrame(restoreFrame)
  }
  ;['wheel', 'touchstart', 'keydown'].forEach(name => window.addEventListener(name, cancelRestore, { passive: true, signal: controller.signal }))
  track.addEventListener('scroll', nativePage, { passive: true, signal: controller.signal })
  ScrollTrigger.addEventListener('refresh', restore)
  gsap.addEventListener('matchMediaInit', remember)
  gsap.addEventListener('matchMedia', restore)

  media.add('(prefers-reduced-motion: no-preference) and (min-height: 700px)', () => {
    const position = { page: 0 }
    chapter.classList.add('is-project-paged')
    track.scrollLeft = 0
    const runway = () => Math.round(stage.clientHeight
      * (isVoyage ? innerWidth < 768 ? 1.8 : 2.3 : innerWidth < 768 ? 1.25 : 1.55)
      * (pages.length - 1))
    const measure = () => runwayHost.style.setProperty('--project-pages-runway', `${runway()}px`)
    const start = () => voyage
      ? ScrollTrigger.getById('sail-to-project')?.end ?? voyage.getBoundingClientRect().top + scrollY
        + (parseFloat(voyage.style.getPropertyValue('--ocean-type-runway')) || 0)
        + (parseFloat(voyage.style.getPropertyValue('--sail-runway')) || 0)
      : chapter.getBoundingClientRect().top + scrollY
    let animation
    let wasReady
    function syncReadiness() {
      const ready = !voyage || scrollY >= (animation?.scrollTrigger?.start ?? start()) - 1
      if (ready === wasReady) return
      wasReady = ready
      chapter.classList.toggle('is-project-ready', ready)
      navigation.inert = !ready
    }
    function render() {
      lastPage = position.page
      lastProgress = animation?.scrollTrigger?.progress ?? 0
      track.style.transform = `translate3d(${(-position.page * stage.clientWidth).toFixed(3)}px,0,0)`
      chapter.dataset.projectPage = position.page.toFixed(4)
      renderSceneTransition(position.page)
      select(Math.max(0, Math.min(pages.length - 1, Math.round(position.page))))
      syncReadiness()
    }
    measure()
    animation = gsap.timeline({
      onUpdate: render,
      scrollTrigger: {
        id, trigger: chapter, refreshPriority: -12,
        start, end: () => start() + runway(), scrub: isVoyage ? .5 : .25,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: render,
      },
    })
    // The completed cover is the first page; its seven details continue to its right.
    animation.to({}, { duration: timing.entry })
    pages.slice(1).forEach((_, index) => {
      animation.to(position, { page: index + 1, duration: timing.slide, ease: 'sine.inOut' })
        .to({}, { duration: index === pages.length - 2 ? timing.exit : timing.between })
    })
    activeTrigger = animation.scrollTrigger
    render()
    // INTRO rests at timeline zero. A reverse scroll can leave that value
    // unchanged, so update the navigation boundary independently of animation.
    if (voyage) window.addEventListener('scroll', syncReadiness, { passive: true })
    return () => {
      remember()
      activeTrigger = undefined
      if (voyage) window.removeEventListener('scroll', syncReadiness)
      chapter.classList.remove('is-project-paged', 'is-project-ready')
      navigation.inert = false
      runwayHost.style.removeProperty('--project-pages-runway')
      track.style.removeProperty('transform')
      delete chapter.dataset.projectPage
      clearSceneTransition()
      nativePage()
    }
  })

  buttons.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.projectPage)
    if (activeTrigger) {
      window.scrollTo({ top: activeTrigger.start + pageProgress[index] * (activeTrigger.end - activeTrigger.start), behavior: 'instant' })
      ScrollTrigger.update()
    } else {
      track.scrollTo({ left: index * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    }
  }, { signal: controller.signal }))

  if (!activeTrigger) nativePage()
  return () => {
    destroyed = true
    controller.abort()
    destroyPreviews.forEach(destroy => destroy())
    assetObserver.disconnect()
    stageObserver.disconnect()
    cancelAnimationFrame(restoreFrame)
    ScrollTrigger.removeEventListener('refresh', restore)
    gsap.removeEventListener('matchMediaInit', remember)
    gsap.removeEventListener('matchMedia', restore)
    media.revert()
    clearSceneTransition()
    pages.forEach(page => { page.inert = false })
    delete chapter.dataset.projectPageIndex
  }
}
