import './work-personal-manta.css'

const ARTWORK = '/images/work-personal-manta-v1.png'
const ARTWORK_ASPECT = 1.5
const FRAME_MS = 40
const STROKE_PERIOD = 4.1
const WING_PADDING = 120
const HEAD = { u: .43, v: .72 }
const PLUNGE_PROGRESS = .792
const KNOTS = [0, .18, .38, .62, .76, .94, 1]
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}
const seed = index => {
  const value = Math.sin(index * 127.1 + 73.7) * 43758.5453
  return value - Math.floor(value)
}

// Monotone Hermite tangents round the route without overshooting a waypoint.
function makeRoute(points) {
  const axes = [0, 1].map(axis => {
    const slopes = points.slice(1).map((point, index) => (point[axis] - points[index][axis]) / (KNOTS[index + 1] - KNOTS[index]))
    const tangents = points.map((_, index) => index === 0 ? slopes[0] : index === points.length - 1 ? slopes.at(-1)
      : slopes[index - 1] * slopes[index] <= 0 ? 0 : 2 / (1 / slopes[index - 1] + 1 / slopes[index]))
    slopes.forEach((slope, index) => {
      if (!slope) { tangents[index] = 0; tangents[index + 1] = 0; return }
      const length = Math.hypot(tangents[index] / slope, tangents[index + 1] / slope)
      if (length > 3) { tangents[index] *= 3 / length; tangents[index + 1] *= 3 / length }
    })
    return tangents
  })
  return progress => {
    const p = clamp(progress)
    let index = 0
    while (index < KNOTS.length - 2 && p > KNOTS[index + 1]) index += 1
    const span = KNOTS[index + 1] - KNOTS[index]
    const t = (p - KNOTS[index]) / span
    const result = {}
    for (const [axis, key] of ['x', 'y'].entries()) {
      const a = points[index][axis], b = points[index + 1][axis]
      const m = axes[axis][index] * span, n = axes[axis][index + 1] * span
      result[key] = (2 * t ** 3 - 3 * t ** 2 + 1) * a + (t ** 3 - 2 * t ** 2 + t) * m
        + (-2 * t ** 3 + 3 * t ** 2) * b + (t ** 3 - t ** 2) * n
      result[`d${key}`] = ((6 * t ** 2 - 6 * t) * a + (3 * t ** 2 - 4 * t + 1) * m
        + (-6 * t ** 2 + 6 * t) * b + (3 * t ** 2 - 2 * t) * n) / span
    }
    return result
  }
}

