import { createMarineMotion } from './insight-marine-motion.js'
import { getMarineOrnaments } from './insight-marine-ornaments.js'
import { getWreckOcclusion } from './insight-wreck-occlusion.js'

const SVG = 'http://www.w3.org/2000/svg'
const ASSETS = [
  '/images/insight-seated-mermaid.png',
  '/images/insight-swimming-fish.png',
  '/images/insight-fish-angelfish.png',
  '/images/insight-fish-silver.png',
  '/images/insight-jellyfish.png',
]
const ARTWORK = {
  desktop: { width: 1672, height: 941, hipX: 1310, hipY: 560, mermaidHeight: 255 },
  mobile: { width: 941, height: 1672, hipX: 720, hipY: 1074, mermaidHeight: 170 },
}
const RATIOS = [1122 / 1402, 1672 / 941, 1480 / 1062, 2109 / 746, 1024 / 1536]
const SPECIES = {
  1: { speed: 2.75, sway: .074, hinge: .39 },
  2: { speed: 2.35, sway: .052, hinge: .38 },
  3: { speed: 3.55, sway: .061, hinge: .2 },
}
const TAU = Math.PI * 2

// Passing fish occupy separate depths. Their route only wraps beyond both
// artwork edges, so no fish jumps or changes direction within the visible sea.
const PASSING = [
  { id: 'water-low', texture: 1, size: 42, phase: .21, mobilePhase: .25,
    depth: .25, mobileDepth: .3, duration: 151, direction: 1, opacity: .43 },
  { id: 'water-high', texture: 3, size: 39, phase: .37, mobilePhase: .37,
    depth: .18, mobileDepth: .23, duration: 169, direction: -1, opacity: .31 },
  { id: 'water-angel', texture: 2, size: 35, phase: .56,
    depth: .39, duration: 193, direction: 1, opacity: .41, desktopOnly: true },
  { id: 'water-middle', texture: 3, size: 46, phase: .7, mobilePhase: .55,
    depth: .33, mobileDepth: .43, duration: 159, direction: -1, opacity: .47 },
  { id: 'water-distant', texture: 1, size: 31, phase: .83, mobilePhase: .73,
    depth: .49, mobileDepth: .55, duration: 181, direction: 1, opacity: .3 },
]

// These irregular routes follow different parts of the wreck and seabed.
// Each has a quiet return at another depth, rather than circling one center.
const LOCAL = [
  { id: 'hull-bow', zone: 'hull', texture: 1, size: 45, duration: 101, phase: .14, opacity: .75,
    desktop: [[350, 520], [395, 495], [470, 510], [555, 555], [525, 589], [447, 563], [388, 562]],
    mobile: [[205, 1060], [222, 1039], [261, 1050], [314, 1082], [296, 1109], [253, 1095], [216, 1096]] },
  { id: 'hull-deck', zone: 'hull', texture: 2, size: 43, duration: 109, phase: .56, opacity: .72,
    desktop: [[665, 430], [765, 445], [850, 500], [790, 528], [704, 505], [631, 471]],
    mobile: [[349, 1000], [400, 1016], [457, 1045], [425, 1062], [377, 1049], [338, 1025]] },
  { id: 'hull-stern', zone: 'hull', texture: 3, size: 50, duration: 113, phase: .78, opacity: .68,
    desktop: [[1030, 660], [1125, 665], [1207, 718], [1119, 740], [1021, 714], [982, 685]],
    mobile: [[555, 1118], [606, 1124], [650, 1152], [609, 1171], [554, 1150], [531, 1132]] },
  { id: 'hull-keel', zone: 'hull', texture: 1, size: 33, duration: 127, phase: .4, opacity: .53,
    desktop: [[790, 660], [878, 668], [955, 704], [911, 731], [841, 708], [765, 692]] },
  { id: 'treasure-left', zone: 'treasure', texture: 2, size: 37, duration: 93, phase: .31, opacity: .87,
    desktop: [[420, 705], [447, 672], [476, 686], [465, 740], [432, 766], [397, 744]],
    mobile: [[233, 1242], [249, 1216], [269, 1230], [262, 1270], [243, 1295], [222, 1275]] },
  { id: 'treasure-right', zone: 'treasure', texture: 1, size: 42, duration: 107, phase: .68, opacity: .85,
    desktop: [[820, 765], [855, 732], [907, 740], [893, 780], [851, 801], [804, 791]],
    mobile: [[520, 1289], [543, 1259], [572, 1268], [560, 1307], [535, 1329], [507, 1316]] },
  { id: 'treasure-explorer', zone: 'treasure', texture: 3, size: 36, duration: 139, phase: .87, opacity: .73,
    desktop: [[740, 607], [805, 636], [823, 690], [777, 732], [724, 718], [690, 671]] },
]

