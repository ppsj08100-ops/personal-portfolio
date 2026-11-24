import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './process-descent-transition.css'

gsap.registerPlugin(ScrollTrigger)

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }
const random = seed => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }
const tau = Math.PI * 2

/** One native viewport crossing descends from 08 into the original archive. */
export function initProcessDescentTransition(chapter) {
  const source = document.querySelector('#diptyque-together')
  const sourceChapter = source?.closest('.project-details')
  const sourceTrack = sourceChapter?.querySelector(':scope > .project-details__stage > .project-pages')
  const sourceFigure = source?.querySelector('.project-exhibition')
  const section = chapter?.querySelector('#diptyque-planning')
  const scene = section?.querySelector('.process-exhibit')
  if (!chapter || !sourceFigure || !scene) return () => {}

  const layer = document.createElement('div')
  layer.className = 'process-descent-transition'
  layer.dataset.descentStyle = 'depth-discovery'
  layer.setAttribute('aria-hidden', 'true')
  layer.hidden = true
  const light = document.createElement('canvas')
  const particles = document.createElement('canvas')
  light.dataset.descentLight = ''
  particles.dataset.descentParticles = ''
  layer.append(light, particles)
  document.body.append(layer)
  const lightContext = light.getContext('2d')
  const particleContext = particles.getContext('2d')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const entryProperties = ['--process-arrival', '--process-depth-visibility', '--process-frame-visibility',
    '--process-document-visibility', '--process-copy-visibility', '--process-detail-visibility']
  const originalStyles = [
    ...entryProperties.map(name => ({ element: chapter, name })),
    { element: sourceChapter, name: '--process-source-opacity' },
  ].map(record => ({ ...record, value: record.element.style.getPropertyValue(record.name), priority: record.element.style.getPropertyPriority(record.name) }))
  const hadEntryClass = chapter.classList.contains('has-process-depth-entry')
  const hadSourceClass = sourceChapter.classList.contains('has-process-depth-source')
  const visibilityAttributes = [
    { element: chapter, name: 'data-process-copy-hidden' },
    { element: chapter, name: 'data-process-detail-hidden' },
    { element: sourceChapter, name: 'data-process-source-hidden' },
  ].map(record => ({ ...record, value: record.element.getAttribute(record.name) }))
  const menu = document.querySelector('#portfolio-menu')
  const copyElements = [source.querySelector('.project-overview__copy'), section.querySelector('.project-planning__content')].filter(Boolean)
  const frameElements = [...sourceFigure.querySelectorAll('.project-exhibition__exhibit'), ...scene.querySelectorAll('[data-process-contact]')]
  const navigationElements = [sourceChapter, chapter].map(root => root.querySelector(':scope > .project-details__stage > .project-pages__navigation')).filter(Boolean)
  let disposed = false
  let progress = 0
  let frame = 0
  let width = document.documentElement.clientWidth
  let height = innerHeight

  function prepare(canvas, context) {
    const density = Math.min(devicePixelRatio || 1, 1.5, 1800 / Math.max(width, height))
    const w = Math.ceil(width * density), h = Math.ceil(height * density)
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    context.setTransform(density, 0, 0, density, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1
    context.shadowBlur = 0
    context.filter = 'none'
    context.clearRect(0, 0, width, height)
  }

  function opacityOf(element, cache) {
    if (!element || element === document.body) return 1
    if (cache.has(element)) return cache.get(element)
    const opacity = Number(getComputedStyle(element).opacity) * opacityOf(element.parentElement, cache)
    cache.set(element, opacity)
    return opacity
  }

  function regions(elements, cache) {
    return elements.flatMap(element => {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= height) return []
      const opacity = opacityOf(element, cache)
      return opacity > .001 ? [{ x: rect.x, y: rect.y, width: rect.width, height: rect.height, opacity }] : []
    })
  }

  // Documents occlude the water; reading areas use soft ellipses, never a plate.
  function protect(context, frames, reading) {
    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.shadowBlur = 0
    context.fillStyle = '#000'
    for (const rect of frames) {
      context.globalAlpha = rect.opacity
      context.beginPath()
      context.roundRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2, 6)
      context.fill()
    }
    context.globalAlpha = 1
    for (const rect of reading) {
      context.save()
      context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2)
      context.scale(rect.width * .72 + 16, rect.height * .72 + 20)
      const fade = context.createRadialGradient(0, 0, 0, 0, 0, 1)
      fade.addColorStop(0, `rgba(0,0,0,${rect.opacity * .98})`)
      fade.addColorStop(.6, `rgba(0,0,0,${rect.opacity * .94})`)
      fade.addColorStop(1, 'transparent')
      context.fillStyle = fade
      context.fillRect(-1, -1, 2, 2)
      context.restore()
    }
    context.restore()
  }

  function waterColumn(context, x, y, rx, ry, opacity) {
    context.save()
    context.translate(x, y)
    context.scale(rx, ry)
    const reflection = context.createRadialGradient(0, 0, 0, 0, 0, 1)
    reflection.addColorStop(0, `rgba(24,76,152,${opacity})`)
    reflection.addColorStop(.38, `rgba(2,37,107,${opacity * .6})`)
    reflection.addColorStop(1, 'transparent')
    context.fillStyle = reflection
    context.fillRect(-1, -1, 2, 2)
    context.restore()
  }

  function drawDepthLight() {
    const context = lightContext
    const waterY = height * (-.12 - progress * .68)
    const fading = 1 - smooth(.22, .82, progress)
    context.save()
    context.globalCompositeOperation = 'screen'
    // Faint vertical light recedes above the viewer; no horizontal streaks.
    waterColumn(context, width * .18, waterY, width * .2, height * .9, .085 * fading)
    waterColumn(context, width * .84, waterY - height * .2, width * .14, height * .75, .055 * fading)
    context.restore()
    light.dataset.waveCount = '0'
    light.dataset.waterLayers = '2'
    light.dataset.lightAxis = 'vertical'
    light.dataset.lightSignature = [progress.toFixed(5), waterY.toFixed(2), width, height].join(',')
  }

  function drawParticles() {
    const context = particleContext
    const mobile = width < 700
    const bubbleCount = mobile ? 10 : 16
    const planktonCount = mobile ? 28 : 44
    let visibleBubbles = 0
    let visiblePlankton = 0
    context.save()
    for (let index = 0; index < bubbleCount + planktonCount; index++) {
      const seed = index * 13 + 7
      const depth = .6 + random(seed) * .4
      const bubble = index < bubbleCount
      const lane = bubble ? index % 2 ? .04 + random(seed + 1) * .26 : .7 + random(seed + 1) * .26 : .04 + random(seed + 1) * .92
      const x = width * lane + Math.sin(progress * 2.4 + seed) * (bubble ? 12 : 4)
      const travel = bubble ? 2.1 : .6
      // Spread near bubbles through the whole crossing, without random gaps.
      const origin = bubble ? (index + random(seed + 2) * .7) / bubbleCount : random(seed + 2)
      const y = height * (origin * (1 + travel) - progress * travel)
      if (y < -12 || y > height + 12) continue
      const shimmer = .72 + Math.sin(seed + progress * 3) ** 2 * .28
      if (bubble) {
        visibleBubbles++
        const radius = 1.8 + random(seed + 3) * 2.8
        context.lineWidth = .7
        context.strokeStyle = `rgba(166,195,229,${(.2 + depth * .25) * shimmer})`
        context.fillStyle = 'rgba(166,195,229,.025)'
        context.beginPath()
        context.arc(x, y, radius, 0, tau)
        context.fill()
        context.stroke()
        context.strokeStyle = `rgba(220,234,247,${(.4 + depth * .3) * shimmer})`
        context.beginPath()
        context.ellipse(x - radius * .15, y - radius * .13, radius * .76, radius * .72, -.4, Math.PI * 1.02, Math.PI * 1.62)
        context.stroke()
      } else {
        visiblePlankton++
        const radius = .4 + random(seed + 3) * .5
        context.fillStyle = `rgba(166,195,229,${(.12 + depth * .14) * shimmer})`
        context.beginPath()
        context.arc(x, y, radius, 0, tau)
        context.fill()
      }
    }
    context.restore()
    particles.dataset.bubbleCount = String(bubbleCount)
    particles.dataset.planktonCount = String(planktonCount)
    particles.dataset.visibleBubbles = String(visibleBubbles)
    particles.dataset.visiblePlankton = String(visiblePlankton)
    particles.dataset.nearTravel = (height * 2.1).toFixed(2)
    particles.dataset.farTravel = (height * .6).toFixed(2)
    particles.dataset.particleSignature = [progress.toFixed(5), width, height].join(',')
  }

  function setVariable(element, name, value) {
    const text = value.toFixed(5)
    if (element.style.getPropertyValue(name) !== text) element.style.setProperty(name, text)
  }

  function draw() {
    if (disposed) return
    const paged = chapter.classList.contains('is-project-paged') && sourceChapter.classList.contains('is-project-paged')
    const page = Number(chapter.dataset.projectPage || 0)
    const sourceIndex = Number(sourceChapter.dataset.projectPageIndex || 0)
    const sourceActive = sourceTrack?.children[sourceIndex] === source
    const enabled = paged && !reduced.matches && sourceActive && page < .1
    chapter.classList.toggle('has-process-depth-entry', enabled)
    sourceChapter.classList.toggle('has-process-depth-source', enabled)
    const stages = [smooth(.44, .96, progress), smooth(.18, .62, progress), smooth(.44, .66, progress),
      smooth(.58, .82, progress), smooth(.72, .96, progress), smooth(.78, 1, progress)]
    entryProperties.forEach((name, index) => setVariable(chapter, name, enabled ? stages[index] : 1))
    const sourceOpacity = enabled ? 1 - smooth(.04, .48, progress) : 1
    setVariable(sourceChapter, '--process-source-opacity', sourceOpacity)
    chapter.toggleAttribute('data-process-copy-hidden', enabled && stages[4] < .05)
    chapter.toggleAttribute('data-process-detail-hidden', enabled && stages[5] < .05)
    sourceChapter.toggleAttribute('data-process-source-hidden', enabled && sourceOpacity < .05)
    layer.dataset.descentProgress = progress.toFixed(5)
    layer.dataset.descentPhase = progress < .2 ? 'departing' : progress < .55 ? 'descending' : progress < .82 ? 'discovering' : progress < 1 ? 'arriving' : 'landed'
    const area = scene.getBoundingClientRect()
    const visible = enabled && !document.hidden && !menu?.open && !document.body.classList.contains('has-menu-open')
      && progress > .001 && progress < .999
      && area.bottom > -height * .15 && area.top < height * 2.2
    layer.hidden = !visible || !lightContext || !particleContext
    if (layer.hidden) return
    prepare(light, lightContext)
    prepare(particles, particleContext)
    const opacity = smooth(.01, .16, progress) * (1 - smooth(.62, .95, progress))
    light.style.opacity = opacity.toFixed(5)
    particles.style.opacity = opacity.toFixed(5)
    drawDepthLight()
    drawParticles()
    const cache = new Map()
    const frames = regions(frameElements, cache)
    const reading = regions([...copyElements, ...navigationElements], cache)
    protect(lightContext, frames, reading)
    protect(particleContext, frames, reading)
  }

  function followScrub() {
    frame = 0
    if (disposed) return
    draw()
    const scrubbing = ['diptyque-project-pages', 'diptyque-process-pages'].some(id => ScrollTrigger.getById(id)?.getTween()?.isActive())
    if (!layer.hidden && scrubbing) frame = requestAnimationFrame(followScrub)
  }

  function sync() {
    draw()
    if (!frame && !layer.hidden) frame = requestAnimationFrame(followScrub)
    if (layer.hidden && frame) { cancelAnimationFrame(frame); frame = 0 }
  }

  const boundary = () => ScrollTrigger.getById('diptyque-process-pages')?.start ?? chapter.getBoundingClientRect().top + scrollY
  const trigger = ScrollTrigger.create({
    id: 'process-seabed-descent', trigger: chapter, refreshPriority: -30,
    start: () => boundary() - innerHeight * .92,
    end: boundary,
    onUpdate: self => { progress = self.progress; sync() },
    onRefresh: self => { width = document.documentElement.clientWidth; height = innerHeight; progress = self.progress; sync() },
  })
  document.addEventListener('visibilitychange', sync, { signal: controller.signal })
  window.addEventListener('scroll', sync, { passive: true, signal: controller.signal })
  chapter.querySelector('.project-pages').addEventListener('scroll', sync, { passive: true, signal: controller.signal })
  section.addEventListener('scroll', sync, { passive: true, signal: controller.signal })
  reduced.addEventListener('change', sync, { signal: controller.signal })
  const state = new MutationObserver(sync)
  for (const element of [chapter, sourceChapter]) state.observe(element, { attributes: true, attributeFilter: ['data-project-page', 'data-project-page-index', 'class'] })
  state.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  if (menu) state.observe(menu, { attributes: true, attributeFilter: ['open'] })
  const resize = new ResizeObserver(sync)
  resize.observe(scene)
  progress = trigger.progress
  sync()

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    trigger.kill()
    controller.abort()
    state.disconnect()
    resize.disconnect()
    chapter.classList.toggle('has-process-depth-entry', hadEntryClass)
    sourceChapter.classList.toggle('has-process-depth-source', hadSourceClass)
    for (const { element, name, value, priority } of originalStyles) {
      if (value) element.style.setProperty(name, value, priority)
      else element.style.removeProperty(name)
    }
    for (const { element, name, value } of visibilityAttributes) {
      if (value === null) element.removeAttribute(name)
      else element.setAttribute(name, value)
    }
    light.width = light.height = particles.width = particles.height = 0
    layer.remove()
  }
}