/** Scroll carries one manta into the work; time flexes only its outer wings. */
export function initWorkPersonalManta(element) {
  if (!element) return { render() {}, destroy() {} }
  const stage = element.querySelector('[data-personal-stage], .work-chapter__stage') || element

  const layer = document.createElement('div')
  layer.className = 'work-personal-manta'
  layer.dataset.personalManta = ''
  layer.dataset.personalMantaReady = 'false'
  layer.dataset.personalMantaWingAxis = 'x'
  layer.dataset.personalMantaStrokePeriod = String(STROKE_PERIOD)
  layer.dataset.personalMantaRigidRegion = 'head:u.26-.59/v>=.61;body:ellipse(.53,.54,.15,.24)'
  layer.dataset.personalMantaWingRoots = '.46/.61'
  layer.setAttribute('aria-hidden', 'true')

  const image = new Image()
  image.className = 'work-personal-manta__image'
  image.dataset.personalMantaImage = ''
  image.dataset.personalMantaLoad = 'loading'
  image.alt = ''
  image.draggable = false
  image.decoding = 'async'
  layer.append(image)

  const canvas = document.createElement('canvas')
  canvas.className = 'work-personal-manta__canvas'
  canvas.dataset.personalMantaCanvas = ''
  canvas.setAttribute('aria-hidden', 'true')
  layer.append(canvas)
  stage.append(layer)

  const context = canvas.getContext('2d', { alpha: true })
  const texture = document.createElement('canvas')
  const textureContext = texture.getContext('2d')
  const silhouette = document.createElement('canvas')
  const silhouetteContext = silhouette.getContext('2d')
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const copy = element.querySelector('.work-chapter__copy')
  const route = element.querySelector('.work-route')
  const particles = Array.from({ length: 28 }, (_, index) => ({
    spread: seed(index + 1) * 2 - 1, delay: seed(index + 61) * .13,
    speed: .60 + seed(index + 121) * .5, radius: 1.6 + seed(index + 181) ** 2 * 6.8,
    depth: .3 + seed(index + 241) * .7, turn: seed(index + 301) * 2 - 1,
  }))

  let disposed = false
  let ready = false
  let onScreen = false
  let progress = 1
  let held = false
  let staticView = true
  let width = 0
  let height = 0
  let aspect = ARTWORK_ASPECT
  let dpr = 1
  let pose = null
  let alpha = 1
  let journey = false
  let dive = 0
  let burst = 0
  let bubbleOpacity = 0
  let origin = { x: 0, y: 0 }
  let running = false
  let mesh = null
  let raf = 0
  let timer = 0
  let previousFrame = 0
  let elapsed = 0
  let frames = 0

  function compose() {
    if (!width || !height) return
    const mobile = width < 768
    journey = held && !staticView && !reduced.matches
    const rootBox = stage.getBoundingClientRect()
    const copyY = Number.parseFloat(element.style.getPropertyValue('--chapter-copy-y')) || 0
    const captionBottom = copy ? copy.getBoundingClientRect().bottom - rootBox.top - copyY : height * .53
    const routeTop = route ? route.getBoundingClientRect().top - rootBox.top - copyY : height * .84
    const margin = mobile ? 18 : 24
    const requestedWidth = mobile ? Math.min(260, width * .83) : Math.max(430, Math.min(460, width * .315))
    const availableHeight = Math.max(36, routeTop - captionBottom - margin * 2)
    const baseWidth = journey ? requestedWidth : Math.min(requestedWidth, availableHeight * aspect)
    const baseHeight = baseWidth / aspect
    dive = journey ? smooth(.72, .94, progress) : 0
    burst = journey ? clamp((progress - .77) / .23) : 0
    bubbleOpacity = journey ? smooth(0, .16, burst) * (1 - smooth(.58, 1, burst)) : 0
    const perspective = 1 - .20 * smooth(.10, .92, dive)
    const headOffset = (imageWidth, imageHeight, angle) => {
      const x = (.5 - HEAD.u) * imageWidth, y = (HEAD.v - .5) * imageHeight
      return { x: Math.cos(angle) * x - Math.sin(angle) * y,
        y: Math.sin(angle) * x + Math.cos(angle) * y }
    }

    if (journey) {
      const targetHead = { x: width * (mobile ? .80 : .81), y: Math.min(height * (mobile ? .76 : .79), routeTop - (mobile ? 22 : 30)) }
      const offset = headOffset(baseWidth, baseHeight, .08)
      const impactCenter = { x: targetHead.x - offset.x, y: targetHead.y - offset.y }
      const crossY = mobile ? Math.min(height * .70, impactCenter.y - height * .035)
        : Math.min(height * .70 + 40, impactCenter.y - 12)
      const sample = makeRoute([
        [-width * (mobile ? .30 : .18), -height * (mobile ? .08 : .05)],
        [width * (mobile ? .015 : .12), height * .14],
        [width * (mobile ? .04 : .18), crossY - height * .10], [width * .46, crossY],
        [impactCenter.x, impactCenter.y], [impactCenter.x + width * .07, impactCenter.y + height * .24],
        [impactCenter.x + width * .11, impactCenter.y + height * .32],
      ])
      const at = sample(progress)
      const angleAt = point => .035 + .105 * Math.tanh(Math.atan2(point.dy, Math.max(1, point.dx)) / .7)
      const imageWidth = baseWidth * perspective, imageHeight = baseHeight * perspective
      alpha = smooth(.015, .15, progress) * (1 - smooth(.62, .99, dive))
      const head = headOffset(imageWidth, imageHeight, angleAt(at))
      pose = { x: at.x, y: at.y, width: imageWidth, height: imageHeight,
        angle: angleAt(at), opacity: alpha * .94, flip: -1, headX: at.x + head.x, headY: at.y + head.y }
      const plunge = sample(PLUNGE_PROGRESS)
      const plungeDive = smooth(.72, .94, PLUNGE_PROGRESS)
      const plungeScale = 1 - .20 * smooth(.10, .92, plungeDive)
      const impact = headOffset(baseWidth * plungeScale, baseHeight * plungeScale, angleAt(plunge))
      origin = { x: plunge.x + impact.x, y: plunge.y + impact.y }
    } else {
      const minY = captionBottom + margin + baseHeight / 2
      const maxY = routeTop - margin - baseHeight / 2
      const y = Math.min(Math.max(height * .70, minY), Math.max(minY, maxY))
      const head = headOffset(baseWidth, baseHeight, .06)
      alpha = 1
      pose = { x: width * .5, y, width: baseWidth, height: baseHeight,
        angle: .06, opacity: .9, flip: -1, headX: width * .5 + head.x, headY: y + head.y }
      origin = { x: pose.headX, y: pose.headY }
    }
    Object.assign(image.style, {
      left: `${pose.x.toFixed(3)}px`, top: `${pose.y.toFixed(3)}px`,
      width: `${pose.width.toFixed(3)}px`, height: `${pose.height.toFixed(3)}px`,
      transform: `translate(-50%, -50%) rotate(${pose.angle}rad) scaleX(-1)`,
      maskImage: dive > 0 ? `linear-gradient(to bottom, #000 ${Math.max(0, 1 - dive * 1.12 - .06) * 100}%, transparent ${Math.max(0, 1 - dive * 1.12 + .06) * 100}%)` : 'none',
    })
    image.style.setProperty('--personal-manta-image-opacity', String(pose.opacity))
    layer.style.opacity = '1'
    layer.dataset.personalMantaProgress = progress.toFixed(4)
    layer.dataset.personalMantaPose = JSON.stringify(Object.fromEntries(
      Object.entries(pose).map(([key, value]) => [key, Number(value.toFixed(3))]),
    ))
    layer.dataset.personalMantaJourney = String(journey)
    layer.dataset.personalMantaDive = dive.toFixed(4)
    layer.dataset.personalMantaBurst = burst.toFixed(4)
    layer.dataset.personalMantaBubbleOpacity = bubbleOpacity.toFixed(4)
    layer.dataset.personalMantaOrigin = JSON.stringify({ x: Number(origin.x.toFixed(3)), y: Number(origin.y.toFixed(3)), progress: PLUNGE_PROGRESS })
    layer.dataset.personalMantaOriginX = (origin.x / width).toFixed(4)
    layer.dataset.personalMantaOriginY = (origin.y / height).toFixed(4)
    layer.dataset.personalMantaComposition = !journey ? 'settled' : progress < .20 ? 'arriving'
      : progress < .72 ? 'gliding' : progress < .94 ? 'diving' : progress < 1 ? 'bubbles' : 'complete'
  }

  function prepareMesh() {
    if (!ready || !texture.width || !texture.height) return
    const columns = width < 768 ? 36 : 48
    const rows = width < 768 ? 8 : 12
    if (mesh?.columns === columns && mesh?.rows === rows) return
    const vertices = []
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns, v = row / rows
        const bodyDistance = Math.hypot((u - .53) / .15, (v - .54) / .24)
        const body = 1 - smooth(.95, 1.18, bodyDistance)
        const head = smooth(.20, .26, u) * (1 - smooth(.59, .64, u)) * smooth(.55, .61, v)
        const left = u < .535
        const hinge = left ? .46 - .08 * (v - .5) : .61 + .06 * (v - .5)
        const span = (u - hinge) * texture.width
        const outward = left ? hinge - .025 : .985 - hinge
        const q = clamp(Math.abs(u - hinge) / Math.max(.01, outward))
        vertices.push({ x: u * texture.width, y: v * texture.height,
          span, hinge: hinge * texture.width, q, left, flex: 1 - Math.max(body, head) })
      }
    }
    // Empty transparent patches need no draw call. Sampling their actual alpha
    // once also avoids treating hidden RGB around the PNG as visible artwork.
    const alpha = textureContext.getImageData(0, 0, texture.width, texture.height).data
    const patches = []
    const cellWidth = texture.width / columns, cellHeight = texture.height / rows
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = column * cellWidth, y = row * cellHeight
        let occupied = false
        for (let py = Math.floor(y); py < Math.min(texture.height, Math.ceil(y + cellHeight)) && !occupied; py += 1) {
          for (let px = Math.floor(x); px < Math.min(texture.width, Math.ceil(x + cellWidth)); px += 1) {
            if (alpha[(py * texture.width + px) * 4 + 3] > 3) { occupied = true; break }
          }
        }
        if (!occupied) continue
        const index = row * (columns + 1) + column
        patches.push({ x, y, width: cellWidth, height: cellHeight,
          indices: [index, index + 1, index + columns + 1, index + columns + 2] })
      }
    }
    mesh = { columns, rows, vertices, patches }
    layer.dataset.personalMantaMesh = `${columns}x${rows}`
    layer.dataset.personalMantaPatches = String(patches.length)
  }

  function strokeAt(time) {
    const phase = ((time / STROKE_PERIOD) % 1 + 1) % 1
    // The reference opens, lifts a broad wing for about two seconds, presses
    // down more decisively, then rests briefly in an open glide.
    if (phase < .52) return .9 * smooth(0, .52, phase)
    if (phase < .78) return .9 - 1.15 * smooth(.52, .78, phase)
    if (phase < .90) return -.25 * (1 - smooth(.78, .90, phase))
    return 0
  }

  function foldAt(time, q, left, animate) {
    if (!animate) return 0
    const ramp = smooth(0, .45, time)
    const bank = Math.sin(time * Math.PI * 2 / (STROKE_PERIOD * 2) + .4) * .045
    const amplitude = left ? 1 + bank : .72 - bank
    const stroke = strokeAt(time - q * .22) * amplitude * (.77 + q * .23)
    const curl = Math.sin(time * Math.PI * 2 / STROKE_PERIOD - q * 1.1 - .8) * q ** 3 * .10
    return (stroke + curl) * ramp
  }

  function drawWings(time, animate) {
    prepareMesh()
    if (!mesh) return
    const local = silhouetteContext
    local.setTransform(1, 0, 0, 1, 0, 0)
    local.clearRect(0, 0, silhouette.width, silhouette.height)
    local.globalCompositeOperation = 'source-over'
    local.imageSmoothingEnabled = true
    local.imageSmoothingQuality = 'high'
    let maxDx = 0, maxDy = 0, bodyDelta = 0
    const projected = mesh.vertices.map(vertex => {
      const fold = foldAt(time, vertex.q, vertex.left, animate) * vertex.flex
      const x = vertex.hinge + vertex.span * Math.cos(fold)
      const y = vertex.y - Math.abs(vertex.span) * Math.sin(fold) * .25
      maxDx = Math.max(maxDx, Math.abs(x - vertex.x))
      maxDy = Math.max(maxDy, Math.abs(y - vertex.y))
      if (vertex.flex < .000001) bodyDelta = Math.max(bodyDelta, Math.hypot(x - vertex.x, y - vertex.y))
      return { x, y }
    })
    for (const patch of mesh.patches) {
      const [a, b, c, d] = patch.indices.map(index => projected[index])
      const ax = (b.x + d.x - a.x - c.x) / (2 * patch.width)
      const ay = (b.y + d.y - a.y - c.y) / (2 * patch.width)
      const bx = (c.x + d.x - a.x - b.x) / (2 * patch.height)
      const by = (c.y + d.y - a.y - b.y) / (2 * patch.height)
      const x = (a.x + b.x + c.x + d.x) / 4 - ax * patch.width / 2 - bx * patch.height / 2
      const y = (a.y + b.y + c.y + d.y) / 4 - ay * patch.width / 2 - by * patch.height / 2
      const overlapX = Math.min(.65, patch.x), overlapY = Math.min(.65, patch.y)
      const sourceWidth = Math.min(texture.width - patch.x, patch.width + .65) + overlapX
      const sourceHeight = Math.min(texture.height - patch.y, patch.height + .65) + overlapY
      local.setTransform(ax, ay, bx, by, x, y + WING_PADDING)
      local.drawImage(texture, patch.x - overlapX, patch.y - overlapY, sourceWidth, sourceHeight,
        -overlapX, -overlapY, sourceWidth, sourceHeight)
    }
    local.setTransform(1, 0, 0, 1, 0, 0)
    layer.dataset.personalMantaStrokePhase = (((time / STROKE_PERIOD) % 1 + 1) % 1).toFixed(4)
    layer.dataset.personalMantaFoldLeft = foldAt(time, .8, true, animate).toFixed(4)
    layer.dataset.personalMantaFoldRight = foldAt(time, .8, false, animate).toFixed(4)
    layer.dataset.personalMantaWingMaxDx = (maxDx * pose.width / texture.width).toFixed(3)
    layer.dataset.personalMantaWingMaxDy = (maxDy * pose.height / texture.height).toFixed(3)
    layer.dataset.personalMantaBodyMaxDelta = bodyDelta.toFixed(5)
  }

  function draw(time, animate) {
    if (!ready || !context || !pose || !width || !height) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if (pose.opacity > .001 && dive < 1) {
      const padding = WING_PADDING
      const local = silhouetteContext
      drawWings(time, animate)
      if (dive > 0) {
        const cut = padding + texture.height * (1 - dive * 1.12)
        const feather = texture.height * .06
        const mask = local.createLinearGradient(0, cut - feather, 0, cut + feather)
        mask.addColorStop(0, '#fff')
        mask.addColorStop(1, 'rgba(255,255,255,0)')
        local.globalCompositeOperation = 'destination-in'
        local.fillStyle = mask
        local.fillRect(0, 0, silhouette.width, silhouette.height)
        local.globalCompositeOperation = 'source-over'
      }
      context.save()
      context.translate(pose.x, pose.y)
      context.rotate(pose.angle)
      context.scale(-1, 1)
      context.globalAlpha = pose.opacity
      const extra = padding / texture.height * pose.height
      context.drawImage(silhouette, -pose.width / 2, -pose.height / 2 - extra,
        pose.width, pose.height + extra * 2)
      context.restore()
    }
    drawBubbles()
  }

  function drawBubbles() {
    layer.dataset.personalMantaParticles = '0'
    if (!journey || bubbleOpacity < .001) return
    const mobile = width < 768
    const span = mobile ? Math.min(90, width * .24) : Math.min(160, width * .14)
    context.save()
    context.translate(origin.x, origin.y - span * .10 * burst)
    context.scale(1, .58)
    const cloud = context.createRadialGradient(0, 0, 0, 0, 0, span * .48)
    cloud.addColorStop(0, `rgba(190,229,247,${.16 * bubbleOpacity})`)
    cloud.addColorStop(.4, `rgba(111,185,224,${.09 * bubbleOpacity})`)
    cloud.addColorStop(1, 'rgba(72,153,211,0)')
    context.fillStyle = cloud
    context.fillRect(-span, -span, span * 2, span * 2)
    context.restore()
    let count = 0
    for (let index = 0; index < (mobile ? 20 : particles.length); index += 1) {
      const particle = particles[index]
      const age = (burst - particle.delay) / (.96 - particle.delay)
      if (age <= 0 || age >= 1) continue
      const rise = 1 - (1 - age) ** 1.35
      const alpha = bubbleOpacity * smooth(0, .10, age) * (1 - smooth(.58, 1, age))
      const x = origin.x + particle.spread * span * (.07 + .47 * rise) + particle.turn * span * .10 * rise ** 2
      const y = origin.y - span * (.04 + rise * particle.speed) + Math.abs(particle.spread) * span * .12 * rise
      const radius = particle.radius * (mobile ? .75 : 1) * (.60 + .75 * rise)
      const light = alpha * (.35 + particle.depth * .6)
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fillStyle = `rgba(147,207,235,${light * .08})`
      context.fill()
      context.lineWidth = Math.max(.65, radius * .065)
      context.strokeStyle = `rgba(184,225,246,${light * .65})`
      context.stroke()
      context.beginPath()
      context.arc(x - radius * .12, y - radius * .10, radius * .66, Math.PI * 1.12, Math.PI * 1.55)
      context.strokeStyle = `rgba(230,247,255,${light * .92})`
      context.stroke()
      if (index % 2 === 0) {
        context.beginPath()
        context.arc(x + particle.turn * radius * 2, y + radius * 2.2, .7 + particle.depth, 0, Math.PI * 2)
        context.fillStyle = `rgba(202,235,250,${light * .72})`
        context.fill()
      }
      count += 1
    }
    layer.dataset.personalMantaParticles = String(count)
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    if (timer) clearTimeout(timer)
    raf = 0
    timer = 0
    previousFrame = 0
    running = false
    layer.dataset.personalMantaClock = 'stopped'
  }

  function frame(now) {
    raf = 0
    if (!running || disposed) return
    if (previousFrame) elapsed += Math.min((now - previousFrame) / 1000, .1)
    previousFrame = now
    draw(elapsed, true)
    frames += 1
    layer.dataset.personalMantaTime = elapsed.toFixed(3)
    layer.dataset.personalMantaFrames = String(frames)
    timer = setTimeout(() => {
      timer = 0
      if (running) raf = requestAnimationFrame(frame)
    }, FRAME_MS)
  }

  function sync() {
    if (disposed) return
    const parentAlpha = Number.parseFloat(element.style.getPropertyValue('--chapter-opacity') || '1')
    const menuOpen = document.body.classList.contains('has-menu-open') || !!document.querySelector('dialog[open]')
    const still = staticView || reduced.matches || !ready
    const complete = journey && progress > .94 && pose?.opacity < .003 && bubbleOpacity < .003
    const intersectsStage = (x, y, halfWidth, halfHeight) => x + halfWidth > 0 && x - halfWidth < width
      && y + halfHeight > 0 && y - halfHeight < height
    const c = Math.abs(Math.cos(pose?.angle || 0)), s = Math.abs(Math.sin(pose?.angle || 0))
    const wingHeight = (pose?.height || 0) * 1.38
    const bodyInside = pose?.opacity > .003 && dive < 1 && intersectsStage(pose.x, pose.y,
      (c * pose.width + s * wingHeight) / 2, (s * pose.width + c * wingHeight) / 2)
    const bubbleSpan = width < 768 ? Math.min(90, width * .24) : Math.min(160, width * .14)
    const bubblesInside = bubbleOpacity > .003 && intersectsStage(origin.x, origin.y - bubbleSpan * .5,
      bubbleSpan, bubbleSpan * .8)
    const actorInside = !!(bodyInside || bubblesInside)
    layer.dataset.personalMantaActorVisible = String(actorInside)
    const reason = !onScreen ? 'offscreen' : complete ? 'complete' : (alpha < .003 && bubbleOpacity < .003) || parentAlpha < .003 ? 'transparent'
      : document.hidden ? 'document-hidden' : menuOpen ? 'menu-open' : stage.closest('[inert]') ? 'inert'
        : !actorInside ? 'outside-stage'
        : reduced.matches ? 'reduced-motion' : staticView ? 'static-view' : !ready ? 'artwork-fallback' : 'visible'
    const active = reason === 'visible'
    layer.dataset.personalMantaState = still ? 'static' : active ? 'running' : 'paused'
    layer.dataset.personalMantaReason = reason
    if (active) {
      if (!running) {
        running = true
        layer.dataset.personalMantaClock = 'active'
        raf = requestAnimationFrame(frame)
      }
    } else {
      stop()
      draw(elapsed, !still)
    }
  }

  function refresh() {
    compose()
    draw(elapsed, running)
    sync()
  }

  function measure() {
    if (disposed) return
    width = stage.clientWidth
    height = stage.clientHeight
    prepareMesh()
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    refresh()
  }

  const intersection = new IntersectionObserver(entries => {
    onScreen = entries[0]?.isIntersecting === true
    sync()
  }, { threshold: 0 })
  intersection.observe(stage)
  const resize = new ResizeObserver(measure)
  resize.observe(stage)
  if (copy) resize.observe(copy)
  if (route) resize.observe(route)
  const availability = new MutationObserver(sync)
  availability.observe(document.body, { attributes: true, attributeFilter: ['class', 'inert'] })
  for (let ancestor = stage; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
    availability.observe(ancestor, { attributes: true, attributeFilter: ['inert'] })
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    availability.observe(dialog, { attributes: true, attributeFilter: ['open'] })
  })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', refresh, { signal })
  image.addEventListener('load', () => {
    if (disposed) return
    image.dataset.personalMantaLoad = 'loaded'
    aspect = image.naturalWidth / image.naturalHeight || ARTWORK_ASPECT
    if (context && textureContext && silhouetteContext) {
      texture.width = Math.min(900, image.naturalWidth)
      texture.height = Math.round(texture.width / aspect)
      silhouette.width = texture.width
      silhouette.height = texture.height + WING_PADDING * 2
      textureContext.imageSmoothingEnabled = true
      textureContext.imageSmoothingQuality = 'high'
      textureContext.drawImage(image, 0, 0, texture.width, texture.height)
      ready = true
      layer.classList.add('has-personal-manta-canvas')
      layer.dataset.personalMantaReady = 'true'
    }
    measure()
  }, { once: true, signal })
  image.addEventListener('error', () => {
    if (disposed) return
    image.dataset.personalMantaLoad = 'error'
    image.hidden = true
    sync()
  }, { once: true, signal })
  image.src = ARTWORK
  document.fonts?.ready.then(() => { if (!disposed) measure() })
  measure()

  return {
    render(value, { held: nextHeld = false, staticView: nextStaticView = false } = {}) {
      if (disposed) return
      progress = clamp(value)
      held = nextHeld
      staticView = nextStaticView
      refresh()
    },
    destroy() {
      if (disposed) return
      disposed = true
      stop()
      controller.abort()
      intersection.disconnect()
      resize.disconnect()
      availability.disconnect()
      layer.remove()
      texture.width = 0
      texture.height = 0
      silhouette.width = 0
      silhouette.height = 0
      canvas.width = 0
      canvas.height = 0
    },
  }
}
