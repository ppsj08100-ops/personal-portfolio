import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './process-descent-transition.css'

gsap.registerPlugin(ScrollTrigger)

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }
const random = seed => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }
const tau = Math.PI * 2

/** Scroll through refracted water, then settle on the deeper archive floor. */
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
  layer.dataset.descentStyle = 'water-drift'
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
  const originalArrival = chapter.style.getPropertyValue('--process-arrival')
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

  function regions(elements) {
    return elements.flatMap(element => {
      const rect = element.getBoundingClientRect()
      const opacity = Number(getComputedStyle(element).opacity)
      return rect.width && rect.height && opacity > 0 && rect.bottom > 0 && rect.top < height
        ? [{ x: rect.x, y: rect.y, width: rect.width, height: rect.height, opacity }] : []
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

  function waterReflection(context, x, y, rx, ry, opacity) {
    context.save()
    context.translate(x, y)
    context.rotate(-.08)
    context.scale(rx, ry)
    const reflection = context.createRadialGradient(0, 0, 0, 0, 0, 1)
    reflection.addColorStop(0, `rgba(137,205,225,${opacity})`)
    reflection.addColorStop(.28, `rgba(71,157,194,${opacity * .62})`)
    reflection.addColorStop(.65, `rgba(35,112,163,${opacity * .24})`)
    reflection.addColorStop(1, 'transparent')
    context.fillStyle = reflection
    context.fillRect(-1, -1, 2, 2)
    context.restore()
  }

  function drawRefraction(seam) {
    const context = lightContext
    const waterY = seam + height * (.15 - progress * .42)
    context.save()
    context.globalCompositeOperation = 'screen'
    // Soft, uneven pools of reflected water pass the camera at two depths.
    // They have no outlines, closed hoops, rays or geometric highlight marks.
    for (let depth = 0; depth < 2; depth++) {
      for (let index = 0; index < 8; index++) {
        const seed = index * 17 + depth * 53
        const x = width * (-.12 + index * .18 + Math.sin(progress * 2.7 + seed) * .025)
        const y = waterY + depth * height * .23 + Math.sin(index * 1.2 + progress * 2.8 + depth * 2) * height * .12
        waterReflection(context, x, y, width * (.16 + random(seed) * .1), height * (.025 + random(seed + 1) * .025), .13 - depth * .035)
        if (index % 2 === depth) {
          waterReflection(context, x + width * .025, y - height * .009, width * (.025 + random(seed + 2) * .045), height * .007, .18)
        }
      }
    }
    context.restore()
    light.dataset.waveCount = '0'
    light.dataset.waterLayers = '2'
    light.dataset.lightSignature = [progress.toFixed(5), waterY.toFixed(2), width, height].join(',')
  }

  function drawParticles(seam) {
    const context = particleContext
    const mobile = width < 700
    const bubbleCount = mobile ? 38 : 62
    const planktonCount = mobile ? 46 : 76
    context.save()
    for (let index = 0; index < bubbleCount + planktonCount; index++) {
      const seed = index * 13 + 7
      const depth = .25 + random(seed) * .75
      const bubble = index < bubbleCount
      const lane = index % 5 === 0 ? random(seed + 1) : index % 2 ? .035 + random(seed + 1) * .32 : .65 + random(seed + 1) * .32
      const x = width * lane + Math.sin(progress * 3.6 + seed) * (8 + depth * 18)
      const y = seam + height * (random(seed + 2) * 2.1 - .32 - progress * (.55 + depth * 1.05))
      if (y < -25 || y > height + 25) continue
      const shimmer = .42 + Math.sin(seed + progress * (bubble ? 4 : 12)) ** 2 * .58
      if (bubble) {
        const radius = (1.3 + random(seed + 3) * 3.2) * (.7 + depth * .7)
        context.lineWidth = .7
        context.strokeStyle = `rgba(151,218,240,${(.2 + depth * .3) * shimmer})`
        context.fillStyle = 'rgba(153,221,245,.035)'
        context.beginPath()
        context.arc(x, y, radius, 0, tau)
        context.fill()
        context.stroke()
        context.strokeStyle = `rgba(224,252,255,${(.5 + depth * .4) * shimmer})`
        context.beginPath()
        context.ellipse(x - radius * .15, y - radius * .13, radius * .76, radius * .72, -.4, Math.PI * 1.02, Math.PI * 1.62)
        context.stroke()
      } else {
        const radius = .55 + depth * 1.25
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * 5)
        glow.addColorStop(0, `rgba(174,213,228,${shimmer * .42})`)
        glow.addColorStop(.24, `rgba(97,157,187,${shimmer * .14})`)
        glow.addColorStop(1, 'transparent')
        context.fillStyle = glow
        context.fillRect(x - radius * 5, y - radius * 5, radius * 10, radius * 10)
      }
    }
    context.restore()
    particles.dataset.bubbleCount = String(bubbleCount)
    particles.dataset.planktonCount = String(planktonCount)
    particles.dataset.particleSignature = [progress.toFixed(5), seam.toFixed(2), width, height].join(',')
  }

  function draw() {
    if (disposed) return
    const paged = chapter.classList.contains('is-project-paged') && sourceChapter.classList.contains('is-project-paged')
    const arrival = reduced.matches || !paged ? 1 : smooth(.62, .96, progress)
    const value = arrival.toFixed(5)
    if (chapter.style.getPropertyValue('--process-arrival') !== value) chapter.style.setProperty('--process-arrival', value)
    layer.dataset.descentProgress = progress.toFixed(5)
    const page = Number(chapter.dataset.projectPage || 0)
    const sourceIndex = Number(sourceChapter.dataset.projectPageIndex || 0)
    const sourceActive = sourceTrack?.children[sourceIndex] === source
    const area = scene.getBoundingClientRect()
    const visible = paged && !reduced.matches && !document.hidden && sourceActive
      && page < .1 && progress > .035 && progress < .998
      && area.bottom > -height * .15 && area.top < height * 2.2
    layer.hidden = !visible || !lightContext || !particleContext
    if (layer.hidden) return
    prepare(light, lightContext)
    prepare(particles, particleContext)
    const seam = source.getBoundingClientRect().bottom
    const opacity = smooth(.035, .2, progress) * (1 - smooth(.76, .998, progress))
    light.style.opacity = opacity.toFixed(5)
    particles.style.opacity = opacity.toFixed(5)
    drawRefraction(seam)
    drawParticles(seam)
    const frames = regions(frameElements)
    const reading = regions([...copyElements, ...navigationElements])
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

  const boundary = () => chapter.getBoundingClientRect().top + scrollY
  const trigger = ScrollTrigger.create({
    id: 'process-seabed-descent', trigger: chapter, refreshPriority: -30,
    start: () => (ScrollTrigger.getById('diptyque-project-pages')?.end ?? boundary() - height) - height * .42,
    end: () => (ScrollTrigger.getById('diptyque-process-pages')?.start ?? boundary()) + height * .22,
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
    if (originalArrival) chapter.style.setProperty('--process-arrival', originalArrival)
    else chapter.style.removeProperty('--process-arrival')
    layer.remove()
  }
}
