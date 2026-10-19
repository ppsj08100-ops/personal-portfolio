import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createDescentParticles } from './ocean-descent-particles.js'

gsap.registerPlugin(ScrollTrigger)

const clamp = value => Math.max(0, Math.min(1, value))
const range = (value, from, to) => clamp((value - from) / (to - from))
const smooth = value => value * value * (3 - 2 * value)
const mix = (a, b, t) => a + (b - a) * t

export function initOceanDescent(section) {
  if (!section) return () => {}
  const stage = section.querySelector('.ocean-type__stage')
  const scene = section.querySelector('.ocean-descent')
  const ceiling = scene?.querySelector('.ocean-descent__ceiling')
  const shade = scene?.querySelector('.ocean-descent__shade')
  const article = section.querySelector('.sail-project')
  const environment = article?.querySelector('.sail-project__environment')
  const surface = article?.querySelector('.sail-project__surface')
  const waves = section.querySelector('.ocean-type__waves')
  const front = waves?.querySelector('.ocean-type__layer--front')
  const back = waves?.querySelector('.ocean-type__layer--back')
  const typeWindow = section.querySelector('.ocean-type__type-window')
  const label = section.querySelector('.ocean-type__label')
  const explore = section.querySelector('.ocean-type__explore')
  if (!stage || !scene || !ceiling || !shade || !environment || !surface || !front || !back) return () => {}
  const text = [...article.querySelectorAll('[data-project-reveal]')]
  const media = gsap.matchMedia()
  const controller = new AbortController()
  const { signal } = controller
  let jumpToProject
  let jumpAnimation
  let refreshFrame = 0
  let restoreFrame = 0
  let activeTrigger
  let lastProgress = 0
  let resumeProgress = null
  let destroyed = false
  let viewport = { width: innerWidth, height: innerHeight }

  function needsRestore(before, after) {
    if (before.width !== after.width || (before.height >= 700) !== (after.height >= 700)) return true
    return before.height !== after.height
      && (!matchMedia('(pointer: coarse)').matches || Math.abs(before.height - after.height) >= 100)
  }
  function rememberProgress(reverting = false) {
    const within = activeTrigger?.isActive || (reverting && activeTrigger && lastProgress > 0 && lastProgress < 1)
    if (!destroyed && resumeProgress === null && within) resumeProgress = lastProgress
  }
  function restoreProgress() {
    if (resumeProgress === null || destroyed) return
    cancelAnimationFrame(restoreFrame)
    restoreFrame = requestAnimationFrame(() => {
      if (destroyed || resumeProgress === null) return
      const progress = resumeProgress
      resumeProgress = null
      if (activeTrigger) {
        window.scrollTo({ top: activeTrigger.start + (activeTrigger.end - activeTrigger.start) * progress, behavior: 'instant' })
        ScrollTrigger.update()
      } else article.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  }
  window.addEventListener('resize', () => {
    const next = { width: innerWidth, height: innerHeight }
    if (needsRestore(viewport, next)) {
      rememberProgress()
      jumpAnimation?.kill()
    }
    viewport = next
  }, { signal })
  function cancelRestore(event) {
    if (event.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return
    resumeProgress = null
    cancelAnimationFrame(restoreFrame)
    jumpAnimation?.kill()
    jumpAnimation = null
  }
  ;['wheel', 'touchstart', 'keydown'].forEach(name => window.addEventListener(name, cancelRestore, { passive: true, signal }))
  ScrollTrigger.addEventListener('refresh', restoreProgress)
  const rememberMediaProgress = () => rememberProgress(true)
  gsap.addEventListener('matchMediaInit', rememberMediaProgress)
  gsap.addEventListener('matchMedia', restoreProgress)

  const assets = [...section.querySelectorAll('img')]
  const assetObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    assets.forEach(image => { image.loading = 'eager' })
    assetObserver.disconnect()
  }, { rootMargin: '120% 0px' })
  assetObserver.observe(section)

  media.add({
    motion: '(prefers-reduced-motion: no-preference)',
    tall: '(min-height: 700px)',
    phone: '(max-width: 767px)',
  }, context => {
    if (!context.conditions.motion || !context.conditions.tall) return
    section.classList.add('is-descent-ready')
    const state = { progress: 0 }
    const particles = createDescentParticles(scene.querySelector('canvas'))
    let layout
    let disposed = false
    let lastMode = ''
    let waterTime = 0
    let sceneVisible = false
    let ticking = false
    let particlesVisible = false
    let currentAtEntry = -2
    let observedSize = ''
    // Keep the existing chapter's trigger and runway hooks so its eight
    // horizontal pages begin exactly after the descent is complete.
    const runway = () => Math.round(innerHeight * (context.conditions.phone ? 1 : 1.1))

    function measure() {
      section.style.setProperty('--sail-runway', `${runway()}px`)
      const width = stage.clientWidth
      const height = stage.clientHeight
      if (layout && needsRestore(layout, { width, height })) rememberProgress()
      layout = { width, height }
      particles.resize(width, height)
      observedSize = `${width}:${height}`
    }
    function fade(element, opacity, y = 0) {
      element.style.opacity = opacity.toFixed(4)
      element.style.visibility = opacity <= 0 ? 'hidden' : 'visible'
      if (y) element.style.transform = `translate3d(0,${y.toFixed(3)}px,0)`
      else element.style.removeProperty('transform')
    }
    function tickWater(_time, deltaTime) {
      waterTime += Math.min(deltaTime / 1000, .05)
      render()
    }
    function syncPlayback() {
      const playing = !disposed && sceneVisible && !document.hidden && state.progress < .98
      if (playing === ticking) return
      ticking = playing
      if (playing) gsap.ticker.add(tickWater)
      else gsap.ticker.remove(tickWater)
    }
    function render() {
      if (!layout || disposed) return
      const p = clamp(state.progress)
      const { width, height } = layout
      lastProgress = p
      const leaveType = smooth(range(p, 0, .18))
      const passSurface = smooth(range(p, 0, .34))
      const recede = smooth(range(p, 0, .7))
      const approach = smooth(range(p, .08, .62))
      const reveal = smooth(range(p, .25, .72))
      const sceneAlpha = smooth(range(p, 0, .12)) * (1 - smooth(range(p, .58, .9)))

      // The crests pass overhead first. The same current continues from the
      // typography; there is no incoming object or framed image aperture.
      if (!lastMode || p === 0) {
        const live = parseFloat(section.style.getPropertyValue('--wave-current-x'))
        currentAtEntry = Number.isFinite(live) ? live : -2
      }
      const nearBob = Math.sin(waterTime * .85) * 5 * (1 - passSurface)
      const farBob = Math.sin(waterTime * .7 + 1) * 3 * (1 - passSurface)
      waves.style.transform = `translate3d(${(currentAtEntry * width / 100).toFixed(3)}px,${(-height * 1.05 * passSurface).toFixed(3)}px,0)`
      waves.style.opacity = (1 - smooth(range(p, .15, .38))).toFixed(4)
      front.style.transform = `translate3d(0,${nearBob.toFixed(3)}px,0) scaleY(${mix(1, .9, passSurface).toFixed(4)})`
      back.style.transform = `translate3d(0,${(farBob - height * .08 * passSurface).toFixed(3)}px,0) scaleY(${mix(1, .93, passSurface).toFixed(4)})`

      scene.style.opacity = sceneAlpha.toFixed(4)
      ceiling.style.transform = `translate3d(0,${mix(height * .1, -height * .24, recede).toFixed(3)}px,0) scale(${mix(1.04, 1, recede).toFixed(4)})`
      // Hold the overhead light until the seabed's own light has taken over.
      ceiling.style.opacity = (1 - smooth(range(approach, .55, 1))).toFixed(4)
      shade.style.opacity = mix(.1, .45, smooth(range(p, .15, .6))).toFixed(4)
      if (p > .08 && p < .95) {
        particles.render(p, waterTime)
        particlesVisible = true
      } else if (particlesVisible) {
        particles.render(0, waterTime)
        particlesVisible = false
      }

      // The seabed rises out of the blue distance, then settles into the exact
      // existing cover composition. Keep the project's screen pixels rigid.
      article.style.setProperty('--seabed-reveal', approach.toFixed(4))
      article.style.setProperty('--project-depth', smooth(range(p, .4, .85)).toFixed(4))
      // The overscan covers the viewport throughout the small rise, so both
      // images can crossfade in full without a mask cutting through the rays.
      environment.style.transform = `translate3d(0,${((1 - approach) * height * .08).toFixed(3)}px,0) scale(${mix(1.2, 1, approach).toFixed(4)})`
      surface.style.transform = `translate3d(0,${((1 - reveal) * height * .1).toFixed(3)}px,0) scale(${mix(.9, 1, reveal).toFixed(4)})`
      surface.style.opacity = reveal.toFixed(4)
      surface.style.visibility = reveal > 0 ? 'visible' : 'hidden'
      surface.style.filter = reveal < 1 ? `blur(${((1 - reveal) * 3).toFixed(3)}px)` : 'none'

      fade(typeWindow, 1 - leaveType, -height * .08 * leaveType)
      fade(label, 1 - leaveType, -height * .04 * leaveType)
      fade(explore, 1 - leaveType, -height * .04 * leaveType)
      const ranges = [[.45, .7], [.49, .75], [.55, .8], [.58, .84]]
      text.forEach((element, index) => {
        const amount = smooth(range(p, ...ranges[index]))
        fade(element, amount, 16 * (1 - amount))
      })
      const readable = p >= .9
      article.inert = !readable
      article.classList.toggle('is-readable', readable)
      section.dataset.descentProgress = p.toFixed(4)
      const mode = p <= 0 ? 'type' : p < .32 ? 'immersing' : 'deep'
      if (mode !== lastMode) {
        lastMode = mode
        section.classList.toggle('is-descending', p > 0)
        section.classList.toggle('is-submerged', p >= .32)
        section.dispatchEvent(new Event('depth-statechange'))
      }
      syncPlayback()
    }

    measure()
    const start = () => ScrollTrigger.getById('work-tidal-type')?.end
      ?? section.getBoundingClientRect().top + scrollY + (parseFloat(section.style.getPropertyValue('--ocean-type-runway')) || 0)
    const animation = gsap.to(state, {
      progress: 1, duration: 1, ease: 'none', onUpdate: render,
      scrollTrigger: {
        id: 'sail-to-project', trigger: section, refreshPriority: -11,
        start, end: () => start() + runway(), scrub: .4,
        invalidateOnRefresh: true, onRefreshInit: measure, onRefresh: render,
      },
    })
    activeTrigger = animation.scrollTrigger
    render()
    const observer = new IntersectionObserver(entries => {
      sceneVisible = entries.some(entry => entry.isIntersecting)
      syncPlayback()
    })
    observer.observe(stage)
    document.addEventListener('visibilitychange', syncPlayback)
    jumpToProject = () => {
      jumpAnimation?.kill()
      const position = { y: scrollY }
      jumpAnimation = gsap.to(position, {
        y: animation.scrollTrigger.end + 2, duration: 1.8, ease: 'power2.inOut',
        onUpdate: () => window.scrollTo({ top: position.y, behavior: 'instant' }),
        onComplete: () => {
          jumpAnimation = null
          animation.progress(1)
          render()
          article.focus({ preventScroll: true })
        },
      })
    }
    function refresh() {
      cancelAnimationFrame(refreshFrame)
      refreshFrame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh(true) })
    }
    const dimensions = new ResizeObserver(() => {
      const size = `${stage.clientWidth}:${stage.clientHeight}`
      if (size !== observedSize) refresh()
    })
    dimensions.observe(stage)
    document.fonts.ready.then(refresh)
    return () => {
      disposed = true
      rememberProgress(true)
      activeTrigger = undefined
      jumpAnimation?.kill()
      jumpAnimation = null
      cancelAnimationFrame(refreshFrame)
      dimensions.disconnect()
      observer.disconnect()
      particles.destroy()
      gsap.ticker.remove(tickWater)
      document.removeEventListener('visibilitychange', syncPlayback)
      jumpToProject = undefined
      animation.scrollTrigger?.kill()
      animation.kill()
      section.classList.remove('is-descent-ready', 'is-descending', 'is-submerged')
      section.style.removeProperty('--sail-runway')
      delete section.dataset.descentProgress
      article.inert = false
      article.classList.remove('is-readable')
      article.style.removeProperty('--seabed-reveal')
      article.style.removeProperty('--project-depth')
      ;[scene, ceiling, shade, waves, front, back, environment, surface, typeWindow, label, explore, ...text].forEach(element => element.removeAttribute('style'))
      section.dispatchEvent(new Event('depth-statechange'))
    }
  })

  explore.addEventListener('click', event => {
    if (!jumpToProject || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    jumpToProject()
  }, { signal })
  return () => {
    destroyed = true
    controller.abort()
    jumpAnimation?.kill()
    cancelAnimationFrame(refreshFrame)
    cancelAnimationFrame(restoreFrame)
    ScrollTrigger.removeEventListener('refresh', restoreProgress)
    gsap.removeEventListener('matchMediaInit', rememberMediaProgress)
    gsap.removeEventListener('matchMedia', restoreProgress)
    assetObserver.disconnect()
    media.revert()
  }
}
