const TAU = Math.PI * 2
const LOOP_SECONDS = 28
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const mix = (a, b, amount) => a + (b - a) * amount
const smoothstep = (min, max, value) => {
  const t = clamp((value - min) / (max - min), 0, 1)
  return t * t * (3 - 2 * t)
}

// Gaps and nudges are CSS pixels. The babies stay outside their own real link,
// closing the gap before a tap or push. Matching endpoints close the sand path.
const BABY_PATH = [
  { at: 0, leftGap: 24, rightGap: 24, leftNudge: 0, rightNudge: 0, leftDepth: 0, rightDepth: 1 },
  { at: 4, leftGap: 0, rightGap: 0, leftNudge: 0, rightNudge: 0, leftDepth: 0, rightDepth: 0 },
  { at: 5, leftGap: 0, rightGap: 0, leftNudge: 0, rightNudge: 0, leftDepth: 0, rightDepth: 0 },
  { at: 8, leftGap: 0, rightGap: 0, leftNudge: 0, rightNudge: 0, leftDepth: 0, rightDepth: 0 },
  { at: 11, leftGap: 0, rightGap: 0, leftNudge: 10, rightNudge: -8, leftDepth: 1, rightDepth: -1 },
  { at: 12.5, leftGap: 0, rightGap: 0, leftNudge: 14, rightNudge: -8, leftDepth: 0, rightDepth: 0 },
  { at: 14, leftGap: 0, rightGap: 0, leftNudge: 16, rightNudge: -8, leftDepth: 0, rightDepth: 0 },
  { at: 16.2, leftGap: 0, rightGap: 0, leftNudge: 16, rightNudge: -8, leftDepth: 0, rightDepth: 0 },
  { at: 18, leftGap: 0, rightGap: 0, leftNudge: 16, rightNudge: -8, leftDepth: 0, rightDepth: 0 },
  { at: 20.5, leftGap: 0, rightGap: 0, leftNudge: 16, rightNudge: -11, leftDepth: 0, rightDepth: -1 },
  { at: 23, leftGap: 0, rightGap: 0, leftNudge: 0, rightNudge: 0, leftDepth: -1, rightDepth: 1 },
  { at: 28, leftGap: 24, rightGap: 24, leftNudge: 0, rightNudge: 0, leftDepth: 0, rightDepth: 1 },
]

function tapPulse(time, start, end) {
  const amount = smoothstep(start, end, time)
  return Math.sin(amount * Math.PI) ** 2
}

