const TAU = Math.PI * 2
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const smoothstep = (min, max, value) => {
  const amount = clamp((value - min) / (max - min), 0, 1)
  return amount * amount * (3 - 2 * amount)
}

// These small drawn corals are separate from the painted reef. No source-image
// pixels are moved, covered by rectangular patches, or left behind as ghosts.
const FAN = [
  [0, 0, -.025, -.3, -.07, -.65, .025, -.98],
  [-.0325, -.479, -.08, -.58, -.2, -.73, -.16, -.92],
  [-.03, -.629, .055, -.7, .14, -.82, .12, -.96],
  [-.01, -.12, -.12, -.31, -.23, -.44, -.29, -.76],
  [-.169, -.391, -.25, -.43, -.37, -.49, -.39, -.67],
  [-.246, -.56, -.26, -.67, -.25, -.79, -.21, -.89],
  [0, -.07, .15, -.24, .28, -.5, .31, -.84],
  [.2, -.391, .28, -.43, .38, -.52, .39, -.64],
  [.27, -.6, .29, -.72, .21, -.83, .22, -.93],
]
const FEATHER = [
  [0, 0, -.07, -.3, .1, -.7, .03, -1],
  ...Array.from({ length: 6 }, (_, index) => {
    const y = -.2 - index * .115
    const spread = .25 * (1 - index * .075)
    return [
      [0, y, -.08, y - .015, -spread, y - .11, -spread, y - .22],
      [.01, y - .015, .09, y - .045, spread, y - .13, spread * .9, y - .23],
    ]
  }).flat(),
]
const BRANCH = [
  [0, 0, .07, -.25, -.08, -.61, .03, -.98],
  [0, -.22, -.12, -.32, -.19, -.45, -.18, -.65],
  [-.1, -.41, -.2, -.43, -.24, -.52, -.23, -.61],
  [0, -.42, .13, -.49, .2, -.56, .19, -.77],
  [.11, -.56, .23, -.59, .27, -.68, .25, -.74],
  [-.02, -.61, -.13, -.68, -.14, -.8, -.12, -.88],
  [.01, -.79, .1, -.82, .14, -.9, .13, -.98],
]

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function initFooterAmbience(footer) {
  const canvas = footer?.querySelector('.site-footer__ambience')
  const context = canvas?.getContext('2d', { alpha: true })
  if (!context) return () => {}

  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const events = new AbortController()
  const random = seededRandom(0x51a7c0)
  // Seeds are created once. A bubble's diameter and vertical speed never
  // change during its journey, including while its opacity fades at the ends.
  const bubbles = Array.from({ length: 8 }, (_, index) => ({
    phase: (index + random() * .3) / 8,
    diameter: 2.5 + random() * 4.5,
    speed: 12 + random() * 10,
    drift: 2 + random() * 3,
    frequency: .11 + random() * .06,
    angle: random() * TAU,
    travel: .45 + random() * .13,
    alpha: .17 + random() * .09,
  }))
  let width = 1
  let height = 1
  let pixelRatio = 1
  let elapsed = 0
  let runningSince = null
  let resumedAt = 0
  let frameRequest = 0
  let visible = false
  let disposed = false
  let protectedBoxes = []
  let plants = []
  let bubbleCount = 8
  let tagLayout = ''

  canvas.dataset.bubbleCount = String(bubbleCount)
  canvas.dataset.coralCount = '3'
  canvas.dataset.ambientState = 'paused'
  canvas.dataset.pauseReason = 'offscreen'

  function bubbleClearance(x, y, radius) {
    let fade = 1
    for (const box of protectedBoxes) {
      const dx = Math.max(box.left - x, 0, x - box.right)
      const dy = Math.max(box.top - y, 0, y - box.bottom)
      fade = Math.min(fade, smoothstep(radius + 1, radius + 11, Math.hypot(dx, dy)))
      if (!fade) break
    }
    return fade
  }

  function drawCoral(plant) {
    const sway = plant.sway * (
      Math.sin(elapsed * TAU / plant.period + plant.phase) * .82
      + Math.sin(elapsed * TAU / 12 + plant.phase * .7) * .18
    )
    const point = (x, y) => [
      plant.x + x * plant.height + sway * Math.pow(clamp(-y, 0, 1), 1.7),
      plant.y + y * plant.height,
    ]
    context.save()
    context.lineCap = 'round'
    context.lineJoin = 'round'
    for (const curve of plant.curves) {
      context.beginPath()
      context.moveTo(...point(curve[0], curve[1]))
      context.bezierCurveTo(...point(curve[2], curve[3]), ...point(curve[4], curve[5]), ...point(curve[6], curve[7]))
      context.globalAlpha = plant.alpha
      context.strokeStyle = '#8db6dc'
      context.lineWidth = plant.height < 75 ? 1.55 : 1.9
      context.shadowColor = '#4676a36b'
      context.shadowBlur = 1.4
      context.stroke()
      context.shadowBlur = 0
      context.strokeStyle = '#0a203c'
      context.lineWidth = plant.height < 75 ? .65 : .85
      context.stroke()
    }
    context.restore()
    return [+(plant.x + sway).toFixed(3), +(plant.y - plant.height).toFixed(3)]
  }

  function paint() {
    if (disposed) return
    const mobile = width < 992
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)
    canvas.dataset.ambientTime = elapsed.toFixed(3)
    canvas.dataset.coralTips = JSON.stringify(plants.map(drawCoral))

    // Recycle only after both ends have faded out. Horizontal drift is based
    // on scene time, so wrapping the vertical path cannot reset its phase.
    const anchors = mobile ? [.045, .10, .17, .83, .90, .96] : [.045, .10, .17, .23, .78, .85, .92, .97]
    let visibleBubbles = 0
    const positions = []
    bubbles.slice(0, bubbleCount).forEach((bubble, index) => {
      const travel = height * bubble.travel
      const progress = ((elapsed * bubble.speed + bubble.phase * travel) % travel) / travel
      const fade = smoothstep(0, .08, progress) * (1 - smoothstep(.82, 1, progress))
      const radius = bubble.diameter / 2
      const drift = bubble.drift * (mobile ? .65 : 1)
      const x = clamp(width * anchors[index]
        + Math.sin(elapsed * bubble.frequency + bubble.angle) * drift,
      radius + 2, width - radius - 2)
      const y = height * .78 - progress * travel
      const alpha = bubble.alpha * fade * bubbleClearance(x, y, radius)
      positions.push([+x.toFixed(3), +y.toFixed(3), +radius.toFixed(3), +alpha.toFixed(4)])
      if (alpha < .012) return
      visibleBubbles++
      context.globalAlpha = alpha
      context.strokeStyle = '#b8d6e8'
      context.lineWidth = .65
      context.beginPath()
      context.arc(x, y, radius, 0, TAU)
      context.stroke()
      context.globalAlpha = alpha * .72
      context.lineWidth = .55
      context.beginPath()
      context.arc(x, y, radius * .82, Math.PI * 1.05, Math.PI * 1.55)
      context.stroke()
    })
    context.globalAlpha = 1
    canvas.dataset.visibleBubbles = String(visibleBubbles)
    // Bounded latest-frame diagnostics, rather than an accumulating history.
    canvas.dataset.bubblePositions = JSON.stringify(positions)
  }

  function pauseReason() {
    if (!visible) return 'offscreen'
    if (document.hidden) return 'hidden'
    if (footer.dataset.contactOpen === 'true') return 'contact'
    if (reduced.matches) return 'reduced'
    return ''
  }

  function tick(now) {
    frameRequest = 0
    if (disposed) return
    if (pauseReason()) return updatePlayback()
    elapsed = resumedAt + (now - runningSince) / 1000
    paint()
    frameRequest = requestAnimationFrame(tick)
  }

  function updatePlayback() {
    cancelAnimationFrame(frameRequest)
    frameRequest = 0
    if (disposed) return
    const now = performance.now()
    if (runningSince !== null) elapsed = resumedAt + (now - runningSince) / 1000
    runningSince = null
    resumedAt = elapsed
    const reason = pauseReason()
    canvas.dataset.pauseReason = reason
    canvas.dataset.ambientState = reason === 'reduced' ? 'reduced' : reason ? 'paused' : 'running'
    if (visible) paint()
    if (!reason) {
      runningSince = now
      frameRequest = requestAnimationFrame(tick)
    }
  }

  function syncProtectedBoxes() {
    const bounds = canvas.getBoundingClientRect()
    protectedBoxes = Array.from(footer.querySelectorAll(
      '.site-footer__nametag .site-footer__contacts, .site-footer__tag-hint, .site-footer__social, .site-footer__bottom, .site-footer__brand, .site-footer__caption',
    )).map(element => {
      const box = element.getBoundingClientRect()
      // Includes the small push envelope of the crab-controlled circles.
      const padding = element.matches('.site-footer__social') ? 26 : 18
      return { left: box.left - bounds.left - padding, right: box.right - bounds.left + padding,
        top: box.top - bounds.top - padding, bottom: box.bottom - bounds.top + padding }
    })
  }

  function syncSize() {
    if (disposed) return
    const bounds = canvas.getBoundingClientRect()
    width = Math.max(1, bounds.width)
    height = Math.max(1, bounds.height)
    const mobile = width < 992
    const scale = clamp(width / 1440, .8, 1.15)
    plants = mobile ? [
      { curves: FAN, x: width * .025, y: height * .66, height: 46, phase: .2, alpha: .5, sway: 2.5, period: 9.6 },
      { curves: FEATHER, x: width * .96, y: height * .57, height: 64, phase: 2.3, alpha: .48, sway: 2.8, period: 10.8 },
      { curves: BRANCH, x: width * .085, y: height * .39, height: 47, phase: 4.1, alpha: .43, sway: 1.9, period: 8.8 },
    ] : [
      { curves: FAN, x: width * .19, y: height * .77, height: 94 * scale, phase: .2, alpha: .5, sway: 3.8 * scale, period: 9.6 },
      { curves: FEATHER, x: width * .91, y: height * .65, height: 96 * scale, phase: 2.3, alpha: .48, sway: 4.2 * scale, period: 10.8 },
      { curves: BRANCH, x: width * .22, y: height * .64, height: 74 * scale, phase: 4.1, alpha: .43, sway: 3 * scale, period: 8.8 },
    ]
    bubbleCount = mobile ? 6 : 8
    canvas.dataset.bubbleCount = String(bubbleCount)
    canvas.dataset.coralCount = String(plants.length)
    canvas.dataset.coralRoots = JSON.stringify(plants.map(plant => [plant.x, plant.y]))
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.max(1, Math.round(width * pixelRatio))
    canvas.height = Math.max(1, Math.round(height * pixelRatio))
    syncProtectedBoxes()
    paint()
  }

  const resize = new ResizeObserver(syncSize)
  resize.observe(canvas)
  const visibility = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    if (visible) syncSize()
    updatePlayback()
  })
  visibility.observe(canvas)
  const contact = new MutationObserver(updatePlayback)
  contact.observe(footer, { attributes: true, attributeFilter: ['data-contact-open'] })
  const tag = footer.querySelector('.site-footer__nametag')
  const grounding = new MutationObserver(() => {
    const layout = `${tag?.style.getPropertyValue('--footer-tag-bottom')}|${tag?.style.getPropertyValue('--footer-tag-turn')}`
    if (!disposed && layout !== tagLayout) {
      tagLayout = layout
      syncProtectedBoxes()
    }
  })
  if (tag) grounding.observe(tag, { attributes: true, attributeFilter: ['style'] })
  document.addEventListener('visibilitychange', updatePlayback, { signal: events.signal })
  reduced.addEventListener('change', updatePlayback, { signal: events.signal })
  document.fonts?.ready.then(() => { if (!disposed) syncSize() })
  syncSize()

  return () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frameRequest)
    events.abort()
    resize.disconnect()
    visibility.disconnect()
    contact.disconnect()
    grounding.disconnect()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    canvas.dataset.ambientState = 'disposed'
    canvas.dataset.pauseReason = 'disposed'
    canvas.dataset.bubbleCount = '0'
    canvas.dataset.coralCount = '0'
    canvas.dataset.visibleBubbles = '0'
    canvas.dataset.bubblePositions = '[]'
    canvas.dataset.coralTips = '[]'
    canvas.dataset.coralRoots = '[]'
  }
}
