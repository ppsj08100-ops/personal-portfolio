const clamp = value => Math.max(0, Math.min(1, value))
const smoothstep = (start, end, value) => {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}
const TAU = Math.PI * 2
let sourceCrestProfile = null
let sourceCrestMean = .43

/** The advancing foam edge, shared with the title's individual glyphs. */
export function getSkillsWaveFront(width, height, y, progress) {
  const q = clamp((progress - .10) / .82)
  const v = y / Math.max(height, 1)
  let shape = width * (
    .035 * Math.sin(TAU * v + .4)
    + .014 * Math.sin(TAU * 3 * v + 1.1)
    + .006 * Math.sin(TAU * 7 * v + .8)
  )
  if (sourceCrestProfile) {
    const position = clamp(v) * (sourceCrestProfile.length - 1)
    const row = Math.floor(position)
    const next = Math.min(sourceCrestProfile.length - 1, row + 1)
    const sourceX = sourceCrestProfile[row]
      + (sourceCrestProfile[next] - sourceCrestProfile[row]) * (position - row)
    shape = (sourceX - sourceCrestMean) * Math.max(width * .95, height * .9)
  }
  return width * (-.22 + 1.5 * q) + shape
}

// Fixed samples move with the wave, rather than being regenerated each frame.
const sample = index => {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}
const particles = Array.from({ length: 360 }, (_, index) => ({
  y: sample(index * 5 + 1),
  depth: sample(index * 5 + 2),
  radius: .45 + sample(index * 5 + 3) * 2.4,
  stretch: 1.2 + sample(index * 5 + 4) * 2.4,
  alpha: .035 + sample(index * 5 + 5) * .17,
}))
const traces = Array.from({ length: 38 }, (_, index) => ({
  y: sample(index * 4 + 1801),
  depth: sample(index * 4 + 1802),
  length: 12 + sample(index * 4 + 1803) * 52,
  bend: (sample(index * 4 + 1804) - .5) * 16,
}))

/**
 * Paint a real foamy wave across the frame horizontally. The source crest is
 * sampled once. That profile also defines getSkillsWaveFront(), so the entire
 * illustration moves in one draw without row warping or torn contours.
 * The caller owns scroll progress and scheduling; this module owns no RAF.
 */