function babyTimeline(time) {
  const phase = ((time % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS
  let index = 0
  while (index < BABY_PATH.length - 2 && phase >= BABY_PATH[index + 1].at) index++
  const from = BABY_PATH[index]
  const to = BABY_PATH[index + 1]
  const progress = smoothstep(from.at, to.at, phase)
  const fall = smoothstep(12.5, 13.8, phase)
  const push = smoothstep(16.45, 17.78, phase)
  const returnToToy = smoothstep(18.65, 20.5, phase)
  const attempt = tapPulse(phase, 15.55, 16.25)
  const brace = smoothstep(15.5, 16.05, phase) * (1 - smoothstep(17.35, 17.95, phase))
  const topple = fall * (1 - push)
  const wriggle = smoothstep(14, 14.3, phase) * (1 - smoothstep(15.35, 15.65, phase))
  // Two small, alternating foot gestures with a quiet pause in between.
  const wrigglePhase = (smoothstep(14.12, 14.72, phase) + smoothstep(14.9, 15.5, phase)) * TAU
  const movement = side => {
    const facing = side === 'left' ? 1 : -1
    const offset = to[side + 'Nudge'] - from[side + 'Nudge']
      - facing * (to[side + 'Gap'] - from[side + 'Gap'])
    const depth = to[side + 'Depth'] - from[side + 'Depth']
    const moving = Math.abs(offset) > .001 || Math.abs(depth) > .001
    const steps = Math.max(1, Math.round(Math.abs(offset) / 8))
    return side === 'left' && returnToToy > 0 && returnToToy < 1
      ? { moving: true, phase: returnToToy * 4 * TAU }
      : { moving, phase: progress * steps * TAU }
  }
  const stage = phase < 4 ? 'approach'
    : phase < 5 ? 'pause'
      : phase < 8 ? 'tap'
        : phase < 11 ? 'push'
          : phase < 12.5 ? 'roll'
            : phase < 14 ? 'topple'
              : phase < 16.2 ? 'wriggle'
                : phase < 18 ? 'recover'
                  : phase < 20.5 ? 'reassure'
                    : phase < 23 ? 'follow' : 'return'
  return {
    stage,
    topple,
    wriggle,
    brace,
    // The claws reach the sand on the far side, then push the shell onward.
    // Reversing the fall would lift those bracing claws away from the ground.
    rotation: -Math.PI * (fall + push) - attempt * .12
      - tapPulse(phase, 13.65, 14.12) * .025
      - tapPulse(phase, 17.68, 18.18) * .025
      + Math.sin(wrigglePhase) * .01 * wriggle,
    rollOffset: -(.36 * fall + .42 * push) * (1 - returnToToy),
    recoveryStage: phase < 12.5 || phase >= 20.5 ? 'none'
      : phase < 13.8 ? 'fall' : phase < 15.5 ? 'wriggle'
        : phase < 16.25 ? 'attempt' : phase < 16.65 ? 'brace'
          : phase < 17.78 ? 'push' : phase < 18.65 ? 'settle' : 'step-back',
    wrigglePhase,
    leftGap: mix(from.leftGap, to.leftGap, progress),
    rightGap: mix(from.rightGap, to.rightGap, progress),
    leftNudge: mix(from.leftNudge, to.leftNudge, progress),
    rightNudge: mix(from.rightNudge, to.rightNudge, progress),
    leftDepth: mix(from.leftDepth, to.leftDepth, progress),
    rightDepth: mix(from.rightDepth, to.rightDepth, progress),
    leftWalk: movement('left'),
    rightWalk: movement('right'),
    leftLift: Math.max(tapPulse(phase, 5.2, 6.25), tapPulse(phase, 6.7, 7.75)),
    rightLift: Math.max(
      tapPulse(phase, 5.28, 6.33), tapPulse(phase, 6.78, 7.83),
      tapPulse(phase, 18.15, 19), tapPulse(phase, 19.3, 20.15),
    ),
  }
}

function segmentInfluence(u, v, start, end, radius) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const amount = clamp(((u - start[0]) * dx + (v - start[1]) * dy) / (dx * dx + dy * dy), 0, 1)
  const distance = Math.hypot(u - mix(start[0], end[0], amount), v - mix(start[1], end[1], amount))
  return smoothstep(.08, .72, amount) * (1 - smoothstep(radius * .35, radius, distance))
}

// Only the distal legs and claws bend. The shell, head, eyes and antennae
// remain in their original coordinates in every baked pose.
function posePoint(u, v, phase, lift, baby, energy = 1, brace = 0) {
  if (v < .59) return [u, v]
  const shellDistance = Math.hypot(
    (u - .345) / (baby ? .33 : .37),
    (v - .385) / (baby ? .34 : .36),
  )
  const outsideShell = smoothstep(1.04, 1.18, shellDistance)
  if (!outsideShell) return [u, v]
  const legA = segmentInfluence(u, v, [.38, .67], [.264, .895], .09)
  const legB = segmentInfluence(u, v, [.55, .68], [.447, .936], .085)
  let dx = (Math.sin(phase) * legA + Math.sin(phase + Math.PI) * legB) * .019 * energy
  let dy = -(Math.max(0, Math.sin(phase)) * legA
    + Math.max(0, Math.sin(phase + Math.PI)) * legB) * .014 * energy
  if (baby && lift) {
    const nearClaw = segmentInfluence(u, v, [.615, .565], [.726, .796], .1)
    const farClaw = segmentInfluence(u, v, [.73, .58], [.865, .801], .095)
    dx += lift * (nearClaw * .012 + farClaw * .024)
    dy -= lift * (nearClaw * .045 + farClaw * .055)
  }
  if (baby && brace) {
    const nearClaw = segmentInfluence(u, v, [.615, .565], [.726, .796], .1)
    const farClaw = segmentInfluence(u, v, [.73, .58], [.865, .801], .095)
    dx += brace * (nearClaw * .014 + farClaw * .021)
    dy -= brace * (nearClaw * .012 + farClaw * .018 + legA * .009)
  }
  return [u + dx * outsideShell, v + dy * outsideShell]
}

function drawTriangle(context, image, source, destination, width, height) {
  const [a, b, c] = source
  const [p, q, r] = destination
  const determinant = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
  if (Math.abs(determinant) < .000001) return
  const m11 = ((q[0] - p[0]) * (c[1] - a[1]) - (r[0] - p[0]) * (b[1] - a[1])) / determinant
  const m12 = ((q[1] - p[1]) * (c[1] - a[1]) - (r[1] - p[1]) * (b[1] - a[1])) / determinant
  const m21 = ((r[0] - p[0]) * (b[0] - a[0]) - (q[0] - p[0]) * (c[0] - a[0])) / determinant
  const m22 = ((r[1] - p[1]) * (b[0] - a[0]) - (q[1] - p[1]) * (c[0] - a[0])) / determinant
  context.save()
  context.beginPath()
  const center = [(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3]
  const clipPoints = [p, q, r].map(point => {
    const distance = Math.hypot(point[0] - center[0], point[1] - center[1]) || 1
    return [point[0] + (point[0] - center[0]) / distance * .5, point[1] + (point[1] - center[1]) / distance * .5]
  })
  context.moveTo(...clipPoints[0])
  context.lineTo(...clipPoints[1])
  context.lineTo(...clipPoints[2])
  context.closePath()
  context.clip()
  context.transform(m11, m12, m21, m22, p[0] - m11 * a[0] - m21 * a[1], p[1] - m12 * a[0] - m22 * a[1])
  context.drawImage(image, 0, 0, width, height)
  context.restore()
}

// The two babies share these small pre-rendered poses; no PNG mesh work runs
// in the animation loop and no static shell is blended over a moving copy.
function createHermitPoses(image, baby) {
  const width = 252
  const height = Math.round(width * image.naturalHeight / image.naturalWidth)
  const columns = 24
  const rows = 18
  const texture = document.createElement('canvas')
  texture.width = width
  texture.height = height
  const textureContext = texture.getContext('2d')
  if (!textureContext) throw new Error('Footer animal texture unavailable')
  textureContext.drawImage(image, 0, 0, width, height)
  function render(phase, lift = 0, energy = 1, brace = 0) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Footer animal pose unavailable')
    const points = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, column) => {
      const u = column / columns
      const v = row / rows
      const [x, y] = posePoint(u, v, phase, lift, baby, energy, brace)
      return { source: [u * width, v * height], destination: [x * width, y * height] }
    }))
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = points[row][column]
        const b = points[row][column + 1]
        const c = points[row + 1][column]
        const d = points[row + 1][column + 1]
        for (const triangle of [[a, b, c], [b, d, c]]) {
          drawTriangle(context, texture, triangle.map(point => point.source), triangle.map(point => point.destination), width, height)
        }
      }
    }
    return canvas
  }
  const idle = render(0)
  return {
    idle,
    walk: Array.from({ length: 12 }, (_, frame) => frame ? render(frame / 12 * TAU) : idle),
    tap: baby ? Array.from({ length: 8 }, (_, frame) => frame ? render(0, frame / 7) : idle) : [idle],
    wriggle: baby ? Array.from({ length: 12 }, (_, frame) => {
      const phase = frame / 12 * TAU
      return render(phase, Math.sin(phase) ** 2 * .12, .5)
    }) : [],
    brace: baby ? Array.from({ length: 8 }, (_, frame) => frame ? render(0, 0, .25, frame / 7) : idle) : [],
  }
}

