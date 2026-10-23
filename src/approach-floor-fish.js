import { gsap } from 'gsap'

const TAU = Math.PI * 2
const FISH = [
  { color: '#91adbf', width: 54, mobile: 34, depth: .17, bend: .028, direction: 1, duration: 136, phase: .12, opacity: .56 },
  { color: '#b2c0ca', width: 36, mobile: 26, depth: .82, bend: .035, direction: -1, duration: 108, phase: .74, opacity: .48 },
  { color: '#91adbf', width: 46, mobile: 29, depth: .25, bend: .024, direction: -1, duration: 150, phase: .35, opacity: .52 },
  { color: '#b2c0ca', width: 29, mobile: 20, depth: .74, bend: .031, direction: 1, duration: 121, phase: .65, opacity: .50 },
  { color: '#91adbf', width: 65, mobile: 40, depth: .10, bend: .024, direction: 1, duration: 163, phase: .83, opacity: .46 },
  { color: '#b2c0ca', width: 41, mobile: 27, depth: .90, bend: .025, direction: -1, duration: 142, phase: .18, opacity: .45 },
  { color: '#91adbf', width: 33, mobile: 23, depth: .30, bend: .020, direction: 1, duration: 118, phase: .46, opacity: .49 },
]

/** A straight dorsal silhouette with silver flanks and translucent, swept fins. */
function silverMinnowArtwork(index, color) {
  const id = `approach-minnow-${index}`
  return `<defs>
    <linearGradient id="${id}-body" x1="0" y1="12" x2="0" y2="28" gradientUnits="userSpaceOnUse">
      <stop stop-color="#25465e"/>
      <stop offset=".18" stop-color="${color}"/>
      <stop offset=".34" stop-color="#dce7ec"/>
      <stop offset=".47" stop-color="#8ba6b8"/>
      <stop offset=".58" stop-color="#45647a"/>
      <stop offset=".76" stop-color="#b7cbd5"/>
      <stop offset="1" stop-color="#38596e"/>
    </linearGradient>
    <linearGradient id="${id}-fin" x1="38" y1="20" x2="9" y2="20" gradientUnits="userSpaceOnUse">
      <stop stop-color="#b7cbd5" stop-opacity=".75"/>
      <stop offset="1" stop-color="#90b1c7" stop-opacity=".16"/>
    </linearGradient>
    <radialGradient id="${id}-sheen" cx=".76" cy=".26" r=".66">
      <stop stop-color="#eef4f6" stop-opacity=".42"/>
      <stop offset="1" stop-color="#b5cbd9" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <path fill="url(#${id}-fin)" d="M38 18.6C28 18 19 12 10 9C11 13 15 17 21 20C15 23 11 27 10 31C19 28 28 22 38 21.4Z"/>
  <path fill="#9ebaca" opacity=".33" d="M116 15.5C109 12 101 8.3 94 8.5C96 11.8 100 15 105 17.5ZM116 24.5C109 28 101 31.7 94 31.5C96 28.2 100 25 105 22.5Z"/>
  <path fill="none" stroke="#bad0db" stroke-width=".55" opacity=".24" d="M36 19.5L13 11.5M35 20L21 20M36 20.5L13 28.5M113 16L98 10.2M113 24L98 29.8"/>
  <path fill="url(#${id}-body)" d="M35 18.6C53 18.3 73 12.6 102 12C122 11.7 140 15 150.5 18.1Q155 20 150.5 21.9C140 25 122 28.3 102 28C73 27.4 53 21.7 35 21.4Q32 20 35 18.6Z"/>
  <path fill="url(#${id}-sheen)" d="M35 18.6C53 18.3 73 12.6 102 12C122 11.7 140 15 150.5 18.1Q155 20 150.5 21.9C140 25 122 28.3 102 28C73 27.4 53 21.7 35 21.4Q32 20 35 18.6Z"/>
  <path fill="none" stroke="#e1ecf0" stroke-width=".65" stroke-linecap="round" opacity=".62" d="M48 18.9C78 15.8 119 14.8 143 18"/>
  <path fill="none" stroke="#27465e" stroke-width=".8" stroke-linecap="round" opacity=".38" d="M39 20C70 19.6 111 19.2 145 20"/>
  <path fill="none" stroke="#476478" stroke-width=".65" opacity=".5" d="M130 14.3Q125 16.6 127 18.4M130 25.7Q125 23.4 127 21.6"/>
  <path fill="none" stroke="#d7e3e9" stroke-width=".5" opacity=".25" d="M77 16.2L79 18M88 14.7L90 17.3M99 14L101 16.7M110 14.1L111 16.8M78 23L80 25M89 23.1L91 26M100 23.4L102 26.2M111 23.3L112 25.9"/>
  <g fill="#183247" stroke="#c2d2db" stroke-width=".45" opacity=".85">
    <ellipse cx="139" cy="16.8" rx="1.6" ry=".9"/>
    <ellipse cx="139" cy="23.2" rx="1.6" ry=".9"/>
  </g>`
}

