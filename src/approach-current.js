const SVG = 'http://www.w3.org/2000/svg'
const FRAME_MS = 40
const VEILS = 6
let instance = 0
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const mix = (a, b, t) => a + (b - a) * t
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}
const seed = value => {
  const number = Math.sin(value * 127.1 + 73.7) * 43758.5453
  return number - Math.floor(number)
}
function svgNode(name, attributes = {}) {
  const element = document.createElementNS(SVG, name)
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value))
  return element
}

/** Broad, feathered underwater light replaces the former drawn current. */
export function createApproachCurrent(section) {
  const figure = section?.querySelector('figure[data-approach-visual]')
  const canvas = figure?.querySelector('canvas[data-approach-current]')
  if (!figure || !canvas) return { setProgress() {}, destroy() {} }
  const originalStyle = canvas.getAttribute('style')
  const originalHidden = canvas.getAttribute('aria-hidden')
  const originalWidth = canvas.getAttribute('width')
  const originalHeight = canvas.getAttribute('height')
  const diagnostics = ['currentPhase', 'currentProgress', 'currentMotion', 'currentRenderer', 'currentReady', 'currentStrands', 'currentVeils']
  const originalData = diagnostics.map(key => [key, figure.dataset[key]])
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', display: 'block', width: '100%', height: '100%', pointerEvents: 'none',
  })
  canvas.setAttribute('aria-hidden', 'true')
  let context
  try { context = canvas.getContext('2d', { alpha: true }) } catch { /* SVG retains the diffuse light. */ }
  const hasSoftCanvas = Boolean(context && 'filter' in context)

  const id = `approach-light-${++instance}`
  const fallback = svgNode('svg', {
    class: 'approach-current__fallback', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid meet',
  })
  Object.assign(fallback.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none',
  })
  const definitions = svgNode('defs')
  const filter = svgNode('filter', { id: `${id}-soft`, x: '-70%', y: '-50%', width: '240%', height: '200%', 'color-interpolation-filters': 'sRGB' })
  const blur = svgNode('feGaussianBlur', { stdDeviation: 24 })
  filter.append(blur)
  definitions.append(filter)
  const gradient = svgNode('linearGradient', { id: `${id}-light`, x1: '0%', y1: '0%', x2: '55%', y2: '100%' })
  for (const [offset, opacity, color] of [['0%', '.06', '#d2e7f3'], ['30%', '.43', '#b8d5ea'], ['63%', '.25', '#6da3ce'], ['100%', '0', '#4f83b2']]) {
    gradient.append(svgNode('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }))
  }
  definitions.append(gradient)
  const lightGroup = svgNode('g', { filter: `url(#${id}-soft)` })
  const moteGroup = svgNode('g', { fill: '#c8dfef' })
  const paths = Array.from({ length: VEILS }, (_, index) => {
    const element = svgNode('path', { fill: `url(#${id}-light)`, 'data-current-veil': index })
    lightGroup.append(element)
    return element
  })
  const motes = Array.from({ length: 22 }, () => {
    const element = svgNode('circle')
    moteGroup.append(element)
    return element
  })
  fallback.append(definitions, lightGroup, moteGroup)
  figure.append(fallback)

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  let disposed = false, onScreen = false, dirty = true
  let progress = 0, width = 0, height = 0, ratio = 1
  let frame = 0, lastFrame = 0, lastPaint = 0, elapsed = 0
  let svgMode = !hasSoftCanvas || reduced.matches

  function blends() {
    return { composed: smooth(.18, .46, progress), refined: smooth(.59, .83, progress) }
  }

  function veil(index, time, composition) {
    const primary = index === 2
    const r = seed(index + 31)
    const drift = Math.sin(time * .09 + index * 1.4) * .008
    const observe = {
      sx: .02 + index * .105, sy: -.12 + seed(index + 81) * .10,
      ex: .12 + seed(index + 91) * .75, ey: .46 + seed(index + 101) * .43,
      breadth: .11 + r * .115,
    }
    const composed = {
      sx: .1 + index * .085, sy: -.08 + seed(index + 111) * .06,
      ex: .48 + (index - 2.5) * .022, ey: .63 + seed(index + 121) * .08,
      breadth: .18 + r * .13,
    }
    const refined = { sx: .13, sy: .04, ex: .89, ey: 1.04, breadth: .28 }
    const result = {}
    for (const key of Object.keys(observe)) {
      result[key] = mix(mix(observe[key], composed[key], composition.composed), refined[key], composition.refined)
    }
    result.sx += drift * .35
    result.ex += drift
    result.bend = -.045 + seed(index + 151) * .09
    result.alpha = primary ? mix(.6, .72, composition.refined)
      : (.32 + r * .17) * (1 - composition.refined) ** 2
    return result
  }

  // A broad filled volume with asymmetrical shoulders; heavy feathering makes
  // its edges disappear. There are no stroked paths, wire outlines or loops.
  function shape(light) {
    const sx = light.sx * width, sy = light.sy * height
    const ex = light.ex * width, ey = light.ey * height
    const spread = light.breadth * width
    const mx = mix(sx, ex, .46) + light.bend * width
    const my = mix(sy, ey, .48)
    return [
      ['M', sx - spread * .07, sy],
      ['C', sx - spread * .13, mix(sy, my, .55), mx - spread * .43, my - height * .09, ex - spread * .58, ey],
      ['Q', ex + spread * .03, ey + height * .05, ex + spread * .47, ey - height * .015],
      ['C', mx + spread * .42, my + height * .02, sx + spread * .10, mix(sy, my, .45), sx + spread * .055, sy],
      ['Z'],
    ]
  }

  function trace(commands) {
    context.beginPath()
    for (const [command, ...values] of commands) {
      if (command === 'M') context.moveTo(...values)
      else if (command === 'C') context.bezierCurveTo(...values)
      else if (command === 'Q') context.quadraticCurveTo(...values)
      else context.closePath()
    }
  }
  function asPath(commands) {
    return commands.map(([command, ...values]) => command + values.map(value => value.toFixed(2)).join(' ')).join(' ')
  }

  function dust(index, time, composition) {
    const initialX = .11 + seed(index + 201) * .78
    const initialY = .10 + seed(index + 301) * .78
    const gathering = composition.composed * (1 - composition.refined) * .22
    const x = mix(initialX, .55, gathering) + Math.sin(time * .07 + index * 2.1) * .006
    const y = mix(initialY, .49, gathering) - Math.sin(time * .08 + index) * .009
    return {
      x: x * width, y: y * height,
      radius: .55 + seed(index + 401) ** 3 * 1.1,
      alpha: (.09 + seed(index + 501) * .19) * mix(1, .42, composition.refined),
    }
  }

  function render() {
    if (disposed || !width || !height) return
    const composition = blends()
    const time = svgMode ? 0 : elapsed
    const softness = Math.max(15, Math.min(width, height) * .052)
    if (svgMode) {
      blur.setAttribute('stdDeviation', softness.toFixed(2))
      paths.forEach((path, index) => {
        const light = veil(index, 0, composition)
        path.setAttribute('d', asPath(shape(light)))
        path.setAttribute('opacity', light.alpha.toFixed(4))
      })
      motes.forEach((element, index) => {
        const dot = dust(index, 0, composition)
        for (const [name, value] of Object.entries({ cx: dot.x, cy: dot.y, r: dot.radius, opacity: dot.alpha })) element.setAttribute(name, value.toFixed(4))
      })
    } else {
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.save()
      context.globalCompositeOperation = 'screen'
      context.filter = `blur(${softness}px)`
      for (let index = 0; index < VEILS; index++) {
        const light = veil(index, time, composition)
        if (light.alpha < .002) continue
        const gradient = context.createLinearGradient(light.sx * width, light.sy * height, light.ex * width, light.ey * height)
        gradient.addColorStop(0, 'rgba(205,229,243,.05)')
        gradient.addColorStop(.27, 'rgba(172,207,232,.43)')
        gradient.addColorStop(.58, 'rgba(103,158,202,.25)')
        gradient.addColorStop(1, 'rgba(64,108,155,0)')
        trace(shape(light))
        context.globalAlpha = light.alpha
        context.fillStyle = gradient
        context.fill()
      }
      context.restore()
      // Diffuse pockets interrupt the rays so the result reads as suspended
      // water rather than a set of uniformly striped theatrical spotlights.
      const cloudStrength = .014 + composition.composed * (1 - composition.refined) * .018
      for (let index = 0; index < 12; index++) {
        const x = width * (.18 + seed(index + 601) * .66)
        const y = height * (.12 + seed(index + 701) * .68)
        const radius = Math.min(width, height) * (.085 + seed(index + 801) * .10)
        const haze = context.createRadialGradient(x, y, 0, x, y, radius)
        haze.addColorStop(0, `rgba(137,185,219,${cloudStrength})`)
        haze.addColorStop(.4, `rgba(105,159,201,${cloudStrength * .46})`)
        haze.addColorStop(1, 'rgba(68,116,164,0)')
        context.fillStyle = haze
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      }
      for (let index = 0; index < motes.length; index++) {
        const dot = dust(index, time, composition)
        context.beginPath()
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
        context.fillStyle = `rgba(199,222,239,${dot.alpha})`
        context.fill()
      }
    }
    figure.dataset.currentReady = 'true'
    figure.dataset.currentStrands = '0'
    figure.dataset.currentVeils = String(composition.refined > .995 ? 1 : VEILS)
    dirty = false
  }

  function canFlow() {
    return !disposed && !svgMode && onScreen && !document.hidden
      && !menu?.open && !document.body.classList.contains('has-menu-open')
  }
  function tick(now) {
    frame = 0
    if (disposed) return
    const flowing = canFlow()
    if (flowing && lastFrame) elapsed += Math.min(.08, (now - lastFrame) / 1000)
    lastFrame = flowing ? now : 0
    if (dirty || !lastPaint || now - lastPaint >= FRAME_MS) {
      render()
      lastPaint = now
    }
    if (flowing) frame = requestAnimationFrame(tick)
  }
  function schedule() { if (!disposed && !frame) frame = requestAnimationFrame(tick) }
  function sync() {
    if (disposed) return
    const nextSvgMode = !hasSoftCanvas || reduced.matches
    if (nextSvgMode !== svgMode) { svgMode = nextSvgMode; dirty = true }
    canvas.style.visibility = svgMode ? 'hidden' : 'visible'
    fallback.style.display = svgMode ? 'block' : 'none'
    figure.dataset.currentRenderer = svgMode ? 'svg' : 'canvas'
    figure.dataset.currentMotion = canFlow() ? 'flowing' : 'still'
    if (!canFlow()) {
      cancelAnimationFrame(frame); frame = 0; lastFrame = 0
      if (dirty) schedule()
    } else schedule()
  }
  function measure() {
    if (disposed) return
    const bounds = figure.getBoundingClientRect()
    const nextWidth = Math.max(0, bounds.width), nextHeight = Math.max(0, bounds.height)
    const nextRatio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(3_000_000 / Math.max(1, nextWidth * nextHeight)))
    if (nextWidth === width && nextHeight === height && Math.abs(nextRatio - ratio) < .001) return
    width = nextWidth; height = nextHeight; ratio = nextRatio
    if (context) { canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio)) }
    fallback.setAttribute('viewBox', `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`)
    dirty = true
    sync()
  }
  const resize = new ResizeObserver(measure)
  resize.observe(figure)
  const visibility = new IntersectionObserver(entries => { onScreen = entries.some(entry => entry.isIntersecting); sync() })
  visibility.observe(figure)
  const menuState = new MutationObserver(sync)
  if (menu) menuState.observe(menu, { attributes: true, attributeFilter: ['open'] })
  menuState.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  reduced.addEventListener('change', sync, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  window.addEventListener('resize', measure, { passive: true, signal })
  figure.dataset.currentPhase = 'observe'
  figure.dataset.currentProgress = '0.0000'
  figure.dataset.currentReady = 'false'
  measure(); sync()

  return {
    setProgress(value) {
      if (disposed) return
      const next = clamp(value)
      if (Math.abs(next - progress) < .00001) return
      progress = next
      figure.dataset.currentProgress = progress.toFixed(4)
      figure.dataset.currentPhase = progress < .3 ? 'observe' : progress < .65 ? 'compose' : 'refine'
      dirty = true
      schedule()
    },
    destroy() {
      if (disposed) return
      disposed = true
      controller.abort(); cancelAnimationFrame(frame)
      resize.disconnect(); visibility.disconnect(); menuState.disconnect()
      fallback.remove()
      if (context) context.clearRect(0, 0, canvas.width, canvas.height)
      for (const [attribute, value] of [['style', originalStyle], ['aria-hidden', originalHidden], ['width', originalWidth], ['height', originalHeight]]) {
        if (value === null) canvas.removeAttribute(attribute)
        else canvas.setAttribute(attribute, value)
      }
      for (const [key, value] of originalData) {
        if (value === undefined) delete figure.dataset[key]
        else figure.dataset[key] = value
      }
    },
  }
}