// Anatomical contact surfaces replace the sprite's transparent rectangle.
// A rounded shell and tiny foot pads transfer support smoothly as it rolls.
function groundContact(angle, width, height) {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const surfaces = [
    [.345, .39, .305, .305],
    [.264, .89, .015, .01],
    [.447, .93, .015, .01],
    [.726, .79, .015, .012],
    [.865, .795, .015, .012],
  ].map(([u, v, radiusU, radiusV]) => {
    const x = (u - .5) * width
    const y = (v - .5) * height
    const radiusX = radiusU * width
    const radiusY = radiusV * height
    const support = Math.hypot(radiusX * sine, radiusY * cosine)
    return {
      x: x * cosine - y * sine + (radiusX ** 2 - radiusY ** 2) * sine * cosine / support,
      y: x * sine + y * cosine + support,
    }
  })
  const maximum = Math.max(...surfaces.map(surface => surface.y))
  // Transfer the horizontal pivot across a broad contact patch. A nearly
  // hard maximum here teleports the body from shell to claw as their heights
  // cross, even though the vertical clearance itself remains continuous.
  const transferSoftness = height * .14
  const clearanceSoftness = height * .018
  let weight = 0
  let clearanceWeight = 0
  let contactX = 0
  surfaces.forEach(surface => {
    const contribution = Math.exp((surface.y - maximum) / transferSoftness)
    weight += contribution
    contactX += surface.x * contribution
    clearanceWeight += Math.exp((surface.y - maximum) / clearanceSoftness)
  })
  return { x: contactX / weight, y: maximum + clearanceSoftness * Math.log(clearanceWeight) }
}

