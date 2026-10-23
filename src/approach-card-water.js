// Broad swashes enter around the floating objects and return to their origin.
// The water and its foam stay together; neither crosses the whole screen.
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smooth = value => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}
const bump = value => {
  const t = clamp(value)
  return 16 * t * t * (1 - t) * (1 - t)
}
const SURF_URL = '/images/approach-drift-surf-navy.png'
const WAVE_DURATION = 4600
const WAVE_INTERVAL = 800
// A light chart responds sooner than a metal instrument or a lantern.
const DRIFT = [
  { lag: .055, distance: 84, turn: 1.8, coast: 7 },
  { lag: .09, distance: 66, turn: -1.4, coast: 5 },
  { lag: .115, distance: 56, turn: .85, coast: 3 },
  { lag: .075, distance: 72, turn: -1.5, coast: 6 },
  { lag: .12, distance: 60, turn: .9, coast: 4 },
  { lag: .13, distance: 56, turn: -1.2, coast: 3 },
]

function clear(context, canvas) {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.clearRect(0, 0, canvas.width, canvas.height)
}

function canvasLayer(className, zIndex) {
  const canvas = document.createElement('canvas')
  canvas.className = className
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', background: 'none', border: '0', zIndex,
  })
  return canvas
}

// Layout offsets exclude transforms. Combining both keeps the water aligned
// through GSAP entrances, responsive positions, and the tiny sideways drift.
function matrixToStage(element, stage) {
  let matrix = new DOMMatrix()
  let node = element
  while (node && node !== stage) {
    const style = getComputedStyle(node)
    const [originX, originY] = style.transformOrigin.split(' ').map(parseFloat)
    const transform = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform)
    const local = new DOMMatrix()
      .translate(node.offsetLeft, node.offsetTop)
      .translate(originX || 0, originY || 0)
      .multiply(transform)
      .translate(-(originX || 0), -(originY || 0))
    matrix = local.multiply(matrix)
    node = node.offsetParent
  }
  return matrix
}

