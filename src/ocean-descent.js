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
  const ceilingImage = ceiling?.querySelector('img')
  const shade = scene?.querySelector('.ocean-descent__shade')
  const article = section.querySelector('.sail-project')
  const environment = article?.querySelector('.sail-project__environment')
  const surface = article?.querySelector('.sail-project__surface')
  const opening = section.querySelector('.ocean-type__opening')
  const entryScene = opening?.querySelector('.ocean-entry__scene')
  const typeWindow = section.querySelector('.ocean-type__type-window')
  const label = section.querySelector('.ocean-type__label')
  const explore = section.querySelector('.ocean-type__explore')
  if (!stage || !scene || !ceiling || !shade || !environment || !surface || !opening || !entryScene || !typeWindow || !label || !explore) return () => {}
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
    let particlesVisible = false
    let observedSize = ''
    // Keep the existing chapter's trigger and runway hooks so its eight
    // horizontal pages begin exactly after the descent is complete.
    const hasChapter = Boolean(section.querySelector('[data-work-chapter="team"]'))
    const runway = () => Math.round(innerHeight * (hasChapter ? context.conditions.phone ? 1.95 : 1.85 : context.conditions.phone ? 1.25 : 1.15))

    function measure() {
      section.style.setProperty('--sail-runway', `${runway()}px`)
      const width = stage.clientWidth
      const height = stage.clientHeight
      if (layout && needsRestore(layout, { width, height })) rememberProgress()
      layout = { width, height }
      particles.resize(width, height)
      // Keep the existing light direction on narrow portrait screens too.
      if (ceilingImage) {
        const crop = Math.min(1, ceiling.clientWidth / ceiling.clientHeight / 2)
        const left = Math.max(0, Math.min(1 - crop, .25 - .375 * crop))
        ceilingImage.style.objectPosition = `${(crop < .9999 ? left / (1 - crop) * 100 : 50).toFixed(3)}% 0`
      }
      observedSize = `${width}:${height}`
    }
    function fade(element, opacity, y = 0) {
      element.style.opacity = opacity.toFixed(4)
      element.style.visibility = opacity <= 0 ? 'hidden' : 'visible'
      if (y) element.style.transform = `translate3d(0,${y.toFixed(3)}px,0)`
      else element.style.removeProperty('transform')
    }
    function render() {
      if (!layout || disposed) return
      const raw = clamp(state.progress)
      const p = hasChapter ? range(raw, .4, 1) : raw
      lastProgress = raw
      const leaveType = hasChapter ? smooth(range(raw, .02, .17)) : smooth(range(p, .12, .52))
      const approach = smooth(hasChapter ? range(raw, .10, .68) : range(p, .20, .90))
      const reveal = smooth(hasChapter ? range(raw, .63, .92) : range(p, .20, .90))
      const sceneAlpha = smooth(range(p, .18, .40)) * (1 - smooth(range(p, .64, .96)))

      // Continue downward through the same water. No horizon, camera tilt,
      // or second immersion interrupts the mirror-to-exhibition connection.
      section.style.setProperty('--work-depth', p.toFixed(4))
      section.dataset.workChapterProgress = raw.toFixed(4)
      section.dispatchEvent(new CustomEvent('work-chapter-change', { detail: { progress: raw } }))
      section.dispatchEvent(new CustomEvent('work-depth-change', { detail: { progress: hasChapter ? range(raw, 0, .68) : p, descent: p } }))
      entryScene.style.transform = `translate3d(0,${(-24 * p).toFixed(3)}px,0)`
      opening.style.opacity = (1 - smooth(hasChapter ? range(raw, .03, .34) : range(p, .55, .94))).toFixed(4)
      opening.style.visibility = (hasChapter ? raw >= .36 : p >= .98) ? 'hidden' : 'visible'
      opening.inert = p >= .31
      scene.style.opacity = sceneAlpha.toFixed(4)
      ceiling.style.transform = `translate3d(0,${(-32 * p).toFixed(3)}px,0)`
      ceiling.style.opacity = (.32 * (1 - p)).toFixed(4)
      shade.style.opacity = mix(.06, .32, p).toFixed(4)
      if (p > .08 && p < .97) {
        particles.render(mix(.15, .90, p), p * 1.5)
        particlesVisible = true
      } else if (particlesVisible) {
        particles.render(0, 0)
        particlesVisible = false
      }

      // Reveal the first exhibit through the light while keeping every project
      // screen rigid and its final cover composition unchanged.
      article.style.setProperty('--seabed-reveal', approach.toFixed(4))
      article.style.setProperty('--project-depth', smooth(range(p, .60, .95)).toFixed(4))
      // Keep the background plane full bleed while the exhibit rises inside it.
      environment.style.transform = 'none'
      surface.style.transform = `translate3d(0,${((1 - reveal) * 28).toFixed(3)}px,0)`
      surface.style.opacity = reveal.toFixed(4)
      surface.style.visibility = reveal > 0 ? 'visible' : 'hidden'
      surface.style.filter = 'none'

      fade(typeWindow, 1 - leaveType, -18 * leaveType)
      fade(label, 1 - leaveType, -8 * leaveType)
      fade(explore, 1 - leaveType, -8 * leaveType)
      const ranges = hasChapter ? [[.58, .78], [.62, .84], [.68, .9], [.78, .98]]
        : [[.42, .66], [.46, .78], [.58, .86], [.65, .94]]
      text.forEach((element, index) => {
        const amount = smooth(range(hasChapter ? raw : p, ...ranges[index]))
        fade(element, amount, 16 * (1 - amount))
      })
      const readable = p >= .995
      article.inert = !readable
      article.classList.toggle('is-readable', readable)
      section.dataset.descentProgress = p.toFixed(4)
      const mode = p <= 0 ? 'intro' : p < .7 ? 'approaching' : 'exhibition'
      if (mode !== lastMode) {
        lastMode = mode
        section.classList.toggle('is-descending', p > 0)
        section.classList.toggle('is-submerged', p > 0)
        section.dispatchEvent(new Event('depth-statechange'))
      }
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
    jumpToProject = () => {
      jumpAnimation?.kill()
      const position = { y: scrollY }
      jumpAnimation = gsap.to(position, {
        y: animation.scrollTrigger.end + 2, duration: 1.4, ease: 'power2.inOut',
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
      particles.destroy()
      jumpToProject = undefined
      animation.scrollTrigger?.kill()
      animation.kill()
      section.classList.remove('is-descent-ready', 'is-descending', 'is-submerged')
      section.style.removeProperty('--sail-runway')
      delete section.dataset.workChapterProgress
      section.dispatchEvent(new CustomEvent('work-chapter-change', { detail: { progress: 0 } }))
      delete section.dataset.descentProgress
      section.style.removeProperty('--work-depth')
      section.dispatchEvent(new CustomEvent('work-depth-change', { detail: { progress: 0 } }))
      article.inert = false
      opening.inert = false
      article.classList.remove('is-readable')
      article.style.removeProperty('--seabed-reveal')
      article.style.removeProperty('--project-depth')
      ;[scene, ceiling, shade, opening, entryScene, environment, surface, typeWindow, label, explore, ...text].forEach(element => element.removeAttribute('style'))
      ceilingImage?.style.removeProperty('object-position')
      section.dispatchEvent(new Event('depth-statechange'))
    }
  })

  explore.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (jumpToProject) jumpToProject()
    else {
      article.scrollIntoView({ block: 'start', inline: 'start', behavior: 'instant' })
      article.focus({ preventScroll: true })
    }
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