function sceneGeometry(width, height, toyDiameter) {
  const mobile = width < 992
  const baseWidth = mobile ? clamp(width * .112, 36, 44) : clamp(width * .043, 48, 62)
  const secondWidth = Math.max(mobile ? 36 : 48, baseWidth * .94)
  const toyRadius = toyDiameter / 2
  const toySpacing = toyDiameter + 28
  const leftClearance = Math.max(baseWidth * .865 + 24, baseWidth * 1.7) + 4
  const rightClearance = secondWidth * .865 + 24 + 4
  const groupX = clamp(width * (mobile ? .61 : .68),
    toySpacing / 2 + toyRadius + leftClearance,
    width - toySpacing / 2 - toyRadius - rightClearance)
  const toyY = height - (mobile ? 235 : 190)
  return { baseWidth, secondWidth, toyRadius, toySpacing, groupX, toyY, groundY: toyY + toyRadius - 7 }
}

function segmentHitsBox(a, b, box) {
  let enter = 0
  let leave = 1
  for (const [axis, min, max] of [['x', box.left, box.right], ['y', box.top, box.bottom]]) {
    const delta = b[axis] - a[axis]
    if (Math.abs(delta) < .00001) {
      if (a[axis] <= min || a[axis] >= max) return false
    } else {
      const first = (min - a[axis]) / delta
      const second = (max - a[axis]) / delta
      enter = Math.max(enter, Math.min(first, second))
      leave = Math.min(leave, Math.max(first, second))
    }
  }
  return leave - enter > .00001
}

