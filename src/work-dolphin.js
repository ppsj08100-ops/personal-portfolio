import { createWorkDolphinMotion } from './work-dolphin-motion.js'
import { sampleWorkDolphinPath } from './work-dolphin-path.js'
import './work-dolphin.css'

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = (start, end, value) => { const t = clamp((value - start) / (end - start)); return t * t * (3 - 2 * t) }
const MAX_PITCH = Math.PI / 6
const pitchAt = (path, width, height) => -MAX_PITCH * Math.tanh(Math.atan2(path.dy * height, Math.abs(path.dx * width)) / MAX_PITCH)
/** Scroll carries one dolphin downward; its head leads a gentle full-body wave. */
export function initWorkDolphin(section) {
  const opening = section?.querySelector('.ocean-type__opening')
  if (!opening) return { setArrival() {}, setEntry() {}, destroy() {} }
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  const layer = document.createElement('div')
  layer.className = 'work-dolphin'
  layer.setAttribute('aria-hidden', 'true')
  const frontLayer = document.createElement('div')
  frontLayer.className = 'work-dolphin-front'
  frontLayer.setAttribute('aria-hidden', 'true')
  const image = new Image()
  image.className = 'work-dolphin__fallback'
  image.alt = ''
  image.decoding = 'async'
  image.draggable = false
  layer.append(image)
  opening.append(layer, frontLayer)
  let arrival = 1, entry = 0, depth = clamp(section.dataset.descentProgress)
  let width = 0, height = 0, opacity = 0, anchors, pose
  let motion = null, attempted = false, disposed = false
  const bounds = opening.getBoundingClientRect()
  let visible = bounds.bottom > 0 && bounds.top < innerHeight

  function active() {
    return !disposed && visible && opacity > .001 && image.complete && image.naturalWidth > 0
      && !reduced.matches && !document.hidden && !menu?.open
      && !document.body.classList.contains('has-menu-open') && !section.closest('[inert]')
  }
  function sync() {
    if (disposed) return
    const running = active()
    motion?.setActive(running)
    layer.dataset.motionState = reduced.matches ? 'reduced' : running ? motion ? 'running' : 'fallback' : 'paused'
  }
  function render() {
    if (disposed || !width || !height) return
    const mobile = width < 768
    const progress = clamp(.12 * arrival + .68 * entry + .20 * clamp(depth / .75))
    const path = sampleWorkDolphinPath(progress, mobile, anchors)
    const { orbit, diving } = path
    const z = 1
    const headX = path.x * width, headY = path.y * height
    const depthDistance = width * (mobile ? .28 : .18)
    const angle = pitchAt(path, width, height)
    const baseSize = mobile ? Math.max(100, Math.min(132, width * .30)) : Math.max(180, Math.min(280, width * .16))
    const baseWidth = baseSize * 2.72
    const perspective = 1 - .10 * smooth(.20, .90, diving)
    const size = baseWidth * perspective
    const spriteHeight = size * 749 / 2098
    const noseX = -.475 * size, noseY = .08 * spriteHeight
    const c = Math.cos(angle), s = Math.sin(angle)
    const x = headX - (c * noseX - s * noseY), y = headY - (s * noseX + c * noseY)
    const before = sampleWorkDolphinPath(Math.max(0, progress - .008), mobile, anchors)
    const after = sampleWorkDolphinPath(Math.min(1, progress + .008), mobile, anchors)
    const distance = Math.max(1, Math.hypot((after.x - before.x) * width, (after.y - before.y) * height, (after.z - before.z) * depthDistance))
    const bendEnvelope = smooth(.12, .20, progress) * (1 - smooth(.76, .84, progress))
    const bodyTurn = Math.max(-.48, Math.min(.48, -(pitchAt(after, width, height) - pitchAt(before, width, height)) * size * .875 / distance)) * bendEnvelope
    const depthSlope = 0
    opacity = smooth(0, .55, arrival) * (1 - smooth(.55, .90, diving))
    pose = { x, y, z, depthSlope, layerOpacity: opacity,
      width: size, height: size * 749 / 2098, angle, bodyTurn, texture: 0,
      kind: 1, hinge: .28, direction: 1, phase: 0, speed: 1.4, sway: .05, opacity: 1, behindWreck: false }
    Object.assign(image.style, { left: `${x}px`, top: `${y}px`, width: `${pose.width}px`, height: `${pose.height}px`,
      transform: `translate(-50%, -50%) rotate(${angle}rad) scaleX(-1)` })
    layer.style.opacity = opacity.toFixed(4)
    frontLayer.style.opacity = opacity.toFixed(4)
    layer.style.zIndex = !motion && z > 0 ? '4' : '2'
    for (const [key, value] of Object.entries({ arrival, entry, depth, q: progress, phase: progress, routeProgress: progress,
      orbit, diving, pathSegment: path.pathSegment, x, y, headX, headY, z, angle, bodyTurn, facing: -1,
      pitch: -angle, upright: Math.cos(angle), perspective, baseWidth, width: size, opacity })) {
      layer.dataset[key] = value.toFixed(4)
    }
    section.dispatchEvent(new CustomEvent('work-dolphin-pose', { detail: { progress, depth,
      x: path.x, y: path.y, z, angle, width: size / width, opacity, diving,
      impactX: path.impactX, impactY: path.impactY } }))
    if (active()) motion?.setArtwork(width, height)
    sync()
  }
  function resize() {
    width = layer.clientWidth; height = layer.clientHeight
    const bounds = opening.getBoundingClientRect()
    const rows = [...opening.querySelectorAll('.ocean-type__text > span')]
    function glyph(row, index) {
      const span = rows[row]
      const node = span?.firstChild
      if (!node || node.nodeType !== Node.TEXT_NODE || node.length <= index) return null
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + 1)
      const box = range.getBoundingClientRect()
      return [(box.left + box.width / 2 - bounds.left) / width, (box.top + box.height / 2 - bounds.top) / height]
    }
    const s = glyph(1, 4), e = glyph(0, 3), w = glyph(1, 0)
    anchors = s && e && w ? { s, e, w } : undefined
    render()
  }
  function initializeMotion() {
    if (disposed || attempted || reduced.matches || !image.complete || !image.naturalWidth) return
    attempted = true
    motion = createWorkDolphinMotion(layer, image, () => pose, frontLayer)
    layer.dataset.renderer = motion ? 'webgl' : 'fallback'
    if (motion) {
      layer.style.zIndex = '2'
      motion.setArtwork(width, height)
      layer.querySelector('canvas')?.addEventListener('webglcontextlost', () => {
        motion = null; layer.dataset.renderer = 'fallback'; render()
      }, { signal })
    }
    sync()
  }
  image.addEventListener('load', () => { resize(); initializeMotion() }, { signal })
  image.addEventListener('error', () => { layer.hidden = true; sync() }, { signal })
  image.src = '/images/insight-dolphin.png'
  section.addEventListener('work-depth-change', event => { depth = clamp(event.detail?.progress); render() }, { signal })
  reduced.addEventListener('change', () => { initializeMotion(); sync() }, { signal })
  document.addEventListener('visibilitychange', () => { if (active()) motion?.setArtwork(width, height); sync() }, { signal })
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    if (active()) motion?.setArtwork(width, height)
    sync()
  }, { threshold: [0, .01] })
  intersection.observe(opening)
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(opening)
  const mutation = new MutationObserver(sync)
  for (let ancestor = section; ancestor; ancestor = ancestor.parentElement) {
    mutation.observe(ancestor, { attributes: true,
      attributeFilter: ancestor === document.body ? ['class', 'inert', 'hidden'] : ['inert', 'hidden'] })
  }
  if (menu) mutation.observe(menu, { attributes: true, attributeFilter: ['open'] })
  resize()
  return {
    setArrival(value) { arrival = clamp(value); render() },
    setEntry(value) { entry = clamp(value); render() },
    destroy() {
      disposed = true
      controller.abort()
      intersection.disconnect()
      sizeObserver.disconnect()
      mutation.disconnect()
      motion?.destroy()
      layer.remove()
      frontLayer.remove()
    },
  }
}