// The sitting contact, supporting palm and tail hinge retain the authored pose.
const MERMAID_SEAT = { x: 540 / 1122, y: 700 / 1402, tailHinge: .55 }
let assetPromise
let maskSequence = 0

const wrap = value => ((value % 1) + 1) % 1

function sampleRoute(points, progress) {
  const distance = wrap(progress) * points.length
  const index = Math.floor(distance)
  const t = distance - index, t2 = t * t, t3 = t2 * t
  const at = offset => points[(index + offset + points.length) % points.length]
  const [p0, p1, p2, p3] = [at(-1), at(0), at(1), at(2)]
  const position = [], tangent = []
  for (let axis = 0; axis < 2; axis++) {
    const a = -p0[axis] + p2[axis]
    const b = 2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]
    const c = -p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]
    position.push(.5 * (2 * p1[axis] + a * t + b * t2 + c * t3))
    tangent.push(.5 * (a + 2 * b * t + 3 * c * t2))
  }
  return { x: position[0], y: position[1], dx: tangent[0], dy: tangent[1] }
}

function fishPose(config, mobile, ratios, index, placement) {
  const width = config.size * (mobile ? .8 : 1)
  const ratio = ratios[config.texture] || RATIOS[config.texture]
  const species = SPECIES[config.texture]
  return {
    id: config.id, zone: config.zone || 'open-water',
    x: placement.x, y: placement.y, width, height: width / ratio,
    kind: 1, texture: config.texture, hinge: species.hinge,
    direction: placement.direction, angle: placement.angle,
    phase: index * 1.73, opacity: config.opacity,
    speed: species.speed + (index % 3 - 1) * .12,
    sway: species.sway,
  }
}

// Shared by the moving mesh and its static SVG counterpart. Native artwork
// coordinates make route sampling independent of viewport cover/crop changes.
export function getMarineFishPoses(time = 0, mobile = false, ratios = RATIOS) {
  const art = ARTWORK[mobile ? 'mobile' : 'desktop']
  const poses = []
  for (const [index, config] of PASSING.entries()) {
    if (mobile && config.desktopOnly) continue
    const phase = mobile ? config.mobilePhase ?? config.phase : config.phase
    const u = wrap(phase + time / config.duration)
    const margin = 100, travel = art.width + margin * 2
    const wave = u * TAU + index * .86
    const amplitude = art.height * .012
    const depth = mobile ? config.mobileDepth : config.depth
    const dy = Math.cos(wave) * amplitude * TAU / config.duration
    poses.push(fishPose(config, mobile, ratios, index, {
      x: config.direction > 0 ? -margin + travel * u : art.width + margin - travel * u,
      y: art.height * depth + Math.sin(wave) * amplitude,
      direction: config.direction,
      angle: Math.atan2(dy, travel / config.duration) * config.direction,
    }))
  }
  for (const [index, config] of LOCAL.entries()) {
    const points = config[mobile ? 'mobile' : 'desktop']
    if (!points) continue
    const path = sampleRoute(points, config.phase + time / config.duration)
    const length = Math.hypot(path.dx, path.dy) || 1
    // Yaw narrows gradually at each turn. It passes through a thin front-on
    // profile instead of abruptly flipping a full-width sprite.
    const direction = Math.tanh(path.dx / length * 3.1)
    const angle = Math.tanh(path.dy / length * 1.5) * direction * .21
    poses.push(fishPose(config, mobile, ratios, PASSING.length + index, {
      x: path.x, y: path.y, direction, angle,
    }))
  }
  return poses
}

function assets() {
  if (!assetPromise) assetPromise = Promise.all(ASSETS.map(source => {
    const image = new Image()
    image.src = source
    return image.decode().then(() => image)
  })).catch(error => { assetPromise = undefined; throw error })
  return assetPromise
}

function node(tag, attributes = {}) {
  const element = document.createElementNS(SVG, tag)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, `${value}`))
  return element
}