// Build a small visibility graph only when layout changes. The mother's whole
// sprite, rather than just its center, stays clear of the measured keepsake.
function createAdultRoute(width, height, protectedBoxes = []) {
  const mobile = width < 992
  const animalWidth = mobile ? 86 : clamp(width * .078, 86, 146)
  const animalHeight = animalWidth * 2 / 3
  const margin = mobile ? 6 : 9
  const bounds = {
    left: animalWidth / 2 + 4,
    right: width * (mobile ? .43 : .60),
    top: height - (mobile ? 276 : 292),
    bottom: height - (mobile ? 202 : 65),
  }
  const boxes = protectedBoxes.map(box => ({
    left: box.left - animalWidth / 2 - margin,
    right: box.right + animalWidth / 2 + margin,
    top: box.top - animalHeight * .06 - margin,
    bottom: box.bottom + animalHeight * .94 + margin,
  }))
  const constrain = point => ({ x: clamp(point.x, bounds.left, bounds.right), y: clamp(point.y, bounds.top, bounds.bottom) })
  const free = point => point.x >= bounds.left && point.x <= bounds.right
    && point.y >= bounds.top && point.y <= bounds.bottom
    && !boxes.some(box => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom)
  const corners = [bounds, ...boxes].flatMap(box => [
    { x: box.left - 1, y: box.top - 1 }, { x: box.right + 1, y: box.top - 1 },
    { x: box.left - 1, y: box.bottom + 1 }, { x: box.right + 1, y: box.bottom + 1 },
  ]).map(constrain).filter(free)
  const nearestFree = point => {
    const desired = constrain(point)
    if (free(desired)) return desired
    const candidates = [...corners, ...boxes.flatMap(box => [
      constrain({ x: box.left - 1, y: desired.y }), constrain({ x: box.right + 1, y: desired.y }),
      constrain({ x: desired.x, y: box.top - 1 }), constrain({ x: desired.x, y: box.bottom + 1 }),
    ]).filter(free)]
    return candidates.sort((a, b) => Math.hypot(a.x - desired.x, a.y - desired.y) - Math.hypot(b.x - desired.x, b.y - desired.y))[0]
  }
  const connect = (start, end) => {
    const nodes = [start, end, ...corners]
    const costs = nodes.map(() => Infinity)
    const parents = []
    const visited = new Set()
    costs[0] = 0
    while (visited.size < nodes.length) {
      let current = -1
      costs.forEach((cost, index) => { if (!visited.has(index) && (current < 0 || cost < costs[current])) current = index })
      if (current < 0 || !Number.isFinite(costs[current])) break
      if (current === 1) {
        const path = [end]
        while (current !== 0) { current = parents[current]; path.unshift(nodes[current]) }
        return path
      }
      visited.add(current)
      nodes.forEach((point, index) => {
        if (visited.has(index) || boxes.some(box => segmentHitsBox(nodes[current], point, box))) return
        const distance = costs[current] + Math.hypot(point.x - nodes[current].x, point.y - nodes[current].y)
        if (distance < costs[index]) { costs[index] = distance; parents[index] = current }
      })
    }
    return [start]
  }
  const desired = mobile
    ? [[.145, 220], [.21, 207], [.30, 216], [.29, 247], [.20, 258], [.14, 240]]
    : [[.26, 82], [.34, 70], [.44, 85], [.55, 145], [.55, 220], [.53, 260], [.56, 190], [.49, 80]]
  const waypoints = desired.map(([x, bottom]) => nearestFree({ x: width * x, y: height - bottom })).filter(Boolean)
  if (!waypoints.length) return { width: animalWidth, segments: [], duration: 1, origin: { x: bounds.left, y: bounds.bottom } }
  const points = [waypoints[0]]
  for (let index = 1; index <= waypoints.length; index++) {
    points.push(...connect(points.at(-1), waypoints[index % waypoints.length]).slice(1))
  }
  let duration = 0
  const segments = points.slice(1).flatMap((point, index) => {
    const from = points[index]
    const distance = Math.hypot(point.x - from.x, point.y - from.y)
    if (distance < .5) return []
    const start = duration
    duration += Math.max(1.5, distance / (mobile ? 7 : 16))
    return [{ from, to: point, start, end: duration, steps: Math.max(1, Math.round(distance / 10)) }]
  })
  return { width: animalWidth, segments, duration: duration || 1, origin: waypoints[0] }
}

function adultPlacement(route, time) {
  const phase = ((time % route.duration) + route.duration) % route.duration
  const segment = route.segments.find(part => phase < part.end)
  const progress = segment ? smoothstep(segment.start, segment.end, phase) : 0
  return {
    x: segment ? mix(segment.from.x, segment.to.x, progress) : route.origin.x,
    feetY: segment ? mix(segment.from.y, segment.to.y, progress) : route.origin.y,
    width: route.width, facing: 1, walkPhase: progress * (segment?.steps || 1) * TAU,
    moving: !!segment, lift: 0, opacity: .96, rotation: 0,
  }
}

