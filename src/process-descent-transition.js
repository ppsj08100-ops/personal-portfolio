import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './process-descent-transition.css'

gsap.registerPlugin(ScrollTrigger)

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }

/** Worn stone stairs join the shell's floor to the deeper seabed. */
export function initProcessDescentTransition(chapter) {
  const source = document.querySelector('#diptyque-together')
  const sourceChapter = source?.closest('.project-details')
  const sourceFigure = source?.querySelector('.project-exhibition')
  const section = chapter?.querySelector('#diptyque-planning')
  const scene = section?.querySelector('.process-exhibit')
  if (!chapter || !sourceFigure || !scene) return () => {}

  const layer = document.createElement('div')
  layer.className = 'process-descent-transition'
  layer.setAttribute('aria-hidden', 'true')
  layer.hidden = true
  const ground = document.createElement('canvas')
  const mist = document.createElement('canvas')
  ground.dataset.descentGround = ''
  mist.dataset.descentMist = ''
  layer.append(ground, mist)
  document.body.append(layer)
  const groundContext = ground.getContext('2d')
  const mistContext = mist.getContext('2d')
  const image = new Image()
  image.decoding = 'async'
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const originalArrival = chapter.style.getPropertyValue('--process-arrival')
  const protectedElements = [
    sourceFigure,
    source.querySelector('.project-overview__copy'),
    ...source.querySelectorAll('.project-overview__masthead a, .project-overview__chapter'),
    sourceChapter.querySelector(':scope > .project-details__stage > .project-pages__navigation'),
    section.querySelector('.project-planning__content'),
    section.querySelector('.process-exhibit__caption'),
    ...scene.querySelectorAll('[data-process-contact]'),
    chapter.querySelector(':scope > .project-details__stage > .project-pages__navigation'),
  ].filter(Boolean)
  let disposed = false
  let progress = 0
  let frame = 0
  let width = document.documentElement.clientWidth
  let height = innerHeight

  function loadIllustration() {
    if (!reduced.matches && !image.src) image.src = '/images/process-descent-stairs-v3.png'
  }
  image.onload = () => { if (!disposed) sync() }
  // Load while the upper exhibition approaches, before its final shell scene.
  const preload = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && !reduced.matches) {
      loadIllustration()
      preload.disconnect()
    }
  }, { rootMargin: '200% 0px' })
  preload.observe(sourceChapter.querySelector(':scope > .project-details__stage'))

  function prepare(canvas, context) {
    const density = Math.min(devicePixelRatio || 1, 1.5, 1800 / Math.max(width, height))
    const w = Math.ceil(width * density), h = Math.ceil(height * density)
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    context.setTransform(density, 0, 0, density, 0, 0)
    context.clearRect(0, 0, width, height)
  }

  function protect(context, regions) {
    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.fillStyle = '#000'
    context.shadowColor = '#000'
    context.shadowBlur = 14
    for (const region of regions) {
      context.globalAlpha = region.opacity
      context.beginPath()
      context.roundRect(region.x - 5, region.y - 5, region.width + 10, region.height + 10, 12)
      context.fill()
    }
    context.restore()
  }

  function fog(context, x, y, rx, ry, opacity) {
    context.save()
    context.translate(x, y)
    context.scale(rx, ry)
    const gradient = context.createRadialGradient(0, 0, .05, 0, 0, 1)
    gradient.addColorStop(0, `rgba(34, 54, 96, ${opacity})`)
    gradient.addColorStop(.45, `rgba(24, 42, 81, ${opacity * .6})`)
    gradient.addColorStop(1, 'rgba(16, 29, 65, 0)')
    context.fillStyle = gradient
    context.fillRect(-1, -1, 2, 2)
    context.restore()
  }

  function draw() {
    if (disposed) return
    const paged = chapter.classList.contains('is-project-paged') && sourceChapter.classList.contains('is-project-paged')
    // Finish the floor handoff before revealing the stationary exhibits.
    const arrival = reduced.matches || !paged ? 1 : smooth(.74, .98, progress)
    const value = arrival.toFixed(5)
    if (chapter.style.getPropertyValue('--process-arrival') !== value) chapter.style.setProperty('--process-arrival', value)
    layer.dataset.descentProgress = progress.toFixed(5)
    const page = Number(chapter.dataset.projectPage || 0)
    const sourceIndex = Number(sourceChapter.dataset.projectPageIndex || 0)
    const area = scene.getBoundingClientRect()
    const visible = paged && !reduced.matches && !document.hidden && sourceIndex === 7
      && page < .1 && progress > .035 && progress < .998
      && area.bottom > -height * .15 && area.top < height * 2.2
    layer.hidden = !visible || !groundContext || !mistContext
    if (layer.hidden) return
    loadIllustration()
    prepare(ground, groundContext)
    prepare(mist, mistContext)
    const figure = sourceFigure.getBoundingClientRect()
    const seam = source.getBoundingClientRect().bottom
    const floor = parseFloat(getComputedStyle(scene).getPropertyValue('--process-floor')) || 56
    // These two illustrated landings remain on real ground in both chapters.
    // The image's core continues between them; its end never hangs in water.
    const start = { x: figure.left + figure.width * .14,
      y: Math.max(figure.bottom - figure.width * .04, seam - height * .15) }
    const end = { x: area.left + area.width * .84,
      y: area.bottom - floor - area.width * .01 }
    const w = Math.max(1, (end.x - start.x) / .64)
    const h = Math.max(1, (end.y - start.y) / .76)
    const x = start.x - w * .18
    const y = start.y - h * .14
    const groundOpacity = smooth(.08, .23, progress) * (1 - smooth(.55, .75, progress))
    const mistOpacity = smooth(.1, .35, progress) * (1 - smooth(.68, .97, progress))
    const regions = protectedElements.flatMap(element => {
      const opacity = Number(getComputedStyle(element).opacity)
      const bounds = []
      if (element.matches('.project-pages__navigation')) {
        for (const button of element.querySelectorAll('button')) {
          const range = document.createRange()
          range.selectNodeContents(button)
          bounds.push(...range.getClientRects())
        }
      } else bounds.push(element.getBoundingClientRect())
      return bounds.map(rect => ({ x: rect.left, y: rect.top, width: rect.width, height: rect.height, opacity }))
    }).filter(region => region.width > 0 && region.height > 0 && region.opacity > 0)

    if (image.complete && image.naturalWidth) {
      groundContext.drawImage(image, x, y, w, h)
      // Light falls away down the stairs into the darker archive floor.
      groundContext.save()
      groundContext.globalCompositeOperation = 'source-atop'
      const depth = groundContext.createLinearGradient(0, y, 0, y + h)
      depth.addColorStop(0, '#071a3614')
      depth.addColorStop(.4, '#03112760')
      depth.addColorStop(1, '#020a1bcc')
      groundContext.fillStyle = depth
      groundContext.fillRect(0, 0, width, height)
      groundContext.restore()
      // The lower bank lands on the illustrated seabed and dissolves into it.
      groundContext.save()
      groundContext.globalCompositeOperation = 'destination-in'
      const edge = groundContext.createLinearGradient(0, y, 0, y + h)
      edge.addColorStop(0, 'transparent')
      edge.addColorStop(.1, '#000')
      edge.addColorStop(.87, '#000')
      edge.addColorStop(1, 'transparent')
      groundContext.fillStyle = edge
      groundContext.fillRect(x, y, w, h)
      groundContext.restore()
    }
    ground.style.opacity = groundOpacity.toFixed(5)
    ground.dataset.groundSignature = [x, y, w, h, groundOpacity].map(n => n.toFixed(3)).join(',')
    ground.dataset.groundAnchors = [start.x, start.y, end.x, end.y].map(n => n.toFixed(2)).join(',')
    mist.style.opacity = mistOpacity.toFixed(5)
    mist.dataset.mistSignature = [seam, progress, mistOpacity].map(n => n.toFixed(3)).join(',')
    fog(mistContext, width * (.36 + progress * .035), seam + height * .045, width * .64, height * .19, .18)
    fog(mistContext, width * .74, seam + height * .14, width * .48, height * .14, .085)
    // Sparse silt drifts only with scroll. There is no time-based fog loop.
    for (let i = 0; i < 12; i++) {
      const px = width * (.07 + ((i * .173) % .8))
      const py = seam + height * ((((i * .271) % 1) - .5) * .36 - progress * .045)
      mistContext.fillStyle = `rgba(159, 177, 207, ${.045 + (i % 3) * .018})`
      mistContext.beginPath()
      mistContext.arc(px, py, .45 + i % 3 * .22, 0, Math.PI * 2)
      mistContext.fill()
    }
    protect(groundContext, regions)
    protect(mistContext, regions)
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
    preload.disconnect()
    image.onload = null
    if (originalArrival) chapter.style.setProperty('--process-arrival', originalArrival)
    else chapter.style.removeProperty('--process-arrival')
    layer.remove()
  }
}
