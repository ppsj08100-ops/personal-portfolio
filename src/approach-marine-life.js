import { createMarineMotion } from './insight-marine-motion.js'
import './approach-marine-life.css'

const SVG = 'http://www.w3.org/2000/svg'
const SOURCES = [
  '/images/insight-fish-silver.png',
  '/images/insight-jellyfish.png',
]
const RATIOS = [2109 / 746, 1024 / 1536]
const SCHOOL = [
  [.7, .17, 17], [.738, .149, 21], [.772, .178, 19],
  [.812, .162, 26], [.849, .185, 22], [.886, .173, 16],
]
const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

function svgNode(name, attributes = {}) {
  const element = document.createElementNS(SVG, name)
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value))
  return element
}

/** Distant life gives the open water scale while the silver current leads. */
export function createApproachMarineLife(section) {
  const stage = section.querySelector('[data-approach-stage]')
  const environment = stage?.querySelector('.design-process__environment')
  if (!environment) return { setLight() {}, destroy() {} }

  const layer = document.createElement('div')
  layer.className = 'approach-marine-life'
  layer.setAttribute('aria-hidden', 'true')
  layer.dataset.lightProgress = '0'
  layer.dataset.motion = 'still'
  const still = svgNode('svg', { class: 'approach-marine-life__still', focusable: 'false' })
  layer.append(still)
  environment.append(layer)

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  const sprites = []
  let disposed = false, onScreen = false, light = 0, scrollProgress = 0
  let width = 0, height = 0
  let ratios = RATIOS
  let images, swimmer
  let attempted = false

  function poses(time = 0) {
    if (!width || !height) return []
    const mobile = width < 768
    const schoolLight = smooth(.1, .65, light)
    const jellyLight = smooth(.2, .82, light)
    const drift = Math.sin(time / 37) * width * .004
    // Keep these few fish far above the sculpture and away from the left copy.
    // The portrait layout retains only its one tiny jelly beside the copy gap.
    const fish = mobile ? [] : SCHOOL.map(([x, y, size], index) => {
      const phase = index * 1.79
      return {
        id: `approach-silver-distant-${index}`, kind: 1, texture: 0,
        x: width * x + drift + Math.sin(time * .18 + phase),
        y: height * y + Math.sin(time * .15 + phase) * 1.8,
        width: size, height: size / ratios[0],
        direction: -1, angle: .035 + Math.sin(time * .13 + phase) * .02,
        phase, hinge: .2, speed: 2.35 + index % 3 * .14, sway: .045,
        opacity: (.35 + index % 3 * .055) * schoolLight,
      }
    })
    const jellyHeight = Math.min(height * (mobile ? .055 : .074), mobile ? 44 : 74)
    const current = Math.sin(time / 21 + 2.3)
    const jelly = {
      id: 'approach-jelly-distant', kind: 2, texture: 1,
      x: width * (mobile ? .90 : .92) + current * width * .003,
      y: height * (mobile ? .36 : .28) - current * height * .003,
      width: jellyHeight * ratios[1], height: jellyHeight,
      direction: 1, angle: -.06 + current * .025,
      phase: 2.3, hinge: .39, speed: .56, sway: .025,
      opacity: .35 * jellyLight,
    }
    return [jelly, ...fish]
  }

  function renderStill() {
    if (!width || !height) return
    still.setAttribute('viewBox', `0 0 ${width} ${height}`)
    const current = poses()
    layer.dataset.population = String(current.length)
    while (sprites.length > current.length) sprites.pop().remove()
    while (sprites.length < current.length) {
      const sprite = svgNode('image')
      sprites.push(sprite)
      still.append(sprite)
    }
    current.forEach((pose, index) => {
      const sprite = sprites[index]
      const attributes = {
        'data-creature': pose.id,
        href: SOURCES[pose.texture],
        x: -pose.width / 2, y: -pose.height / 2, width: pose.width, height: pose.height,
        opacity: pose.opacity.toFixed(5),
        transform: `translate(${pose.x} ${pose.y}) rotate(${pose.angle * 180 / Math.PI}) scale(${pose.direction} 1)`,
      }
      for (const [key, value] of Object.entries(attributes)) sprite.setAttribute(key, String(value))
    })
  }

  function positionWater() {
    // Compact chapters remain in native flow. Carry their water with the
    // viewport so the creatures are still present when the light opens fully.
    const compact = !section.classList.contains('is-pinned') && !reduced.matches
    const offset = compact ? scrollProgress * Math.max(0, stage.clientHeight - height) : 0
    layer.style.translate = `0 ${offset.toFixed(3)}px`
  }

  function sync() {
    if (disposed) return
    const obscured = document.hidden || Boolean(menu?.open) || document.body.classList.contains('has-menu-open')
    if (reduced.matches && swimmer) {
      swimmer.destroy()
      swimmer = undefined
      attempted = false
      renderStill()
    }
    if (!swimmer && !attempted && images && width > 0 && height > 0
      && onScreen && !reduced.matches && !obscured) {
      attempted = true
      swimmer = createMarineMotion(layer, images, poses)
      swimmer?.setArtwork(width, height)
    }
    const swimming = Boolean(swimmer && onScreen && !reduced.matches && !obscured && light > .005)
    swimmer?.setActive(swimming)
    layer.dataset.motion = swimming ? 'swimming' : 'still'
  }

  const resize = new ResizeObserver(() => {
    if (disposed || (width === layer.clientWidth && height === layer.clientHeight)) return
    width = layer.clientWidth
    height = layer.clientHeight
    positionWater()
    renderStill()
    swimmer?.setArtwork(width, height)
    sync()
  })
  resize.observe(layer)
  const visibility = new IntersectionObserver(entries => {
    onScreen = entries.some(entry => entry.isIntersecting)
    sync()
  })
  visibility.observe(layer)
  const menuState = new MutationObserver(sync)
  if (menu) menuState.observe(menu, { attributes: true, attributeFilter: ['open'] })
  menuState.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', sync, { signal })
  layer.addEventListener('webglcontextlost', () => {
    // The shared renderer disposes its canvas at the target; its SVG must
    // already reflect the current light when that canvas disappears.
    swimmer = undefined
    layer.dataset.motion = 'still'
    renderStill()
  }, { capture: true, signal })

  Promise.all(SOURCES.map(source => {
    const image = new Image()
    image.decoding = 'async'
    image.src = source
    return image.decode().then(() => image)
  })).then(loaded => {
    if (disposed) return
    images = loaded
    ratios = images.map(image => image.naturalWidth / image.naturalHeight)
    layer.dataset.ready = 'true'
    renderStill()
    sync()
  }).catch(() => { /* The SVG keeps any available artwork visible. */ })

  return {
    setLight(value, progress = 0) {
      if (disposed) return
      scrollProgress = clamp(progress)
      positionWater()
      const next = clamp(value)
      if (Math.abs(next - light) < .00001) return
      light = next
      layer.dataset.lightProgress = light.toFixed(5)
      // Keep the fallback in step with the same light when WebGL is unavailable.
      if (!swimmer || !layer.classList.contains('has-marine-canvas')) renderStill()
      sync()
    },
    destroy() {
      disposed = true
      controller.abort()
      resize.disconnect()
      visibility.disconnect()
      menuState.disconnect()
      swimmer?.destroy()
      layer.remove()
    },
  }
}