function animalLayout(width, height, time, adultRoute, toyDiameter) {
  const { baseWidth, secondWidth, groupX, groundY, toyY, toySpacing, toyRadius } = sceneGeometry(width, height, toyDiameter)
  const state = babyTimeline(time)
  const toys = {
    github: {
      x: groupX - toySpacing / 2 + state.leftNudge + state.leftLift * .8,
      y: toyY,
      roll: state.leftNudge * .45 + state.leftLift * 2.4,
    },
    resume: {
      x: groupX + toySpacing / 2 + state.rightNudge - state.rightLift * .8,
      y: toyY,
      roll: state.rightNudge * .45 - state.rightLift * 2.4,
    },
  }
  // The final reassuring nudge is slightly deeper than the ordinary push.
  // Keep both real circles apart throughout that gesture as well.
  toys.resume.x = Math.max(toys.resume.x, toys.github.x + toyDiameter + 3)
  function babyPlacement(side, babyWidth, facing, toy, opacity) {
    const lift = state[side + 'Lift']
    const walking = state[side + 'Walk']
    const walkPhase = walking.phase + (facing < 0 ? Math.PI : 0)
    const feetY = groundY + state[side + 'Depth']
    const animalHeight = babyWidth * 2 / 3
    // Align the leading claw to the actual round button edge, including the
    // baked lifted pose. The rigid shell follows a few pixels as it reaches.
    const renderedLift = lift > .01 ? Math.round(lift * 7) / 7 : 0
    const [clawU, clawV] = posePoint(.865, .801, 0, renderedLift, true)
    const bob = lift > .01 ? -.18 * lift : walking.moving ? Math.sin(walkPhase * 2) * .22 : 0
    const clawY = feetY + (clawV - .94) * animalHeight + bob
    const circleEdge = Math.sqrt(Math.max(0, toyRadius ** 2 - (clawY - toy.y) ** 2))
    return {
      x: toy.x - facing * (circleEdge + (clawU - .5) * babyWidth + state[side + 'Gap']),
      feetY,
      width: babyWidth,
      facing,
      walkPhase,
      moving: walking.moving,
      lift,
      opacity,
      rotation: side === 'left' ? state.rotation : 0,
      wriggle: side === 'left' ? state.wriggle : 0,
      brace: side === 'left' ? state.brace : 0,
      rollOffset: side === 'left' ? state.rollOffset : undefined,
      wrigglePhase: state.wrigglePhase,
    }
  }
  return {
    stage: state.stage,
    recoveryStage: state.recoveryStage,
    toys,
    adult: adultPlacement(adultRoute || createAdultRoute(width, height), time),
    left: babyPlacement('left', baseWidth, 1, toys.github, .97),
    right: babyPlacement('right', secondWidth, -1, toys.resume, .9),
  }
}

