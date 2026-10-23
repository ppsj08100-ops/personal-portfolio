const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t

// Transparent margins belong to the illustration. Measure its upper draped
// edge, rather than cropping it, so that edge can meet the mirror's shell.
function measureCloth(image) {
  const fallback = {
    width: image.naturalWidth,
    height: image.naturalHeight,
    edge: { x: image.naturalWidth / 2, y: 0 },
  }
  const sample = document.createElement('canvas')
  const scale = Math.min(1, 256 / image.naturalWidth)
  sample.width = Math.max(1, Math.round(image.naturalWidth * scale))
  sample.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = sample.getContext('2d', { willReadFrequently: true })
  if (!context) return fallback
  context.drawImage(image, 0, 0, sample.width, sample.height)
  try {
    const { data } = context.getImageData(0, 0, sample.width, sample.height)
    const rows = Array.from({ length: sample.height }, () => ({ count: 0, sum: 0 }))
    let left = sample.width
    let right = -1
    let top = sample.height
    let bottom = -1
    for (let y = 0; y < sample.height; y++) {
      for (let x = 0; x < sample.width; x++) {
        if (data[(y * sample.width + x) * 4 + 3] < 160) continue
        rows[y].count++
        rows[y].sum += x
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
    }
    if (right <= left || bottom <= top) return fallback
    // Ignore a few fine threads above the first actual fold when choosing the
    // contact point. The complete illustration is still drawn, threads too.
    const threshold = Math.max(3, Math.max(...rows.map(row => row.count)) * .12)
    const edgeY = rows.findIndex(row => row.count >= threshold)
    const edge = rows[Math.max(0, edgeY)]
    return {
      width: (right - left + 1) / scale,
      height: (bottom - top + 1) / scale,
      edge: { x: edge.sum / Math.max(1, edge.count) / scale, y: Math.max(top, edgeY) / scale },
    }
  } catch {
    return fallback
  }
}

/** A whole pearl-silk sheet, lifted and opened only by scroll position. */
export function createMirrorFabricSheet(canvas, { imageUrl = '/images/mirror-pearl-veil.png' } = {}) {
  const context = canvas?.getContext('2d', { alpha: true })
  if (!context) return { ready: Promise.resolve(false), render() {}, resize() {}, destroy() {} }
  const originalOpacity = canvas.style.opacity
  let destroyed = false
  let loaded = false
  let width = 0
  let height = 0
  let ratio = 1
  let lastState
  let cloth
  let settleReady
  const image = new Image()
  image.decoding = 'async'

  function resize(nextWidth, nextHeight) {
    if (destroyed) return
    width = Math.max(1, nextWidth)
    height = Math.max(1, nextHeight)
    ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
  }

  function render(state) {
    lastState = state
    if (!loaded || destroyed) return
    if (state.width !== width || state.height !== height) resize(state.width, state.height)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    const p = clamp(state.progress)
    const opacity = .88 * smooth((p - .025) / .075) * (1 - smooth((p - .43) / .20))
    canvas.style.opacity = String(opacity)
    if (opacity < .001 || !state.rect) return

    const arrival = smooth((p - .03) / .24)
    const release = smooth((p - .30) / .30)
    const { rect } = state
    const contact = { x: rect.x + rect.width / 2, y: rect.y + rect.height * 1410 / 1536 }
    // The broad plane rises as one piece. Its upper edge briefly settles on
    // the bottom shell, then the sheet opens and drifts away to the right.
    // No leading head, growing stroke, repeated UVs or rim-following motion.
    const x = contact.x - width * .055 * (1 - arrival) + Math.min(width * .24, height * .33) * release
    const y = mix(height * 1.035, contact.y, arrival) - height * .18 * release
    const visibleWidth = Math.min(height * .50, width * .90)
    const scale = visibleWidth / cloth.width
    const opening = mix(.84, 1, smooth((p - .04) / .27)) + .035 * release
    const angle = mix(-.105, -.025, arrival) + .125 * release

    context.save()
    context.translate(x, y)
    context.rotate(angle)
    context.scale(scale * opening, scale)
    context.translate(-cloth.edge.x, -cloth.edge.y)
    // Draw the full asset exactly once; its large folds and soft edges retain
    // their original proportions and never become a cylindrical strip.
    context.drawImage(image, 0, 0)
    context.restore()
  }

  const ready = new Promise(resolve => {
    settleReady = resolve
    image.onload = () => {
      if (destroyed || !image.naturalWidth || !image.naturalHeight) { resolve(false); return }
      cloth = measureCloth(image)
      loaded = true
      if (lastState) render(lastState)
      settleReady = undefined
      resolve(true)
    }
    image.onerror = () => { settleReady = undefined; resolve(false) }
    image.src = imageUrl
  })

  function destroy() {
    if (destroyed) return
    destroyed = true
    loaded = false
    lastState = undefined
    cloth = undefined
    image.onload = null
    image.onerror = null
    settleReady?.(false)
    settleReady = undefined
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 1
    canvas.height = 1
    canvas.style.opacity = originalOpacity
  }

  return { ready, render, resize, destroy }
}
