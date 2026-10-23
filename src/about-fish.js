import { gsap } from 'gsap'
import { createFishSwimmer } from './about-fish-swim.js'

const clamp = gsap.utils.clamp(0, 1)
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }

// The nose follows the reversible card progress. Its earlier route headings
// travel down the spine, while a visibility-aware clock only adds fin strokes.
export function initAboutFish(section) {
  const stage = section.querySelector('.capability-cards__stage')
  const layer = section.querySelector('.about-fish-layer')
  const nodes = [...section.querySelectorAll('[data-about-fish]')]
  if (!stage || !layer || nodes.length !== 2) return { measure() {}, render() {}, destroy() {} }
  section.classList.add('is-fish-swimming')
  gsap.set(nodes, { xPercent: -50, yPercent: -50, opacity: 0 })
  const fish = nodes.map((node, index) => ({
    index, node, width: 0, height: 0, route: null,
    x: gsap.quickSetter(node, 'x', 'px'),
    y: gsap.quickSetter(node, 'y', 'px'),
    angle: gsap.quickSetter(node, 'rotation', 'deg'),
    opacity: gsap.quickSetter(node, 'opacity'),
  }))
  let width = 0
  let height = 0
  let progress = 0
  let poses = []
  let swimmer = null
  let disposed = false
  let booting = false
  let inView = false
  let frame = 0
  let lastTime = 0
  let motionProgress = 0
  let activity = 0
  let stroke = 0
  const controller = new AbortController()

  function place(item, pose) {
    item.x(pose.x)
    item.y(pose.y)
    item.angle(pose.angle)
    item.opacity(pose.opacity)
  }

  function routePoint(item, value) {
    const right = item.index === 1
    const side = right ? -1 : 1
    // Three quarters of a turn gives one broad S, with room for the long fins
    // to follow it without forcing a tight, angular change of direction.
    const frequency = Math.PI * 1.5
    const phase = value * frequency + (right ? .55 : -.55)
    const amplitude = width * (width < 768 ? .065 : .05)
    const dx = side * amplitude * frequency * Math.cos(phase)
    const dy = height * (right ? .85 : .95)
    return {
      x: width * (right ? .82 : .18) + side * amplitude * Math.sin(phase),
      y: height * ((right ? .66 : .30) + (right ? .85 : .95) * value),
      angle: Math.atan2(-dx, dy),
    }
  }

  function buildRoute(item) {
    const samples = 512
    const start = -1.5
    const step = 4 / samples
    const distances = new Float64Array(samples + 1)
    let previous = routePoint(item, start)
    for (let i = 1; i <= samples; i++) {
      const point = routePoint(item, start + i * step)
      distances[i] = distances[i - 1] + Math.hypot(point.x - previous.x, point.y - previous.y)
      previous = point
    }
    item.route = { start, step, distances }
  }

  function arcAtProgress(item, value) {
    const { start, step, distances } = item.route
    const sample = Math.max(0, Math.min(distances.length - 1, (value - start) / step))
    const lower = Math.min(distances.length - 2, Math.floor(sample))
    return distances[lower] + (distances[lower + 1] - distances[lower]) * (sample - lower)
  }

  function headingAtArc(item, distance) {
    const { start, step, distances } = item.route
    let lower = 0
    let upper = distances.length - 1
    const target = Math.max(0, Math.min(distances[upper], distance))
    while (upper - lower > 1) {
      const middle = (lower + upper) >> 1
      if (distances[middle] < target) lower = middle
      else upper = middle
    }
    const span = distances[upper] - distances[lower]
    const mix = span ? (target - distances[lower]) / span : 0
    return routePoint(item, start + (lower + mix) * step).angle
  }

  function progressPose(item, opacity) {
    const right = item.index === 1
    const head = right ? .85 : .865
    const tail = right ? .117 : .087
    const point = routePoint(item, progress)
    const headArc = arcAtProgress(item, progress)
    const spineLength = (head - tail) * item.height
    const mirror = right ? -1 : 1
    const bends = new Float32Array(17)
    for (let i = 1; i < bends.length; i++) {
      const q = i / 16
      const pastHeading = headingAtArc(item, headArc - spineLength * q)
      const desired = (pastHeading - point.angle) * mirror * smooth((q - .12) / .18)
      // A broad fin cannot turn on a pin. Bound local curvature while keeping
      // the turning history continuous from the head toward the tail.
      const step = 1.5 / 16
      bends[i] = bends[i - 1] + Math.max(-step, Math.min(step, desired - bends[i - 1]))
    }
    const headOffset = (head - .5) * item.height
    return {
      x: point.x + Math.sin(point.angle) * headOffset,
      y: point.y - Math.cos(point.angle) * headOffset,
      angle: point.angle * 180 / Math.PI,
      width: item.width,
      height: item.height,
      opacity,
      bends,
    }
  }

  function paint() {
    const current = poses.map((pose, index) => {
      const next = { ...pose, stroke: stroke + (index ? 2.2 : .35), waveStrength: .18 + activity * .24 }
      place(fish[index], next)
      return next
    })
    swimmer?.update(current)
  }
  function tick(now) {
    frame = 0
    if (disposed) return
    const dt = lastTime ? Math.min(.06, (now - lastTime) / 1000) : 0
    if (dt > 0) {
      const target = clamp(Math.abs(progress - motionProgress) / dt / .07)
      const response = target > activity ? .08 : .35
      activity += (target - activity) * (1 - Math.exp(-dt / response))
      stroke += dt * (1.7 + activity * 3)
    }
    motionProgress = progress
    lastTime = now
    paint()
    frame = requestAnimationFrame(tick)
  }
  function syncVisibility() {
    const running = inView && !document.hidden && poses.some(pose => pose.opacity > .002)
    swimmer?.setVisible(running)
    if (running && !frame) { lastTime = 0; motionProgress = progress; frame = requestAnimationFrame(tick) }
    if (!running) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; motionProgress = progress; activity = 0 }
  }
  async function boot() {
    if (booting || disposed || swimmer) return
    booting = true
    const images = nodes.map(node => node.querySelector('img'))
    try {
      images.forEach(image => { image.loading = 'eager' })
      await Promise.all(images.map(image => image.decode()))
      if (disposed) return
      // Use the decoded art's true ratio when a replacement sprite differs
      // from the HTML's initial image dimensions.
      measure()
      swimmer = createFishSwimmer(layer, images)
      swimmer?.resize(width, height)
      paint()
      syncVisibility()
    } catch { /* Keep the original image sprites if decoding or GPU setup fails. */ }
  }
  const observer = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting)
    if (inView) boot()
    syncVisibility()
  }, { rootMargin: '120px' })
  observer.observe(section)
  document.addEventListener('visibilitychange', syncVisibility, { signal: controller.signal })

  function render(value = progress) {
    progress = clamp(value)
    const visibility = smooth((progress - .002) / .035) * (1 - smooth((progress - .94) / .06))
    poses = width && height ? fish.map(item => progressPose(item, visibility * (item.index ? .95 : .89))) : []
    // The same directional motion drives the intact image fallback and GPU
    // renderer. Losing WebGL cannot freeze or teleport either fish.
    paint()
    syncVisibility()
  }

  function measure() {
    width = stage.clientWidth
    height = stage.clientHeight
    fish.forEach(item => {
      item.width = item.node.offsetWidth
      item.height = item.node.offsetHeight
      buildRoute(item)
    })
    render()
    swimmer?.resize(width, height)
  }
  measure()

  return {
    measure,
    render,
    destroy() {
      disposed = true
      cancelAnimationFrame(frame)
      controller.abort()
      observer.disconnect()
      swimmer?.destroy()
      section.classList.remove('is-fish-swimming')
      gsap.set(nodes, { clearProps: 'transform,opacity' })
    },
  }
}
