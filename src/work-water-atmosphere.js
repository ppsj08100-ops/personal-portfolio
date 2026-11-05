import './work-water-atmosphere.css'

// Fixed profiles keep the water quiet: bubbles rise continuously, without
// frame noise, scroll-driven offsets, or a wobbling outline.
const PROFILES = [
  { x: 9, size: 6, duration: 34000, phase: .16, drift: 10, opacity: .46 },
  { x: 86, size: 10, duration: 42000, phase: .68, drift: -16, opacity: .43 },
  { x: 21, size: 4, duration: 30000, phase: .46, drift: 8, opacity: .48 },
  { x: 94, size: 6, duration: 37000, phase: .31, drift: -9, opacity: .44 },
  { x: 7, size: 11, duration: 44000, phase: .82, drift: 18, opacity: .37 },
  { x: 77, size: 5, duration: 32000, phase: .11, drift: -12, opacity: .47 },
  { x: 32, size: 5, duration: 38000, phase: .73, drift: 12, opacity: .37 },
  { x: 66, size: 4, duration: 31000, phase: .53, drift: -7, opacity: .40 },
  { x: 16, size: 8, duration: 40000, phase: .93, drift: 15, opacity: .41 },
  { x: 91, size: 8, duration: 36000, phase: .88, drift: -14, opacity: .42 },
]
const CURRENT_PROFILES = [
  { y: .19, duration: 43000, phase: .18, drift: .14, opacity: .48 },
  { y: .62, duration: 51000, phase: .61, drift: .19, opacity: .36 },
  { y: .81, duration: 47000, phase: .37, drift: .16, opacity: .29 },
]
const FOAM_PROFILES = [
  { y: .29, lift: .055, duration: 39000, phase: .19, opacity: .43 },
  { y: .75, lift: .075, duration: 45000, phase: .72, opacity: .37 },
  { y: .17, lift: .035, duration: 51000, phase: .48, opacity: .29 },
  { y: .89, lift: .055, duration: 42000, phase: .91, opacity: .34 },
]
// A sparse elongated trace, rather than an evenly spaced field of circles.
const FOAM_POINTS = [
  [0, 12, 1], [17, 4, 1.4], [31, 19, 1.1], [49, 1, 2.2], [67, 11, 1.3],
  [86, 6, 1.8], [111, 20, 1.1], [139, 9, 2.5], [163, 2, 1.2], [186, 14, 1.6],
]

let selectedCurrentTexture