export function initApproachCardWater(section) {
  const stage = section?.querySelector('[data-approach-stage]')
  if (!stage) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const canvas = canvasLayer('design-process__surface-flow', '1')
  canvas.dataset.waterFlow = 'horizontal'
  const context = canvas.getContext('2d')
  const water = document.createElement('canvas')
  const waterContext = water.getContext('2d')
  if (!context || !waterContext) return () => {}
  stage.querySelector('.design-process__environment')?.after(canvas)
  if (!canvas.isConnected) stage.prepend(canvas)

  const surfaces = [...section.querySelectorAll('[data-approach-object]')].flatMap((object, index) => {
    const art = object.querySelector('.design-process__object-art')
    const image = art?.querySelector('img')
    if (!art || !image) return []
    return [{ object, art, image,
      scene: object.closest('[data-approach-scene]'),
      side: object.dataset.approachObject === 'right' ? 1 : 0,
      profile: DRIFT[index] || DRIFT[0],
      width: 0, height: 0, bed: null, padding: 0,
      pose: null, arrived: false, washes: 0 }]
  })
  let width = 0
  let height = 0
  let ratio = 1
  let visible = false
  let destroyed = false
  let frame = 0
  let lastScroll = window.scrollY
  let scrollDistance = 0
  let lastWave = -Infinity
  let wave = null
  let surf = null
  const texture = new Image()

  const isActive = surface => !section.classList.contains('is-pinned') ||
    surface.scene?.classList.contains('is-active')

  function setPose(surface, pose) {
    surface.pose = pose
    surface.art.style.setProperty('--approach-drift-x', `${pose.x.toFixed(3)}px`)
    surface.art.style.setProperty('--approach-drift-rotate', `${pose.rotation.toFixed(3)}deg`)
  }

  function ensurePose(surface) {
    if (surface.pose) return
    const direction = surface.side ? -1 : 1
    const scale = width < 900 ? .38 : 1
    setPose(surface, motion.matches ? { x: 0, rotation: 0 } : {
      x: -direction * surface.profile.distance * scale,
      rotation: -direction * surface.profile.turn * .6,
    })
  }

  function beginWave(time, strength) {
    const paths = new Map()
    surfaces.filter(isActive).forEach(surface => {
      ensurePose(surface)
      const direction = surface.side ? -1 : 1
      const scale = width < 900 ? .38 : 1
      // Goals stay near the composition's base pose, never accumulate drift.
      const goal = surface.washes % 2 ? -3 : 4
      paths.set(surface, {
        from: { ...surface.pose },
        goal: { x: direction * goal * scale, rotation: direction * (surface.washes % 2 ? -.16 : .22) },
        first: !surface.arrived,
        scale,
      })
      surface.washes++
    })
    wave = { start: time, strength, paths }
    scrollDistance = 0
    lastWave = time
  }

  function finishWave() {
    wave?.paths.forEach((path, surface) => {
      setPose(surface, { ...path.goal })
      surface.arrived = true
    })
    wave = null
  }

  function buildFootprint(surface) {
    const { image, width: objectWidth, height: objectHeight } = surface
    surface.bed = null
    surface.footprint = null
    if (!image.complete || !image.naturalWidth || !objectWidth || !objectHeight) return
    const mask = document.createElement('canvas')
    mask.width = Math.ceil(objectWidth * ratio)
    mask.height = Math.ceil(objectHeight * ratio)
    const maskContext = mask.getContext('2d', { willReadFrequently: true })
    if (!maskContext) return
    const half = image.dataset.floatHalf
    if (half) {
      const sourceWidth = image.naturalWidth / 2
      maskContext.drawImage(image, half === 'right' ? sourceWidth : 0, 0,
        sourceWidth, image.naturalHeight, 0, 0, mask.width, mask.height)
    } else {
      const fit = Math.min(mask.width / image.naturalWidth, mask.height / image.naturalHeight)
      const fittedWidth = image.naturalWidth * fit
      const fittedHeight = image.naturalHeight * fit
      maskContext.drawImage(image, (mask.width - fittedWidth) / 2,
        (mask.height - fittedHeight) / 2, fittedWidth, fittedHeight)
    }
    const pixels = maskContext.getImageData(0, 0, mask.width, mask.height)
    const footprint = document.createElement('canvas')
    footprint.width = mask.width
    footprint.height = mask.height
    const footprintContext = footprint.getContext('2d')
    if (!footprintContext) return
    const { width: mw, height: mh } = mask
    const count = mw * mh
    const outside = new Uint8Array(count)
    const queue = new Int32Array(count)
    let head = 0, tail = 0
    const visit = index => {
      if (outside[index] || pixels.data[index * 4 + 3] >= 24) return
      outside[index] = 1
      queue[tail++] = index
    }
    for (let x = 0; x < mw; x++) { visit(x); visit((mh - 1) * mw + x) }
    for (let y = 1; y < mh - 1; y++) { visit(y * mw); visit(y * mw + mw - 1) }
    while (head < tail) {
      const index = queue[head++]
      const x = index % mw
      if (x) visit(index - 1)
      if (x < mw - 1) visit(index + 1)
      if (index >= mw) visit(index - mw)
      if (index < count - mw) visit(index + mw)
    }
    // A continuous body of water sits behind the whole object, including its
    // delayed drift and rotation. This is filled water, never an outline ring.
    for (let index = 0; index < count; index++) {
      const offset = index * 4
      const alpha = outside[index] ? 0 : 255
      pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = 255
      pixels.data[offset + 3] = alpha
    }
    footprintContext.putImageData(pixels, 0, 0)
    surface.footprint = footprint
    buildWaterbed(surface)
  }

  function buildWaterbed(surface) {
    if (!surface.footprint || !texture.complete || !texture.naturalWidth) return
    const mobile = width < 900
    const padding = mobile ? 88 : 160
    const reach = (mobile ? 48 : 106) * ratio
    const bed = document.createElement('canvas')
    bed.width = Math.ceil((surface.width + padding * 2) * ratio)
    bed.height = Math.ceil((surface.height + padding * 2) * ratio)
    const bedContext = bed.getContext('2d')
    const region = document.createElement('canvas')
    region.width = bed.width
    region.height = bed.height
    const regionContext = region.getContext('2d')
    if (!bedContext || !regionContext) return
    const offset = padding * ratio
    // Expand an organic footprint far enough to contain every delayed pose.
    regionContext.filter = `blur(${(mobile ? 19 : 32) * ratio}px)`
    for (let step = 0; step < 16; step++) {
      const angle = step / 16 * Math.PI * 2
      regionContext.drawImage(surface.footprint,
        offset + Math.cos(angle) * reach, offset + Math.sin(angle) * reach)
    }
    regionContext.filter = 'none'
    regionContext.drawImage(surface.footprint, offset, offset)
    bedContext.filter = 'saturate(.65) brightness(.64)'
    bedContext.drawImage(texture, 0, 0, texture.naturalWidth * .30, texture.naturalHeight,
      0, 0, bed.width, bed.height)
    bedContext.filter = 'none'
    bedContext.globalCompositeOperation = 'destination-in'
    bedContext.drawImage(region, 0, 0)
    surface.bed = bed
    surface.padding = padding
  }

  function buildSurf() {
    surf = null
    if (!texture.complete || !texture.naturalWidth || !height) return
    // Retain the blue water as well as the connected foam. Only feather the
    // rectangular source edges, leaving the original surf boundary intact.
    surf = document.createElement('canvas')
    surf.width = texture.naturalWidth
    surf.height = texture.naturalHeight
    const surfContext = surf.getContext('2d')
    if (!surfContext) { surf = null; return }
    surfContext.filter = 'saturate(.65) brightness(.88)'
    surfContext.drawImage(texture, 0, 0)
    surfContext.filter = 'none'
    surfContext.globalCompositeOperation = 'destination-in'
    const ends = surfContext.createLinearGradient(0, 0, 0, surf.height)
    ends.addColorStop(0, 'transparent')
    ends.addColorStop(.15, '#000')
    ends.addColorStop(.85, '#000')
    ends.addColorStop(1, 'transparent')
    surfContext.fillStyle = ends
    surfContext.fillRect(0, 0, surf.width, surf.height)
    const edge = surfContext.createLinearGradient(0, 0, surf.width, 0)
    edge.addColorStop(0, 'transparent')
    edge.addColorStop(.12, '#000')
    edge.addColorStop(.64, '#000')
    edge.addColorStop(.78, 'rgba(0,0,0,.65)')
    edge.addColorStop(.92, 'rgba(0,0,0,.12)')
    edge.addColorStop(1, 'transparent')
    surfContext.fillStyle = edge
    surfContext.fillRect(0, 0, surf.width, surf.height)

  }

  function drawSurfaces(tide) {
    surfaces.forEach(surface => {
      ensurePose(surface)
      if (!isActive(surface)) return
      // The inlet follows the chapter's base pose; the object responds later,
      // independently, so the crest visibly arrives before the object moves.
      const base = matrixToStage(surface.object, stage)
      const direction = surface.side ? -1 : 1
      const path = wave?.paths.get(surface)
      if (path) {
        const { lag, distance, turn, coast } = surface.profile
        const arrival = smooth((tide.progress - lag) / .52)
        const inertia = bump((tide.progress - .48) / .50)
        const current = path.first ? 0 : distance * .17 *
          bump((tide.progress - lag) / (.90 - lag)) * tide.strength
        setPose(surface, {
          x: path.from.x + (path.goal.x - path.from.x) * arrival +
            direction * path.scale * (coast * inertia + current),
          rotation: path.from.rotation + (path.goal.rotation - path.from.rotation) * arrival +
            direction * turn * bump((tide.progress - .22) / .68) * tide.strength,
        })
      }
      if (!surf || tide.envelope < .001) return
      if (surface.bed) {
        waterContext.setTransform(ratio * base.a, ratio * base.b,
          ratio * base.c, ratio * base.d, ratio * base.e, ratio * base.f)
        waterContext.drawImage(surface.bed, -surface.padding, -surface.padding,
          surface.width + surface.padding * 2, surface.height + surface.padding * 2)
      }
      const center = base.transformPoint({ x: surface.width / 2, y: surface.height / 2 })
      const mobile = width < 900
      const surfHeight = Math.min(height * .94, surface.height + (mobile ? 120 : 220))
      const surfWidth = surfHeight * surf.width / surf.height
      const reach = tide.advance * (mobile ? 36 : 68)
      const start = center.x - surfWidth * .63 + reach
      const y = center.y - surfHeight / 2
      waterContext.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (surface.side) {
        // Turn the right inlet; the different crest positions keep the two
        // swashes from looking like identical decorative brackets.
        waterContext.translate(center.x * 2, center.y * 2)
        waterContext.scale(-1, -1)
        waterContext.drawImage(surf, start, y, surfWidth, surfHeight)
      } else {
        waterContext.drawImage(surf, start, y, surfWidth, surfHeight)
      }
    })
    if (tide.envelope > .001) {
      waterContext.setTransform(ratio, 0, 0, ratio, 0, 0)
      // Keep a generous reading area, with a soft transition into the water.
      const reading = waterContext.createLinearGradient(0, 0, width, 0)
      for (const [point, alpha] of [[0, 1], [.22, 1], [.32, .5], [.40, 0], [.60, 0], [.68, .5], [.78, 1], [1, 1]]) {
        reading.addColorStop(point, `rgba(0,0,0,${alpha})`)
      }
      waterContext.globalCompositeOperation = 'destination-in'
      waterContext.fillStyle = reading
      waterContext.fillRect(0, 0, width, height)
      waterContext.globalCompositeOperation = 'source-over'
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.globalAlpha = tide.envelope * .78
      context.drawImage(water, 0, 0, width, height)
    }
  }

  function draw(time = performance.now()) {
    clear(context, canvas)
    clear(waterContext, water)
    const tide = { progress: 0, envelope: 0, advance: 0, recede: 0, strength: 0 }
    if (wave && surf && !motion.matches) {
      const progress = clamp((time - wave.start) / WAVE_DURATION)
      tide.progress = progress
      tide.recede = smooth((progress - .38) / .62)
      tide.advance = progress < .38 ? smooth(progress / .38) : 1 - tide.recede
      tide.envelope = smooth(progress / .17) * (1 - smooth((progress - .60) / .40)) * wave.strength
      tide.strength = wave.strength
    }
    drawSurfaces(tide)
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    finishWave()
    scrollDistance = 0
    lastWave = -Infinity
    clear(context, canvas)
    clear(waterContext, water)
  }

  function tick(time) {
    frame = 0
    if (destroyed || !visible || document.hidden || motion.matches) return
    if (wave && time - wave.start >= WAVE_DURATION) finishWave()
    draw(time)
    if (wave) frame = requestAnimationFrame(tick)
  }

  function requestDraw() {
    if (!frame && !destroyed && visible && !document.hidden && !motion.matches && wave) {
      frame = requestAnimationFrame(tick)
    }
  }

  function onScroll() {
    const current = window.scrollY
    const distance = Math.min(Math.abs(current - lastScroll), 160)
    lastScroll = current
    if (!visible || document.hidden || motion.matches) return
    scrollDistance = Math.min(160, scrollDistance + distance)
    const time = performance.now()
    if (wave && time - wave.start >= WAVE_DURATION) finishWave()
    if (wave) { scrollDistance = 0; return }
    if (!wave && scrollDistance >= 8 && time - lastWave >= WAVE_INTERVAL) {
      beginWave(time, clamp(.78 + scrollDistance / 700, .78, 1))
    }
    requestDraw()
  }

  function measure() {
    if (destroyed) return
    const newRatio = Math.min(window.devicePixelRatio || 1, 1.25)
    const stageChanged = width !== stage.clientWidth || height !== stage.clientHeight || ratio !== newRatio
    const previousScale = width < 900 ? .38 : 1
    const nextScale = stage.clientWidth < 900 ? .38 : 1
    if (width && previousScale !== nextScale) {
      const factor = nextScale / previousScale
      surfaces.forEach(surface => {
        if (surface.pose) setPose(surface, { ...surface.pose, x: surface.pose.x * factor })
      })
      wave?.paths.forEach(path => {
        path.from.x *= factor
        path.goal.x *= factor
        path.scale *= factor
      })
    }
    width = stage.clientWidth
    height = stage.clientHeight
    ratio = newRatio
    if (stageChanged) {
      ;[canvas, water].forEach(layer => {
        layer.width = Math.ceil(width * ratio)
        layer.height = Math.ceil(height * ratio)
      })
    }
    surfaces.forEach(surface => {
      const objectWidth = surface.art.clientWidth
      const objectHeight = surface.art.clientHeight
      if (surface.width === objectWidth && surface.height === objectHeight && !stageChanged) return
      surface.width = objectWidth
      surface.height = objectHeight
      if (!surface.arrived && !wave) surface.pose = null
      buildFootprint(surface)
    })
    if (!surf) buildSurf()
    draw()
  }

  function syncMotion() {
    stop()
    if (motion.matches) surfaces.forEach(surface => {
      setPose(surface, { x: 0, rotation: 0 })
      surface.arrived = true
    })
    lastScroll = window.scrollY
  }

  texture.addEventListener('load', () => {
    if (destroyed) return
    buildSurf()
    surfaces.forEach(buildWaterbed)
    draw()
  }, { signal })
  texture.src = SURF_URL
  surfaces.forEach(surface => {
    surface.image.addEventListener('load', () => {
      if (destroyed) return
      buildFootprint(surface)
      draw()
    }, { signal })
  })
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    lastScroll = window.scrollY
    if (!visible) stop()
  })
  const resize = new ResizeObserver(measure)
  let activeChapter = section.querySelector('[data-approach-scene].is-active')
  const activeScene = new MutationObserver(() => {
    const next = section.querySelector('[data-approach-scene].is-active')
    if (next !== activeChapter && visible && !motion.matches && !document.hidden) {
      // A fresh inlet leads a new chapter, with no jump in the object's pose.
      wave = null
      beginWave(performance.now(), .90)
      requestDraw()
    }
    activeChapter = next
    draw()
  })
  intersection.observe(stage)
  resize.observe(stage)
  surfaces.forEach(surface => resize.observe(surface.art))
  section.querySelectorAll('[data-approach-scene]').forEach(scene => {
    activeScene.observe(scene, { attributes: true, attributeFilter: ['class'] })
  })
  window.addEventListener('scroll', onScroll, { passive: true, signal })
  window.addEventListener('resize', measure, { passive: true, signal })
  document.addEventListener('visibilitychange', syncMotion, { signal })
  motion.addEventListener('change', syncMotion, { signal })
  measure()

  return () => {
    if (destroyed) return
    destroyed = true
    controller.abort()
    intersection.disconnect()
    resize.disconnect()
    activeScene.disconnect()
    stop()
    canvas.remove()
    surfaces.forEach(surface => {
      surface.art.style.removeProperty('--approach-drift-x')
      surface.art.style.removeProperty('--approach-drift-rotate')
    })
  }
}
