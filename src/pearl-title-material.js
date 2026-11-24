import './pearl-title-material.css'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (start, end, value) => { const p = clamp((value - start) / (end - start)); return p * p * (3 - 2 * p) }
const noise = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n) }

function surface(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width))
  canvas.height = Math.max(1, Math.ceil(height))
  return canvas
}

// Rasterize the actual site font, including each run's size and tracking. The
// distance to its edge gives each stroke a rounded, refracting water meniscus.
function createGlyph(element, ratio) {
  const style = getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  const size = parseFloat(style.fontSize)
  const padding = Math.ceil(size * .2 + 4)
  const mask = surface((rect.width + padding * 2) * ratio, (rect.height + padding * 2) * ratio)
  const ctx = mask.getContext('2d', { willReadFrequently: true })
  ctx.scale(ratio, ratio)
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  ctx.fontKerning = style.fontKerning
  if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing
  const content = element.textContent
  const text = style.textTransform === 'uppercase' ? content.toLocaleUpperCase(element.lang || document.documentElement.lang)
    : style.textTransform === 'lowercase' ? content.toLocaleLowerCase(element.lang || document.documentElement.lang) : content
  const metrics = ctx.measureText(text)
  const ascent = metrics.fontBoundingBoxAscent ?? size * .8
  const descent = metrics.fontBoundingBoxDescent ?? size * .2
  const baseline = padding + (rect.height - ascent - descent) / 2 + ascent
  ctx.fillStyle = ctx.strokeStyle = '#fff'
  ctx.lineWidth = Math.max(.5, size * .009)
  ctx.lineJoin = 'round'
  ctx.strokeText(text, padding, baseline)
  ctx.fillText(text, padding, baseline)
  const { width, height } = mask
  const pixels = ctx.getImageData(0, 0, width, height)
  const alpha = pixels.data
  const distance = new Float32Array(width * height)
  const edgePoints = []
  for (let i = 0; i < distance.length; i++) distance[i] = alpha[i * 4 + 3] > 100 ? 1000 : 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      if (!distance[i]) continue
      distance[i] = Math.min(distance[i], distance[i - 1] + 1, distance[i - width] + 1,
        distance[i - width - 1] + 1.414, distance[i - width + 1] + 1.414)
    }
  }
  for (let y = height - 2; y > 0; y--) {
    for (let x = width - 2; x > 0; x--) {
      const i = y * width + x
      if (!distance[i]) continue
      distance[i] = Math.min(distance[i], distance[i + 1] + 1, distance[i + width] + 1,
        distance[i + width + 1] + 1.414, distance[i + width - 1] + 1.414)
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x, offset = i * 4
      if (!alpha[offset + 3]) continue
      const dx = distance[i + 1] - distance[i - 1]
      const dy = distance[i + width] - distance[i - width]
      const normal = Math.hypot(dx, dy) || 1
      const light = clamp((dx * .48 + dy * .88) / normal * .5 + .5)
      const rim = Math.exp(-distance[i] / (1.5 * ratio))
      const glint = Math.pow(light, 5) * rim
      const caustic = Math.pow(.5 + .5 * Math.sin(y / ratio * .15 + x / ratio * .028), 14) * .35
      const shine = clamp(glint * .9 + caustic)
      alpha[offset] = 28 + shine * 210 + rim * 22
      alpha[offset + 1] = 111 + shine * 132 + rim * 30
      alpha[offset + 2] = 158 + shine * 94 + rim * 36
      alpha[offset + 3] *= clamp(.3 + rim * .3 + shine * .55)
      // Sample the right-facing wet edge, so every splash starts on a glyph.
      if (distance[i] > 0 && distance[i] < 1.5 && dx < -.6 && y % Math.max(2, Math.round(ratio * 3)) === 0) {
        edgePoints.push({ x: x / ratio - padding, y: y / ratio - padding })
      }
    }
  }
  const body = surface(width, height)
  body.getContext('2d').putImageData(pixels, 0, 0)
  const shimmer = surface(width, height)
  return { mask, body, shimmer, padding, size, ratio, edgePoints, width: width / ratio, height: height / ratio }
}