// Extract only the illuminated filaments from the site's illustrated water.
// This is painted once; the existing parent animations move the transparent
// texture without redrawing it or introducing another animation loop.
function getSelectedCurrentTexture() {
  if (selectedCurrentTexture) return selectedCurrentTexture
  selectedCurrentTexture = new Promise(resolve => {
    const image = new Image()
    image.onload = () => {
      try {
        const texture = document.createElement('canvas')
        texture.width = 768
        texture.height = 512
        const context = texture.getContext('2d', { willReadFrequently: true })
        if (!context) { resolve(null); return }
        context.drawImage(image, 0, 0, texture.width, texture.height)
        const pixels = context.getImageData(0, 0, texture.width, texture.height)
        for (let y = 0; y < texture.height; y++) {
          const endFade = Math.pow(Math.sin(Math.PI * y / (texture.height - 1)), .75)
          for (let x = 0; x < texture.width; x++) {
            const offset = (y * texture.width + x) * 4
            const brightness = pixels.data[offset] * .25 + pixels.data[offset + 1] * .60 + pixels.data[offset + 2] * .15
            const filament = Math.pow(Math.max(0, Math.min(1, (brightness - 67) / 133)), 1.7)
            pixels.data[offset] = 142
            pixels.data[offset + 1] = 171
            pixels.data[offset + 2] = 199
            pixels.data[offset + 3] = Math.round(filament * endFade * 112)
          }
        }
        context.putImageData(pixels, 0, 0)
        resolve(texture)
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    image.src = '/images/skills-sideways-wave-illustrated-blue-v2.png'
  })
  return selectedCurrentTexture
}

function createSelectedAtmosphere(layer, signal) {
  const light = document.createElement('div')
  light.className = 'work-water-atmosphere__submerged-light'
  layer.append(light)

  const currents = CURRENT_PROFILES.map((profile, index) => {
    const element = document.createElement('div')
    element.className = 'work-water-atmosphere__current'
    element.style.top = `${profile.y * 100}%`
    const canvas = document.createElement('canvas')
    canvas.className = 'work-water-atmosphere__current-texture'
    element.dataset.current = String(index)
    element.append(canvas)
    layer.append(element)
    return { element, canvas, profile, animation: null }
  })

  getSelectedCurrentTexture().then(texture => {
    if (signal.aborted || !texture) return
    currents.forEach(({ canvas }, index) => {
      const cropX = Math.round(texture.width * (.23 + index * .035))
      const cropWidth = Math.round(texture.width * (.46 - index * .035))
      canvas.width = texture.height
      canvas.height = cropWidth
      const context = canvas.getContext('2d')
      if (!context) return
      if (index % 2) {
        context.translate(0, canvas.height)
        context.rotate(-Math.PI / 2)
      } else {
        context.translate(canvas.width, 0)
        context.rotate(Math.PI / 2)
      }
      context.drawImage(texture, cropX, 0, cropWidth, texture.height, 0, 0, cropWidth, texture.height)
    })
    layer.dataset.currentTexture = 'ready'
  })

  const foam = FOAM_PROFILES.map((profile, index) => {
    const element = document.createElement('div')
    element.className = 'work-water-atmosphere__foam-cluster'
    element.dataset.cluster = String(index)
    FOAM_POINTS.forEach(([x, y, size], point) => {
      const particle = document.createElement('span')
      particle.className = 'work-water-atmosphere__microfoam'
      Object.assign(particle.style, {
        left: `${x / 2}%`, top: `${y}px`, width: `${size}px`, height: `${size}px`,
        opacity: String(point % 3 === 0 ? .75 : .43),
      })
      element.append(particle)
    })
    layer.append(element)
    return { element, profile, animation: null }
  })
  return { currents, foam }
}

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}

/** A little blue water and a few slow bubbles, contained in the work opening. */
export function initWorkWaterAtmosphere(section, { opening = section?.querySelector('.ocean-type__opening'), depthLinked = true, variant = 'default' } = {}) {
  if (!opening) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const mobile = matchMedia('(max-width: 767px)')
  const menu = document.querySelector('#portfolio-menu')
  const layer = document.createElement('div')
  layer.className = 'work-water-atmosphere'
  const selected = variant === 'selected'
  if (selected) layer.classList.add('work-water-atmosphere--selected')
  layer.setAttribute('aria-hidden', 'true')
  const water = document.createElement('div')
  water.className = 'work-water-atmosphere__blue'
  layer.append(water)
  const ambient = selected ? createSelectedAtmosphere(layer, signal) : { currents: [], foam: [] }
  const records = PROFILES.map(profile => {
    const element = document.createElement('span')
    element.className = 'work-water-atmosphere__bubble'
    Object.assign(element.style, { left: `${profile.x}%`, width: `${profile.size}px`, height: `${profile.size}px` })
    layer.append(element)
    return { element, profile, animation: null }
  })
  opening.append(layer)
  let destroyed = false
  let depth = depthLinked ? clamp(section.dataset.descentProgress) : 0
  const bounds = opening.getBoundingClientRect()
  let visible = bounds.bottom > 0 && bounds.top < innerHeight

  function sync() {
    if (destroyed) return
    const running = visible && !reduced.matches && !document.hidden && depth < .98
      && !menu?.open && !document.body.classList.contains('has-menu-open') && !section.closest('[inert]')
    const count = mobile.matches ? 6 : records.length
    layer.dataset.motionState = reduced.matches ? 'reduced' : running ? 'running' : 'paused'
    layer.dataset.bubbleCount = reduced.matches ? '0' : String(count)
    if (selected) layer.dataset.foamCount = reduced.matches ? '0' : mobile.matches ? '16' : '40'
    layer.style.opacity = (1 - smooth(.76, .98, depth)).toFixed(4)
    records.forEach(({ animation }, index) => {
      if (!animation) return
      if (running && index < count) animation.play()
      else animation.pause()
    })
    ambient.currents.forEach(({ animation }) => {
      if (!animation) return
      if (running) animation.play()
      else animation.pause()
    })
    ambient.foam.forEach(({ animation }, index) => {
      if (!animation) return
      if (running && (!mobile.matches || index < 2)) animation.play()
      else animation.pause()
    })
  }
  function animate(record, keyframes) {
    if (!record.element.animate) return
    if (record.animation) {
      const time = record.animation.currentTime
      record.animation.effect.setKeyframes(keyframes)
      record.animation.currentTime = time
    } else {
      record.animation = record.element.animate(keyframes, { duration: record.profile.duration, iterations: Infinity, easing: 'linear', fill: 'both' })
      record.animation.pause()
      record.animation.currentTime = record.profile.phase * record.profile.duration
    }
  }
  function resize() {
    if (destroyed || !opening.clientHeight) return
    const height = opening.clientHeight
    records.forEach(record => {
      const { profile } = record
      const keyframes = [0, .10, .5, .90, 1].map((progress, index) => ({
        offset: progress,
        transform: `translate3d(${profile.drift * progress}px, ${height * (1.04 - 1.13 * progress)}px, 0)`,
        opacity: index === 0 || index === 4 ? 0 : profile.opacity,
      }))
      animate(record, keyframes)
    })
    const width = opening.clientWidth
    ambient.currents.forEach(record => {
      const { profile } = record
      animate(record, [0, .16, .78, 1].map((progress, index) => ({
        offset: progress,
        transform: `translate3d(${width * (-.14 + profile.drift * progress)}px, ${height * -.018 * progress}px, 0)`,
        opacity: index === 0 || index === 3 ? 0 : profile.opacity,
      })))
    })
    ambient.foam.forEach(record => {
      const { profile, element } = record
      const travel = width + element.offsetWidth * 2
      animate(record, [0, .10, .83, 1].map((progress, index) => ({
        offset: progress,
        transform: `translate3d(${-element.offsetWidth + travel * progress}px, ${height * (profile.y - profile.lift * progress)}px, 0)`,
        opacity: index === 0 || index === 3 ? 0 : profile.opacity,
      })))
    })
    sync()
  }
  if (depthLinked) section.addEventListener('work-depth-change', event => { depth = clamp(event.detail?.progress); sync() }, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', sync, { signal })
  mobile.addEventListener('change', sync, { signal })
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    sync()
  }, { threshold: [0, .01] })
  intersection.observe(opening)
  const dimensions = new ResizeObserver(resize)
  dimensions.observe(opening)
  const mutation = new MutationObserver(sync)
  for (let ancestor = section; ancestor; ancestor = ancestor.parentElement) {
    mutation.observe(ancestor, { attributes: true,
      attributeFilter: ancestor === document.body ? ['class', 'hidden', 'inert'] : ['hidden', 'inert'] })
  }
  if (menu) mutation.observe(menu, { attributes: true, attributeFilter: ['open'] })
  resize()

  return () => {
    destroyed = true
    controller.abort()
    intersection.disconnect()
    dimensions.disconnect()
    mutation.disconnect()
    records.forEach(({ animation }) => animation?.cancel())
    ambient.currents.forEach(({ animation }) => animation?.cancel())
    ambient.foam.forEach(({ animation }) => animation?.cancel())
    layer.remove()
  }
}