/** Small silver fish pass above the floor, below the chapter artwork. */
export function initApproachFloorFish(section) {
  const stage = section?.querySelector('[data-approach-stage]')
  if (!stage) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const layer = document.createElement('div')
  layer.className = 'design-process__floor-fish'
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;contain:layout paint;'
  const environment = stage.querySelector('.design-process__environment')
  if (environment) environment.after(layer)
  else stage.prepend(layer)

  let disposed = false
  let running = false
  let visible = false
  let elapsed = 0
  let width = 0
  let height = 0
  let observer, dimensions

  const fish = FISH.map((config, index) => {
    const sprite = document.createElement('div')
    sprite.className = 'design-process__floor-fish-sprite'
    sprite.dataset.approachFloorFish = String(index)
    sprite.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;transform-origin:50% 50%;'
    const artwork = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    artwork.setAttribute('viewBox', '0 0 160 40')
    artwork.setAttribute('focusable', 'false')
    artwork.setAttribute('aria-hidden', 'true')
    artwork.classList.add('design-process__floor-fish-art')
    artwork.style.cssText = 'display:block;width:100%;height:100%;overflow:visible;pointer-events:none;'
    artwork.innerHTML = silverMinnowArtwork(index, config.color)
    sprite.append(artwork)
    layer.append(sprite)
    gsap.set(sprite, { xPercent: -50, yPercent: -50, opacity: config.opacity, force3D: true })
    const item = {
      config, index, sprite, length: 0,
      x: gsap.quickSetter(sprite, 'x', 'px'),
      y: gsap.quickSetter(sprite, 'y', 'px'),
      rotation: gsap.quickSetter(sprite, 'rotation', 'deg'),
    }
    return item
  })

  function render() {
    if (disposed || !width || !height) return
    for (const item of fish) {
      const { config, index, length } = item
      const margin = length / 2 + 48
      const travel = width + margin * 2
      const u = ((config.phase + elapsed / config.duration) % 1 + 1) % 1
      const phase = u * TAU + index * .83
      const amplitude = height * config.bend
      const speed = travel / config.duration
      const velocityY = Math.cos(phase) * amplitude * TAU / config.duration
      const heading = Math.atan(velocityY / speed) * 180 / Math.PI
      item.x(config.direction > 0 ? -margin + travel * u : width + margin - travel * u)
      item.y(height * config.depth + Math.sin(phase) * amplitude)
      item.rotation(config.direction > 0 ? heading : 180 - heading)
    }
  }

  function measure() {
    if (disposed) return
    width = stage.clientWidth
    height = stage.clientHeight
    const mobile = width <= 899
    for (const item of fish) {
      const length = mobile ? item.config.mobile : item.config.width
      const breadth = length * .25
      item.length = length
      item.sprite.style.width = length + 'px'
      item.sprite.style.height = breadth + 'px'
    }
    render()
    if (!observer) {
      const bounds = stage.getBoundingClientRect()
      visible = bounds.bottom > 0 && bounds.top < window.innerHeight
      sync()
    }
  }

  function tick(_time, delta) {
    if (!running || disposed) return
    // A stopped tab or offscreen scene never advances the local swimming clock.
    elapsed += Math.min(delta / 1000, .05)
    render()
  }

  function sync() {
    const next = !disposed && visible && !document.hidden && !reduced.matches
    if (next === running) return
    running = next
    if (next) {
      fish.forEach(item => { item.sprite.style.willChange = 'transform' })
      gsap.ticker.add(tick)
    } else {
      gsap.ticker.remove(tick)
      fish.forEach(item => {
        item.sprite.style.removeProperty('will-change')
        gsap.killTweensOf(item.sprite)
      })
    }
  }

  function onMotionChange() {
    sync()
    if (reduced.matches) {
      fish.forEach(item => {
        gsap.killTweensOf(item.sprite)
      })
    }
    render()
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
      sync()
    })
    observer.observe(stage)
  } else window.addEventListener('scroll', measure, { signal, passive: true })
  if ('ResizeObserver' in window) {
    dimensions = new ResizeObserver(measure)
    dimensions.observe(stage)
  }
  window.addEventListener('resize', measure, { signal, passive: true })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', onMotionChange, { signal })
  measure()

  return () => {
    if (disposed) return
    disposed = true
    controller.abort()
    observer?.disconnect()
    dimensions?.disconnect()
    gsap.ticker.remove(tick)
    fish.forEach(item => gsap.killTweensOf(item.sprite))
    layer.remove()
  }
}