function drawDrop(ctx, x, y, radius, stretch, rotation, opacity) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(stretch, 1)
  ctx.globalAlpha *= opacity
  const fill = ctx.createRadialGradient(-radius * .35, -radius * .4, 0, 0, 0, radius)
  fill.addColorStop(0, '#e1f9ffdd')
  fill.addColorStop(.22, '#8bdcf0b0')
  fill.addColorStop(.5, '#367eaa18')
  fill.addColorStop(.78, '#23628e45')
  fill.addColorStop(1, '#b5edffbf')
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawWake(ctx, glyph, x, y, progress, seed) {
  const energy = smooth(.07, .28, progress) * (1 - smooth(.78, 1, progress))
  if (energy < .001 || !glyph.edgePoints.length) return
  const { size, edgePoints } = glyph
  const count = size < 60 ? 5 : 7
  for (let j = 0; j < count; j++) {
    const key = seed * 41 + j * 7 + 3
    const point = edgePoints[Math.floor(noise(key) * edgePoints.length)]
    const phase = clamp((progress - .07 - noise(key + 1) * .17) / .56)
    const length = size * (.1 + noise(key + 2) * .5) * energy
    const rise = (noise(key + 3) - .5) * size * .65 * energy
    const ax = x + point.x, ay = y + point.y
    const bx = ax + length, by = ay + rise
    const neck = Math.max(.65, size * (.012 + noise(key + 4) * .025)) * energy
    const attached = (1 - smooth(.35, .9, phase)) * energy
    if (attached > .025) {
      const fill = ctx.createLinearGradient(ax, ay - neck, bx, by + neck)
      fill.addColorStop(0, '#7bc5e66b')
      fill.addColorStop(.3, '#2a71983b')
      fill.addColorStop(.65, '#b7f0ffa6')
      fill.addColorStop(1, '#448fbc20')
      ctx.globalAlpha = attached * .85
      ctx.fillStyle = fill
      ctx.strokeStyle = '#b0e8fa9c'
      ctx.lineWidth = .65
      ctx.beginPath()
      ctx.moveTo(ax, ay - neck)
      ctx.bezierCurveTo(ax + length * .2, ay - neck * 2.8, ax + length * .56, by - neck * 1.8, bx - neck, by - neck * .55)
      ctx.bezierCurveTo(bx + neck * 1.8, by - neck * 1.4, bx + neck * 1.7, by + neck * 1.6, bx - neck * .5, by + neck * .8)
      ctx.bezierCurveTo(ax + length * .6, by + neck * .3, ax + length * .18, ay + neck * 1.5, ax, ay + neck)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.globalAlpha = energy
    const radius = Math.max(1, size * (.013 + noise(key + 5) * .025))
    drawDrop(ctx, bx + phase * size * .35, by + phase * phase * size * .1, radius, 1.15 + energy * .7, Math.atan2(rise, length), .85)
    for (let k = 1; k <= 3; k++) {
      const spread = noise(key + k * 13)
      drawDrop(ctx, bx + size * (.1 + spread * .6) * phase,
        by + (noise(key + k * 17) - .5) * size * phase,
        Math.max(.65, radius * (.25 + spread * .3)), 1 + energy * .3, 0, .5 + spread * .4)
    }
  }
  ctx.globalAlpha = 1
}

/** The original controllers still own layout, sideways travel and scroll time. */
export function createPearlTitleMaterial({ stage, runs }) {
  const leaves = [...runs].filter(Boolean)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!stage || !leaves.length || !ctx) return { render() {}, destroy() {} }
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const contrast = matchMedia('(forced-colors: active)')
  const originals = ['data-pearl-material', 'data-pearl-progress'].map(name => [name, stage.getAttribute(name)])
  const records = leaves.map(element => ({ element, hadClass: element.classList.contains('pearl-title-run'), glyph: null }))
  canvas.className = 'liquid-title-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  stage.append(canvas)
  let disposed = false, lastProgress = 0, visible = false, frame = 0, dimensions = ''

  function render(progress = lastProgress) {
    if (disposed) return
    lastProgress = clamp(Number.isFinite(progress) ? progress : 0)
    if (!visible || document.hidden || document.body.classList.contains('has-menu-open')) return
    const box = stage.getBoundingClientRect()
    const ratio = Math.min(devicePixelRatio || 1, 2)
    const key = `${box.width}:${box.height}:${ratio}`
    if (!box.width || !box.height) return
    if (dimensions !== key) {
      dimensions = key
      canvas.width = Math.ceil(box.width * ratio)
      canvas.height = Math.ceil(box.height * ratio)
      records.forEach(record => { record.glyph = null })
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, box.width, box.height)
    if (contrast.matches) return
    const p = reduced.matches ? 0 : lastProgress
    const energy = reduced.matches ? 0 : smooth(.08, .35, p) * (1 - smooth(.8, 1, p))
    // Read every position first; the existing heading has already moved.
    const positions = records.map(record => ({ record, rect: record.element.getBoundingClientRect() }))
    for (let index = 0; index < positions.length; index++) {
      const { record, rect } = positions[index]
      const glyph = record.glyph ||= createGlyph(record.element, ratio)
      const x = rect.left - box.left, y = rect.top - box.top
      if (x + glyph.width < -glyph.size || x > box.width + glyph.size) continue
      ctx.globalAlpha = 1 - smooth(.94, 1, p)
      const { body, mask, shimmer, padding, width, height, size } = glyph
      // Horizontal slices gently shear the water's skin, without moving the
      // phrase or changing its font. All variation is reversible scroll time.
      const slice = 2
      for (let sy = 0; sy < height; sy += slice) {
        const h = Math.min(slice, height - sy)
        const shift = Math.sin(sy / size * 12 + p * 23 + index) * Math.min(2.5, size * .016) * energy
        ctx.drawImage(body, 0, sy * ratio, body.width, h * ratio, x - padding + shift, y - padding + sy, width, h)
      }
      const shine = shimmer.getContext('2d')
      shine.setTransform(ratio, 0, 0, ratio, 0, 0)
      shine.clearRect(0, 0, width, height)
      shine.globalCompositeOperation = 'source-over'
      shine.drawImage(mask, 0, 0, width, height)
      shine.globalCompositeOperation = 'source-in'
      const beamX = width * (.15 + p * .85)
      const light = shine.createLinearGradient(beamX - size, 0, beamX + size, height)
      light.addColorStop(0, '#a6ecff00')
      light.addColorStop(.36, '#63c4e30a')
      light.addColorStop(.47, '#a3edff64')
      light.addColorStop(.5, '#e9fcff8c')
      light.addColorStop(.54, '#6ccbe92b')
      light.addColorStop(.7, '#398fbf00')
      light.addColorStop(1, '#a6ecff00')
      shine.fillStyle = light
      shine.fillRect(0, 0, width, height)
      ctx.drawImage(shimmer, x - padding, y - padding, width, height)
      if (!reduced.matches) drawWake(ctx, glyph, x, y, p, index + 1)
    }
    ctx.globalAlpha = 1
    for (const { element } of records) element.classList.add('pearl-title-run')
    stage.dataset.pearlMaterial = 'liquid-water'
    stage.dataset.pearlProgress = p.toFixed(5)
  }

  function repaint() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => { frame = 0; render() })
  }
  function invalidate() {
    records.forEach(record => { record.glyph = null })
    repaint()
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting
    if (visible) repaint()
  })
  observer.observe(stage)
  const menu = new MutationObserver(repaint)
  menu.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  window.addEventListener('resize', invalidate, { signal, passive: true })
  document.addEventListener('visibilitychange', repaint, { signal })
  reduced.addEventListener('change', repaint, { signal })
  contrast.addEventListener('change', repaint, { signal })
  document.fonts?.addEventListener('loadingdone', invalidate, { signal })
  document.fonts?.ready.then(() => { if (!disposed) invalidate() })

  return {
    render,
    destroy() {
      if (disposed) return
      disposed = true
      controller.abort()
      observer.disconnect()
      menu.disconnect()
      cancelAnimationFrame(frame)
      canvas.remove()
      records.forEach(({ element, hadClass }) => element.classList.toggle('pearl-title-run', hadClass))
      for (const [name, value] of originals) {
        if (value === null) stage.removeAttribute(name)
        else stage.setAttribute(name, value)
      }
    },
  }
}
