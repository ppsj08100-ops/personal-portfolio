const FRAME_MS = 1000 / 24
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const mix = (from, to, amount) => from + (to - from) * amount
const smooth = (from, to, value) => {
  const amount = clamp((value - from) / (to - from))
  return amount * amount * (3 - 2 * amount)
}
const CAMERA = [{ x: 0, y: -16 }, { x: -33.333, y: -16 }, { x: -66.667, y: -16 }]

/** The underwater lens scans one living world through three observation points. */
export function createApproachSeaLife(section) {
  const layer = section?.querySelector('[data-approach-sea-life]')
  if (!layer) return { setProgress() {}, destroy() {} }
  const creatures = [...layer.querySelectorAll('[data-sea-creature]')]
  const corals = [...layer.querySelectorAll('[data-sea-coral]')]
  const images = [...layer.querySelectorAll('img')]
  const originalStyles = new Map()
  const lastStyles = new Map()
  function write(element, property, value) {
    if (!originalStyles.has(element)) {
      originalStyles.set(element, new Map())
      lastStyles.set(element, new Map())
    }
    const properties = originalStyles.get(element)
    if (!properties.has(property)) properties.set(property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)])
    if (lastStyles.get(element).get(property) === value) return
    element.style.setProperty(property, value)
    lastStyles.get(element).set(property, value)
  }
  const originalData = ['seaLifeReady', 'seaLifeMotion', 'seaLifeProgress', 'seaLifeView'].map(key => [key, layer.dataset[key]])
  const listeners = new AbortController()
  const { signal } = listeners
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  let disposed = false, ready = false, onScreen = false
  let progress = 0, elapsed = 0, width = 0, height = 0
  let frame = 0, lastPaint = 0, decodeVersion = 0

  function canAnimate() {
    return !disposed && ready && onScreen && !reduced.matches
      && !document.hidden && !menu?.open && !document.body.classList.contains('has-menu-open')
  }
  function pose(element, x, y, roll, opacity) {
    write(element, '--sea-x', `${x.toFixed(3)}px`)
    write(element, '--sea-y', `${y.toFixed(3)}px`)
    write(element, '--sea-roll', `${roll.toFixed(3)}deg`)
    write(element, '--sea-opacity', opacity.toFixed(4))
  }
  function render() {
    if (disposed) return
    const still = reduced.matches
    const position = still ? .5 : progress
    const time = still ? 0 : elapsed
    const viewingOrbit = smooth(.22, .44, progress) + smooth(.55, .77, progress)
    const orbit = still ? Math.round(viewingOrbit) : viewingOrbit
    const cameraIndex = Math.min(1, Math.floor(orbit))
    const cameraMix = orbit - cameraIndex
    write(layer, '--sea-camera-x', `${mix(CAMERA[cameraIndex].x, CAMERA[cameraIndex + 1].x, cameraMix).toFixed(3)}%`)
    write(layer, '--sea-camera-y', `${mix(CAMERA[cameraIndex].y, CAMERA[cameraIndex + 1].y, cameraMix).toFixed(3)}%`)
    layer.dataset.seaLifeView = ['left', 'center', 'right'][Math.round(orbit)]
    const light = .7 + .3 * smooth(0, 1, position)
    for (const element of creatures) {
      const kind = element.dataset.seaCreature
      if (kind === 'turtle') {
        const wave = Math.sin(time * Math.PI * 2 / 8.8)
        const x = still ? 0 : wave * width * .025
        const y = still ? 0 : Math.sin(time * Math.PI * 2 / 10.5) * height * .012 + wave * 3
        pose(element, x, y, still ? 0 : wave * 2, .68 * light)
      } else if (kind === 'jelly') {
        pose(element, 0, still ? 0 : Math.sin(time * Math.PI * 2 / 10) * 6,
          still ? 0 : Math.sin(time * Math.PI * 2 / 12) * 3,
          .34 * light)
      } else {
        const index = Number(kind?.split('-')[1]) || 0
        const phase = index * 1.1
        pose(element, still ? 0 : Math.sin(time * .56 + phase) * 5,
          still ? 0 : Math.sin(time * .48 + phase + .4) * 2,
          still ? 0 : Math.sin(time * .4 + phase) * 1.3,
          .48 * light)
      }
    }
    for (const element of corals) {
      const maximum = element.dataset.seaCoral === 'left' ? .5 : .38
      pose(element, 0, 0, 0, light * maximum)
    }
    layer.dataset.seaLifeProgress = progress.toFixed(4)
  }
  function tick(now) {
    frame = 0
    if (!canAnimate()) { sync(); return }
    if (!lastPaint || now - lastPaint >= FRAME_MS) {
      elapsed += lastPaint ? Math.min(.1, (now - lastPaint) / 1000) : FRAME_MS / 1000
      render()
      lastPaint = now
    }
    frame = requestAnimationFrame(tick)
  }
  function sync() {
    if (disposed) return
    const running = canAnimate()
    layer.dataset.seaLifeMotion = reduced.matches ? 'reduced' : running ? 'running' : 'paused'
    if (running) {
      if (!frame) frame = requestAnimationFrame(tick)
    } else {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      lastPaint = 0
    }
  }
  function resize() {
    if (disposed) return
    width = layer.clientWidth
    height = layer.clientHeight
    render()
    sync()
  }
  async function decodeImages() {
    const version = ++decodeVersion
    const loaded = await Promise.all(images.map(async image => {
      try {
        if (typeof image.decode === 'function') await image.decode()
        return image.complete && image.naturalWidth > 0
      } catch { return false }
    }))
    if (disposed || version !== decodeVersion) return
    ready = loaded.length > 0 && loaded.every(Boolean)
    layer.dataset.seaLifeReady = String(ready)
    sync()
  }
  function mediaChanged() { render(); sync() }

  images.forEach(image => {
    image.addEventListener('load', decodeImages, { signal })
    image.addEventListener('error', decodeImages, { signal })
  })
  window.addEventListener('resize', resize, { passive: true, signal })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', mediaChanged, { signal })
  menu?.addEventListener('toggle', sync, { signal })
  const intersection = new IntersectionObserver(entries => {
    onScreen = entries.some(entry => entry.isIntersecting)
    sync()
  }, { threshold: 0 })
  intersection.observe(layer)
  const menuObserver = new MutationObserver(sync)
  menuObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  if (menu) menuObserver.observe(menu, { attributes: true, attributeFilter: ['open'] })

  layer.dataset.seaLifeReady = 'false'
  resize()
  decodeImages()
  return {
    setProgress(value) {
      if (disposed) return
      progress = clamp(value)
      render()
      sync()
    },
    destroy() {
      if (disposed) return
      disposed = true
      if (frame) cancelAnimationFrame(frame)
      listeners.abort()
      intersection.disconnect()
      menuObserver.disconnect()
      for (const [element, properties] of originalStyles) {
        for (const [property, [value, priority]] of properties) {
          if (value) element.style.setProperty(property, value, priority)
          else element.style.removeProperty(property)
        }
      }
      for (const [key, value] of originalData) {
        if (value === undefined) delete layer.dataset[key]
        else layer.dataset[key] = value
      }
    },
  }
}