export function initFooterSeabed(footer) {
  const canvas = footer?.querySelector('.site-footer__wildlife')
  const context = canvas?.getContext('2d')
  if (!context) return () => {}

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const events = new AbortController()
  const animals = new Map()
  const images = []
  const toys = Array.from(footer.querySelectorAll('.site-footer__social[data-footer-link]'))
  const hoveredToys = new Set()
  let width = 1
  let height = 1
  let pixelRatio = 1
  let elapsed = 0
  let previousTime = 0
  let lastPaint = 0
  let frameRequest = 0
  let visible = false
  let disposed = false
  let adultRoute
  let toyDiameter = 1
  canvas.dataset.animalCount = '0'

  function drawAnimal(animal, placement) {
    const animalHeight = placement.width * animal.image.naturalHeight / animal.image.naturalWidth
    let frame = animal.poses.idle
    let bob = 0
    if (!reducedMotion.matches) {
      if (placement.wriggle > .001 && animal.poses.wriggle.length) {
        const phase = ((placement.wrigglePhase % TAU) + TAU) % TAU
        frame = animal.poses.wriggle[Math.round(phase / TAU * 12) % 12]
      } else if (placement.brace > .001 && animal.poses.brace.length) {
        frame = animal.poses.brace[Math.round(placement.brace * (animal.poses.brace.length - 1))]
      } else if (placement.lift > .01 && animal.poses.tap.length > 1) {
        frame = animal.poses.tap[Math.round(placement.lift * (animal.poses.tap.length - 1))]
        bob = -.18 * placement.lift
      } else if (placement.moving) {
        const phase = ((placement.walkPhase % TAU) + TAU) % TAU
        frame = animal.poses.walk[Math.round(phase / TAU * 12) % 12]
        bob = Math.sin(phase * 2) * .22
      }
    }
    const angle = placement.rotation || 0
    let centerX = placement.x
    let centerY = placement.feetY - animalHeight * .44 + bob
    let contactX = placement.x
    if (placement.rollOffset !== undefined) {
      const resting = groundContact(0, placement.width, animalHeight)
      const contact = groundContact(angle, placement.width, animalHeight)
      contactX += placement.rollOffset * placement.width + resting.x
      centerX = contactX - contact.x
      centerY = placement.feetY + resting.y - animalHeight * .44 - contact.y + bob
      canvas.dataset.hermitContactX = contactX.toFixed(2)
      canvas.dataset.hermitContactY = placement.feetY.toFixed(2)
      canvas.dataset.hermitCenterX = centerX.toFixed(2)
      canvas.dataset.hermitCenterY = centerY.toFixed(2)
    }
    context.save()
    // This shallow, attached shadow stays on the same sand path as the feet.
    context.translate(mix(centerX, contactX, .5), placement.feetY - animalHeight * .025)
    context.scale(1, .2)
    const shadow = context.createRadialGradient(0, 0, 0, 0, 0, placement.width * .4)
    shadow.addColorStop(0, '#07162462')
    shadow.addColorStop(.65, '#07162420')
    shadow.addColorStop(1, '#07162400')
    context.fillStyle = shadow
    context.beginPath()
    context.arc(0, 0, placement.width * .4, 0, TAU)
    context.fill()
    context.restore()
    context.save()
    context.translate(centerX, centerY)
    context.rotate(angle)
    // Facing is constant for every animal, including while backing up.
    context.scale(placement.facing, 1)
    context.globalAlpha = placement.opacity
    context.drawImage(frame, -placement.width / 2, -animalHeight / 2, placement.width, animalHeight)
    context.restore()
  }

  function paint() {
    if (disposed || !width || !height) return
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)
    const layout = animalLayout(width, height, elapsed, adultRoute, toyDiameter)
    canvas.dataset.hermitStage = layout.stage
    canvas.dataset.hermitRecoveryStage = layout.recoveryStage
    canvas.dataset.hermitTime = elapsed.toFixed(3)
    canvas.dataset.hermitRollover = (layout.left.rotation * 180 / Math.PI).toFixed(1)
    canvas.dataset.adultX = layout.adult.x.toFixed(1)
    canvas.dataset.adultFeetY = layout.adult.feetY.toFixed(1)
    toys.forEach(toy => {
      const position = layout.toys[toy.dataset.footerLink]
      if (!position) return
      toy.style.setProperty('--footer-toy-x', position.x.toFixed(3) + 'px')
      toy.style.setProperty('--footer-toy-y', position.y.toFixed(3) + 'px')
      toy.style.setProperty('--footer-toy-roll', position.roll.toFixed(3) + 'deg')
    })
    const baby = animals.get('baby')
    const adult = animals.get('adult')
    const placements = []
    if (adult) placements.push([adult, layout.adult])
    if (baby) placements.push([baby, layout.left], [baby, layout.right])
    placements.sort((a, b) => a[1].feetY - b[1].feetY)
    placements.forEach(([animal, placement]) => drawAnimal(animal, placement))
  }

  function tick(now) {
    frameRequest = 0
    if (disposed) return
    if (pauseReason()) {
      updatePlayback()
      return
    }
    if (previousTime) elapsed += Math.min((now - previousTime) / 1000, .1)
    previousTime = now
    if (!lastPaint || now - lastPaint >= 1000 / 24) {
      paint()
      lastPaint = now
    }
    frameRequest = requestAnimationFrame(tick)
  }

  function pauseReason() {
    if (!visible) return 'offscreen'
    if (document.hidden) return 'hidden'
    if (footer.dataset.contactOpen === 'true') return 'contact'
    if (hoveredToys.size) return 'pointer'
    if (toys.some(toy => toy.contains(document.activeElement))) return 'focus'
    if (reducedMotion.matches) return 'reduced'
    return ''
  }

  function updatePlayback() {
    cancelAnimationFrame(frameRequest)
    frameRequest = 0
    previousTime = 0
    lastPaint = 0
    if (disposed) return
    const reason = pauseReason()
    const active = !reason
    footer.classList.toggle('is-in-view', active)
    canvas.dataset.motionState = reason === 'reduced' ? 'reduced' : active ? 'running' : 'paused'
    canvas.dataset.pauseReason = reason
    if (visible) paint()
    if (active) frameRequest = requestAnimationFrame(tick)
  }

  function syncSize() {
    if (disposed) return
    const bounds = canvas.getBoundingClientRect()
    width = bounds.width
    height = bounds.height
    const mobile = width < 992
    const boxes = []
    const protect = (element, paddingX = 0, paddingY = paddingX) => {
      if (!element) return
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      boxes.push({ left: rect.left - bounds.left - paddingX, right: rect.right - bounds.left + paddingX,
        top: rect.top - bounds.top - paddingY, bottom: rect.bottom - bounds.top + paddingY })
    }
    // The face rectangle follows the real perspective transform. Its padding
    // also protects the engraved plate rim, without blocking transparent PNG.
    protect(footer.querySelector('.site-footer__nametag .site-footer__contacts')
      || footer.querySelector('.site-footer__nametag'), mobile ? 16 : 44, mobile ? 16 : 24)
    footer.querySelectorAll('.site-footer__copyright > *, .site-footer__credit > *').forEach(element => protect(element, 4))
    toyDiameter = Math.max(1, ...toys.map(toy => toy.offsetWidth || parseFloat(getComputedStyle(toy).width) || 1))
    const { groupX, toyRadius: radius, toySpacing: spacing, toyY } = sceneGeometry(width, height, toyDiameter)
    boxes.push({ left: groupX - spacing / 2 - radius, right: groupX + spacing / 2 + radius,
      top: toyY - radius, bottom: toyY + radius })
    // The fixed launcher can enter the footer late; reserve its foreground
    // corner independently of scroll position, so the cached route is stable.
    boxes.push({ left: width - 170, right: width, top: height - 160, bottom: height })
    adultRoute = createAdultRoute(width, height, boxes)
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(width * pixelRatio))
    canvas.height = Math.max(1, Math.round(height * pixelRatio))
    paint()
  }
  // Position the DOM toys synchronously, before the animal images load.
  syncSize()
  const resize = new ResizeObserver(syncSize)
  resize.observe(canvas)
  toys.forEach(toy => resize.observe(toy))

  const visibility = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    if (visible) syncSize()
    updatePlayback()
  })
  visibility.observe(canvas)
  document.addEventListener('visibilitychange', updatePlayback, { signal: events.signal })
  reducedMotion.addEventListener('change', updatePlayback, { signal: events.signal })
  document.fonts?.ready.then(() => { if (!disposed) syncSize() })
  toys.forEach(toy => {
    toy.addEventListener('pointerenter', () => {
      hoveredToys.add(toy)
      updatePlayback()
    }, { signal: events.signal })
    const leave = () => {
      hoveredToys.delete(toy)
      updatePlayback()
    }
    toy.addEventListener('pointerleave', leave, { signal: events.signal })
    toy.addEventListener('pointercancel', leave, { signal: events.signal })
    toy.addEventListener('focusin', updatePlayback, { signal: events.signal })
    toy.addEventListener('focusout', () => queueMicrotask(updatePlayback), { signal: events.signal })
  })
  const contactState = new MutationObserver(updatePlayback)
  contactState.observe(footer, { attributes: true, attributeFilter: ['data-contact-open'] })

  for (const [kind, source] of [
    ['adult', '/images/footer-hermit-crab.png'],
    ['baby', '/images/footer-baby-hermit-crab.png'],
  ]) {
    const image = new Image()
    images.push(image)
    image.decoding = 'async'
    image.addEventListener('load', () => {
      if (disposed) return
      animals.set(kind, { image, poses: createHermitPoses(image, kind === 'baby') })
      canvas.dataset.animalCount = String((animals.has('adult') ? 1 : 0) + (animals.has('baby') ? 2 : 0))
      paint()
    }, { once: true, signal: events.signal })
    image.src = source
  }

  return () => {
    disposed = true
    cancelAnimationFrame(frameRequest)
    events.abort()
    resize.disconnect()
    visibility.disconnect()
    contactState.disconnect()
    hoveredToys.clear()
    toys.forEach(toy => {
      for (const property of ['--footer-toy-x', '--footer-toy-y', '--footer-toy-roll']) {
        toy.style.removeProperty(property)
      }
    })
    images.forEach(image => image.removeAttribute('src'))
    footer.classList.remove('is-in-view')
    context.clearRect(0, 0, canvas.width, canvas.height)
    canvas.dataset.motionState = 'disposed'
    canvas.dataset.animalCount = '0'
    animals.clear()
  }
}