export function createMarineLife(mobile = false, animated = false) {
  const element = document.createElement('div')
  element.className = 'insight-section__marine-life'
  element.setAttribute('aria-hidden', 'true')
  const fallback = node('svg', { preserveAspectRatio: 'xMidYMid slice', focusable: 'false' })
  const maskId = `insight-wreck-occlusion-${++maskSequence}`
  const mask = node('mask', {
    id: maskId, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse',
    x: 0, y: 0, style: 'mask-type:luminance',
  })
  const definitions = node('defs')
  definitions.append(mask)
  const behindWreck = node('g', { mask: `url(#${maskId})` })
  const foreground = node('g')
  const fish = []
  const mermaid = node('image', { href: ASSETS[0] })
  foreground.append(mermaid)
  fallback.append(definitions, behindWreck, foreground)
  element.append(fallback)
  let art = ARTWORK[mobile ? 'mobile' : 'desktop']
  let ratios = RATIOS
  let swimmer, observer
  let disposed = false, revealed = false, intersecting = false
  const controller = new AbortController()

  function poses(time = 0) {
    const height = art.mermaidHeight, width = height * ratios[0]
    return [...getMarineOrnaments(time, mobile, ratios), ...getMarineFishPoses(time, mobile, ratios), {
      x: art.hipX + (.5 - MERMAID_SEAT.x) * width,
      y: art.hipY + (.5 - MERMAID_SEAT.y) * height,
      width, height, kind: 0, texture: 0, hinge: MERMAID_SEAT.tailHinge,
      direction: 1, angle: 0, phase: 0, opacity: .94, speed: 1.05, sway: .055,
    }]
  }

  function renderFallback() {
    fallback.setAttribute('viewBox', `0 0 ${art.width} ${art.height}`)
    mask.setAttribute('width', art.width)
    mask.setAttribute('height', art.height)
    mask.replaceChildren(node('rect', { width: art.width, height: art.height, fill: '#fff' }),
      ...getWreckOcclusion(mobile).paths.map(path => node('path', {
        d: path.d, fill: path.fill ?? '#000', stroke: path.stroke ?? 'none',
        'stroke-width': path.strokeWidth ?? 0,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      })))
    const current = poses(), count = current.length - 1
    while (fish.length > count) fish.pop().remove()
    while (fish.length < count) {
      const sprite = node('image')
      fish.push(sprite)
    }
    ;[...fish, mermaid].forEach((sprite, index) => {
      const pose = current[index]
      if (pose.behindWreck) behindWreck.append(sprite)
      else foreground.append(sprite)
      Object.entries({
        'data-creature': pose.id ?? 'seated-mermaid',
        href: ASSETS[pose.texture],
        x: -pose.width / 2, y: -pose.height / 2, width: pose.width, height: pose.height,
        opacity: pose.opacity,
        transform: `translate(${pose.x} ${pose.y}) rotate(${pose.angle * 180 / Math.PI}) scale(${pose.direction} 1)`,
      }).forEach(([key, value]) => sprite.setAttribute(key, `${value}`))
    })
  }
  function sync() { swimmer?.setActive(revealed && intersecting && !document.hidden) }

  renderFallback()
  assets().then(images => {
    if (disposed) return
    ratios = images.map(image => image.naturalWidth / image.naturalHeight)
    renderFallback()
    if (!animated) return
    swimmer = createMarineMotion(element, images, poses)
    swimmer?.setArtwork(art.width, art.height)
    sync()
  }).catch(() => { /* Optional sprites leave the ship illustration readable if an asset fails. */ })

  if (animated) {
    observer = new IntersectionObserver(entries => {
      intersecting = entries.some(entry => entry.isIntersecting)
      sync()
    })
    observer.observe(element)
    document.addEventListener('visibilitychange', sync, { signal: controller.signal })
  }

  return {
    element,
    setMobile(value) {
      mobile = value
      art = ARTWORK[mobile ? 'mobile' : 'desktop']
      element.dataset.artwork = mobile ? 'mobile' : 'desktop'
      renderFallback()
      swimmer?.setArtwork(art.width, art.height)
    },
    setActive(value) { revealed = value; sync() },
    destroy() {
      disposed = true
      controller.abort()
      observer?.disconnect()
      swimmer?.destroy()
      element.remove()
    },
  }
}