export function createSkillsSideWave(canvas, { foregroundCanvas = null, mode = 'wave' } = {}) {
  if (!canvas) return { resize() {}, render() {}, paintForeground() {}, destroy() {}, ready: Promise.resolve(false) }
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) return { resize() {}, render() {}, paintForeground() {}, destroy() {}, ready: Promise.resolve(false) }

  const originalSize = ['width', 'height'].map(name => [name, canvas.getAttribute(name)])
  const foregroundContext = foregroundCanvas?.getContext('2d', { alpha: true }) || null
  const originalForegroundSize = foregroundContext
    ? ['width', 'height'].map(name => [name, foregroundCanvas.getAttribute(name)])
    : []
  const controller = new AbortController()
  const existingImage = canvas.parentElement?.querySelector('[data-skills-wave-texture]')
  const image = existingImage instanceof HTMLImageElement ? existingImage : new Image()
  const createdImage = image !== existingImage
  let width = 1
  let height = 1
  let ratio = 1
  let progress = 0
  let destroyed = false
  let dirty = true
  let imageReady = false
  let sourceWidth = 0
  let sourceHeight = 0
  let waveBuffer = null
  let foamBuffer = null
  let crest = null
  let baseGradient = null
  let settleReady
  let readySettled = false
  const ready = new Promise(resolve => { settleReady = resolve })

  function completeReady(loaded) {
    if (readySettled) return
    readySettled = true
    settleReady(loaded)
  }

  function resize(nextWidth, nextHeight) {
    if (destroyed) return
    width = Math.max(1, nextWidth)
    height = Math.max(1, nextHeight)
    ratio = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1))
    canvas.width = Math.ceil(width * ratio)
    canvas.height = Math.ceil(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if (foregroundContext) {
      foregroundCanvas.width = canvas.width
      foregroundCanvas.height = canvas.height
      foregroundContext.setTransform(ratio, 0, 0, ratio, 0, 0)
      foregroundContext.imageSmoothingEnabled = true
      foregroundContext.imageSmoothingQuality = 'high'
    }
    baseGradient = context.createRadialGradient(width * .24, height * .28, 0,
      width * .24, height * .28, Math.max(width * .8, height * .9))
    baseGradient.addColorStop(0, '#16458459')
    baseGradient.addColorStop(.55, '#0a2c6326')
    baseGradient.addColorStop(1, '#020b1d00')
    dirty = true
    render(progress)
  }

  function buildSource() {
    if (destroyed || !image.naturalWidth || !image.naturalHeight) return false
    sourceWidth = Math.min(2048, image.naturalWidth)
    sourceHeight = Math.max(1, Math.round(image.naturalHeight * sourceWidth / image.naturalWidth))
    waveBuffer = document.createElement('canvas')
    waveBuffer.width = sourceWidth
    waveBuffer.height = sourceHeight
    const bufferContext = waveBuffer.getContext('2d', { willReadFrequently: true })
    if (!bufferContext) return false
    bufferContext.drawImage(image, 0, 0, sourceWidth, sourceHeight)
    crest = new Float32Array(sourceHeight)

    // A smoothed luminance maximum finds the bright foamy ridge in each row.
    // No pixels are read back during render(). A narrow range avoids distant
    // glints in the open water being mistaken for the advancing wave edge.
    try {
      const sourcePixels = bufferContext.getImageData(0, 0, sourceWidth, sourceHeight)
      const pixels = sourcePixels.data
      const luminance = new Float32Array(sourceWidth * sourceHeight)
      for (let index = 0; index < luminance.length; index++) {
        const pixel = index * 4
        luminance[index] = pixels[pixel] * .2126 + pixels[pixel + 1] * .7152 + pixels[pixel + 2] * .0722
      }
      const rawCrest = new Float32Array(sourceHeight)
      const firstX = Math.floor(sourceWidth * .30)
      const lastX = Math.ceil(sourceWidth * .55)
      for (let y = 0; y < sourceHeight; y++) {
        let best = -1
        let bestX = sourceWidth * .43
        for (let x = firstX; x <= lastX; x += 2) {
          let light = 0
          for (let oy = -3; oy <= 3; oy += 3) {
            const sy = Math.max(0, Math.min(sourceHeight - 1, y + oy))
            for (let ox = -4; ox <= 4; ox += 2) {
              const sx = Math.max(0, Math.min(sourceWidth - 1, x + ox))
              light += luminance[sy * sourceWidth + sx]
            }
          }
          if (light > best) { best = light; bestX = x }
        }
        rawCrest[y] = bestX
      }
      for (let y = 0; y < sourceHeight; y++) {
        let total = 0
        let count = 0
        for (let offset = -28; offset <= 28; offset++) {
          const sy = Math.max(0, Math.min(sourceHeight - 1, y + offset))
          total += rawCrest[sy]
          count++
        }
        crest[y] = total / count
      }

      // Extract the illustrated foam once. Dark water stays transparent;
      // local contrast preserves the thin, irregular foam filaments instead
      // of laying an opaque water rectangle over the lettering.
      if (foregroundContext) {
        foamBuffer = document.createElement('canvas')
        foamBuffer.width = sourceWidth
        foamBuffer.height = sourceHeight
        const foamContext = foamBuffer.getContext('2d')
        if (foamContext) {
          const foamPixels = foamContext.createImageData(sourceWidth, sourceHeight)
          const foam = foamPixels.data
          const radius = Math.max(3, Math.round(sourceWidth / 192))
          for (let y = 0; y < sourceHeight; y++) {
            const above = Math.max(0, y - radius) * sourceWidth
            const row = y * sourceWidth
            const below = Math.min(sourceHeight - 1, y + radius) * sourceWidth
            for (let x = 0; x < sourceWidth; x++) {
              const index = row + x
              const light = luminance[index]
              if (light <= 48) continue
              const left = Math.max(0, x - radius)
              const right = Math.min(sourceWidth - 1, x + radius)
              const local = (
                luminance[above + left] + luminance[above + x] + luminance[above + right]
                + luminance[row + left] + luminance[row + right]
                + luminance[below + left] + luminance[below + x] + luminance[below + right]
              ) / 8
              const detail = smoothstep(-12, 36, light - local)
              const body = smoothstep(48, 184, light)
              const highlight = smoothstep(112, 218, light)
              const alpha = clamp(body * (.4 + detail * .6) + highlight * .36)
              const pixel = index * 4
              foam[pixel] = pixels[pixel] * .9 + 3
              foam[pixel + 1] = pixels[pixel + 1] * .93 + 4
              foam[pixel + 2] = pixels[pixel + 2] * .96 + 6
              foam[pixel + 3] = Math.round(alpha * 255)
            }
          }
          foamContext.putImageData(foamPixels, 0, 0)
        } else foamBuffer = null
      }
    } catch {
      // Same-origin is expected, but a future remote texture can still paint.
      crest.fill(sourceWidth * .43)
    }
    sourceCrestProfile = new Float32Array(sourceHeight)
    let crestTotal = 0
    for (let row = 0; row < sourceHeight; row++) {
      sourceCrestProfile[row] = crest[row] / sourceWidth
      crestTotal += sourceCrestProfile[row]
    }
    sourceCrestMean = crestTotal / sourceHeight

    // Remove the rectangular image's side boundaries once, before animation.
    const mask = bufferContext.createLinearGradient(0, 0, sourceWidth, 0)
    mask.addColorStop(0, '#0000')
    mask.addColorStop(.07, '#0003')
    mask.addColorStop(.20, '#000')
    mask.addColorStop(.77, '#000')
    mask.addColorStop(.94, '#0008')
    mask.addColorStop(1, '#0000')
    bufferContext.globalCompositeOperation = 'destination-in'
    bufferContext.fillStyle = mask
    bufferContext.fillRect(0, 0, sourceWidth, sourceHeight)
    bufferContext.globalCompositeOperation = 'source-over'
    if (foamBuffer) {
      const foamContext = foamBuffer.getContext('2d')
      foamContext.globalCompositeOperation = 'destination-in'
      foamContext.fillStyle = mask
      foamContext.fillRect(0, 0, sourceWidth, sourceHeight)
      foamContext.globalCompositeOperation = 'source-over'
    }
    imageReady = true
    dirty = true
    return true
  }

  function paintWater() {
    context.fillStyle = '#020b1d'
    context.fillRect(0, 0, width, height)
    if (baseGradient) {
      context.fillStyle = baseGradient
      context.fillRect(0, 0, width, height)
    }
    if (!imageReady) return
    // The unbroken open-water portion supplies quiet engraved water strokes,
    // with no horizon or shore introduced underneath the moving foam.
    context.globalAlpha = .16
    context.drawImage(image, image.naturalWidth * .72, 0, image.naturalWidth * .28, image.naturalHeight, 0, 0, width, height)
    context.globalAlpha = 1
  }

  function paintIllustratedWave(value) {
    const { left, displayWidth } = wavePlacement(value)
    context.globalAlpha = .9
    context.drawImage(waveBuffer, left, 0, displayWidth, height)
    context.globalAlpha = 1
    // A light navy wash joins the artwork to the surrounding cobalt sea.
    context.fillStyle = '#000b2f14'
    context.fillRect(0, 0, width, height)
  }

  function wavePlacement(value) {
    const displayWidth = Math.max(width * .95, height * .9)
    const q = clamp((value - .10) / .82)
    return {
      displayWidth,
      left: width * (-.22 + 1.5 * q) - sourceCrestMean * displayWidth,
    }
  }

  // A submerged current keeps the broad surface foam out of the composition.
  // Only paintForeground() borrows that foam, inside the dissolving glyphs.
  function paintCurrent(value) {
    if (!imageReady) return
    const shift = width * ((value - .5) * .22 - .15)
    context.globalAlpha = .12
    context.drawImage(image, image.naturalWidth * .72, 0,
      image.naturalWidth * .28, image.naturalHeight,
      shift, 0, width * 1.3, height)
    context.globalAlpha = 1
    const front = getSkillsWaveFront(width, height, height * .5, value)
    const reach = Math.max(width * .45, height * .65)
    const light = context.createRadialGradient(front, height * .42, 0, front, height * .42, reach)
    light.addColorStop(0, '#2d68b71c')
    light.addColorStop(.55, '#184c980e')
    light.addColorStop(1, '#184c9800')
    context.fillStyle = light
    context.fillRect(0, 0, width, height)
  }

  /** Paint only real foam over the caller's stage-sized glyph alpha mask. */
  function paintForeground(maskCanvas, strength = 1) {
    if (destroyed || !foregroundContext) return
    foregroundContext.setTransform(1, 0, 0, 1, 0, 0)
    foregroundContext.globalCompositeOperation = 'source-over'
    foregroundContext.globalAlpha = 1
    foregroundContext.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height)
    if (!foamBuffer || !maskCanvas?.width || !maskCanvas?.height) return
    const { left, displayWidth } = wavePlacement(progress)
    foregroundContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    foregroundContext.globalAlpha = clamp(strength)
    foregroundContext.drawImage(foamBuffer, left, 0, displayWidth, height)
    foregroundContext.globalAlpha = 1
    foregroundContext.globalCompositeOperation = 'destination-in'
    foregroundContext.drawImage(maskCanvas, 0, 0, width, height)
    foregroundContext.globalCompositeOperation = 'source-over'
  }

  function paintProceduralWave(value) {
    const foamWidth = Math.max(100, Math.min(width * .26, height * .34))
    const middle = getSkillsWaveFront(width, height, height / 2, value)
    const glow = context.createLinearGradient(middle - foamWidth, 0, middle + foamWidth * .18, 0)
    glow.addColorStop(0, '#184c9800')
    glow.addColorStop(.45, '#184c9825')
    glow.addColorStop(.85, '#a6c3e54a')
    glow.addColorStop(1, '#c6dbf200')
    context.beginPath()
    for (let y = -12; y <= height + 12; y += 12) {
      const front = getSkillsWaveFront(width, height, y, value)
      if (y === -12) context.moveTo(front + 12, y)
      else context.lineTo(front + 12, y)
    }
    for (let y = height + 12; y >= -12; y -= 12) {
      context.lineTo(getSkillsWaveFront(width, height, y, value) - foamWidth, y)
    }
    context.closePath()
    context.fillStyle = glow
    context.fill()
    paintFoamDetails(value, true)
  }

  function paintFoamDetails(value, fallback = false) {
    const foamWidth = Math.max(100, Math.min(width * .26, height * .34))
    const count = fallback ? particles.length : 64
    for (let index = 0; index < count; index++) {
      const dot = particles[index]
      const y = dot.y * height
      const x = getSkillsWaveFront(width, height, y, value) - dot.depth * dot.depth * foamWidth
      if (x < -8 || x > width + 8) continue
      context.globalAlpha = dot.alpha * (fallback ? 1 : .65)
      context.fillStyle = '#a6c3e5'
      context.beginPath()
      context.ellipse(x, y, dot.radius * dot.stretch, dot.radius * .55, -.12, 0, TAU)
      context.fill()
    }
    context.lineWidth = .6
    context.strokeStyle = '#86aad8'
    for (const trace of traces) {
      const y = trace.y * height
      const x = getSkillsWaveFront(width, height, y, value) - foamWidth * (.25 + trace.depth * 1.35)
      if (x < -trace.length || x > width + trace.length) continue
      context.globalAlpha = fallback ? .15 : .075
      context.beginPath()
      context.moveTo(x, y)
      context.bezierCurveTo(x - trace.length * .32, y + trace.bend, x - trace.length * .65, y - trace.bend * .4, x - trace.length, y + trace.bend * .25)
      context.stroke()
    }
    context.globalAlpha = 1
  }

  function render(nextProgress) {
    if (destroyed) return
    const next = clamp(nextProgress)
    if (!dirty && next === progress) return
    progress = next
    dirty = false
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1
    paintWater()
    if (mode === 'current') {
      paintCurrent(progress)
    } else if (imageReady) {
      paintIllustratedWave(progress)
      paintFoamDetails(progress)
    } else paintProceduralWave(progress)
  }

  function loaded() {
    if (destroyed || imageReady) return
    buildSource()
    render(progress)
    completeReady(true)
  }

  image.addEventListener('load', loaded, { once: true, signal: controller.signal })
  image.addEventListener('error', () => completeReady(true), { once: true, signal: controller.signal })
  if (createdImage) {
    image.decoding = 'async'
    image.src = '/images/skills-sideways-wave-illustrated-blue-v2.png'
  } else image.loading = 'eager'
  if (image.complete) {
    if (image.naturalWidth) loaded()
    else if (image.currentSrc || image.src) completeReady(true)
  }

  return {
    resize,
    render,
    paintForeground,
    ready,
    destroy() {
      if (destroyed) return
      destroyed = true
      controller.abort()
      if (createdImage) image.removeAttribute('src')
      completeReady(false)
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (foregroundContext) {
        foregroundContext.setTransform(1, 0, 0, 1, 0, 0)
        foregroundContext.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height)
      }
      if (waveBuffer) { waveBuffer.width = 0; waveBuffer.height = 0 }
      if (foamBuffer) { foamBuffer.width = 0; foamBuffer.height = 0 }
      waveBuffer = null
      foamBuffer = null
      crest = null
      for (const [name, original] of originalSize) {
        if (original === null) canvas.removeAttribute(name)
        else canvas.setAttribute(name, original)
      }
      for (const [name, original] of originalForegroundSize) {
        if (original === null) foregroundCanvas.removeAttribute(name)
        else foregroundCanvas.setAttribute(name, original)
      }
    },
  }
}
