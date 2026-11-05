import './ocean-continuity.css'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }
const texture = '/images/skills-sideways-wave-illustrated-blue-v2.png'

/** Background-only water and ink edges. No scroll clocks or layout changes. */
export function initOceanContinuity(root = document) {
  const controller = new AbortController()
  const layers = []
  const masks = []
  let active = true
  let frame = 0
  const hosts = [
    ['#capabilities', -2, '24%', '72%', '.55'],
    ['.ocean-type__title-stage', 0, '24%', '35%', '.65'],
    ['[data-work-chapter="team"]', 0, '24%', '40%', '.6'],
    ['#diptyque-process > .project-details__stage', -1, '24%', '38%', '.6'],
    ['#personal-projects-intro > .work-chapter__stage', 0, '26%', '43%', '.85'],
    ['#personal-brand-gallery > .project-details__stage', -3, '24%', '36%', '.6'],
    ['#short-form-intro', 0, '24%', '46%', '.75'],
    ['#short-form-contents > .project-details__stage', -3, '22%', '35%', '.6'],
    ['[data-skills-stage]', -2, '24%', '35%', '.65'],
    ['#tools-skills > .tools-skills__inner', -2, '24%', '38%', '.5'],
    ['[data-about-stage]', 0, '24%', '35%', '.65'],
  ]
  for (const [selector, level, x, y, strength] of hosts) {
    const host = root.querySelector(selector)
    if (!host) continue
    const water = document.createElement('div')
    water.className = 'ocean-continuity__water'
    water.setAttribute('aria-hidden', 'true')
    water.style.setProperty('--ocean-water-level', level)
    water.style.setProperty('--ocean-light-x', x)
    water.style.setProperty('--ocean-light-y', y)
    water.style.setProperty('--ocean-light-strength', strength)
    water.style.setProperty('--ocean-water-texture', `url("${texture}")`)
    host.prepend(water)
    layers.push(water)
  }

  // Read each painting once per size. Bright original contour strokes survive
  // longer than the dark fill as the edge thins into the common water.
  function paintMask(record) {
    if (!active || !record.image.complete || !record.image.naturalWidth) return
    const bounds = record.target.getBoundingClientRect()
    const width = Math.max(1, bounds.width)
    const height = record.viewport ? window.innerHeight : Math.max(1, bounds.height)
    const key = `${Math.round(width)}:${Math.round(height)}:${record.image.currentSrc || record.image.src}`
    if (record.key === key) return
    const sampleWidth = Math.min(512, Math.max(192, Math.round(width / 3)))
    const sampleHeight = Math.max(1, Math.round(sampleWidth * height / width))
    const canvas = document.createElement('canvas')
    canvas.width = sampleWidth
    canvas.height = sampleHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const scale = Math.max(sampleWidth / record.image.naturalWidth, sampleHeight / record.image.naturalHeight)
    const dw = record.image.naturalWidth * scale, dh = record.image.naturalHeight * scale
    context.drawImage(record.image, (sampleWidth - dw) * .5, (sampleHeight - dh) * record.positionY, dw, dh)
    try {
      const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight)
      const light = new Float32Array(sampleWidth * sampleHeight)
      for (let i = 0; i < light.length; i++) {
        const p = i * 4
        light[i] = pixels.data[p] * .2126 + pixels.data[p + 1] * .7152 + pixels.data[p + 2] * .0722
      }
      for (let y = 0; y < sampleHeight; y++) {
        const v = y / Math.max(1, sampleHeight - 1)
        const above = Math.max(0, y - 2) * sampleWidth
        const below = Math.min(sampleHeight - 1, y + 2) * sampleWidth
        for (let x = 0; x < sampleWidth; x++) {
          const i = y * sampleWidth + x, p = i * 4
          const bend = Math.sin(x / sampleWidth * 11 + .8) * .012 + Math.sin(x / sampleWidth * 29) * .004
          const edge = smooth(.008, .25, v + bend) * (1 - smooth(.72, .992, v + bend))
          const local = (light[above + x] + light[below + x]
            + light[y * sampleWidth + Math.max(0, x - 2)] + light[y * sampleWidth + Math.min(sampleWidth - 1, x + 2)]) / 4
          const detail = clamp((light[i] - local) / 24)
          const stroke = clamp(light[i] / 95) * .65 + detail * .35
          const ends = smooth(0, .018, v) * (1 - smooth(.982, 1, v))
          const alpha = Math.pow(edge, 1.6 - stroke * 1.03) * ends
          pixels.data[p] = pixels.data[p + 1] = pixels.data[p + 2] = 255
          pixels.data[p + 3] = Math.round(alpha * 255)
        }
      }
      context.putImageData(pixels, 0, 0)
      record.target.style.setProperty('--ocean-ink-mask', `url("${canvas.toDataURL('image/png')}")`)
      record.key = key
    } catch {
      // The CSS edge remains available if a future remote painting is opaque.
    }
    canvas.width = canvas.height = 0
  }
  function schedule() {
    if (!active || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      masks.forEach(paintMask)
    })
  }
  for (const selector of ['.brand-gallery__room', '.short-form__room']) {
    const target = root.querySelector(selector), image = target?.querySelector('img')
    if (target && image) masks.push({ target, image, positionY: .5 })
  }
  const floor = root.querySelector('#diptyque-process > .project-details__stage')
  if (floor) {
    const image = new Image()
    image.decoding = 'async'
    image.src = '/images/process-city-common-ground-v12.png'
    masks.push({ target: floor, image, viewport: true, positionY: .6 })
  }
  for (const record of masks) {
    record.original = record.target.style.getPropertyValue('--ocean-ink-mask')
    record.priority = record.target.style.getPropertyPriority('--ocean-ink-mask')
    record.image.addEventListener('load', schedule, { signal: controller.signal })
  }
  const observer = new ResizeObserver(schedule)
  masks.forEach(record => observer.observe(record.target))
  window.addEventListener('resize', schedule, { signal: controller.signal, passive: true })
  schedule()
  return () => {
    active = false
    controller.abort()
    observer.disconnect()
    cancelAnimationFrame(frame)
    layers.forEach(layer => layer.remove())
    for (const record of masks) {
      if (record.original) record.target.style.setProperty('--ocean-ink-mask', record.original, record.priority)
      else record.target.style.removeProperty('--ocean-ink-mask')
    }
  }
}
