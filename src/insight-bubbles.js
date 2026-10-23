const SVG = 'http://www.w3.org/2000/svg'
const ARTWORK = {
  desktop: { width: 1672, height: 941, columns: [180, 360, 790, 1010, 1530, 1600], origins: [700, 760], count: 60 },
  mobile: { width: 941, height: 1672, columns: [70, 180, 470, 870], origins: [1100, 1250], count: 36 },
}
const seed = value => {
  const result = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return result - Math.floor(result)
}
const smooth = (start, end, value) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

function node(tag, attributes = {}) {
  const element = document.createElementNS(SVG, tag)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, `${value}`))
  return element
}

function bubbleShape(radius) {
  const group = node('g', { class: 'insight-bubble' })
  group.append(
    node('circle', {
      r: radius,
      fill: '#a9cddd', 'fill-opacity': .025,
      stroke: '#9cc4d5', 'stroke-opacity': .72,
      'stroke-width': .55 + radius * .045,
    }),
    node('path', {
      d: `M ${-radius * .66} ${-radius * .17} A ${radius * .7} ${radius * .7} 0 0 1 ${-radius * .17} ${-radius * .67}`,
      fill: 'none', stroke: '#e4eadb', 'stroke-opacity': .74,
      'stroke-width': .48 + radius * .035, 'stroke-linecap': 'round',
    }),
    node('path', {
      d: `M ${radius * .12} ${radius * .74} Q ${radius * .58} ${radius * .69} ${radius * .75} ${radius * .3}`,
      fill: 'none', stroke: '#b0ced4', 'stroke-opacity': .36,
      'stroke-width': .4 + radius * .025, 'stroke-linecap': 'round',
    }),
  )
  return group
}

// The illustration and this field share native coordinates and cover cropping.
// Each fixed bubble shape follows one slow upward route with a gentle current.
export function createInsightBubbles(mobile = false, animated = false) {
  mobile = Boolean(mobile)
  const element = node('svg', {
    class: 'insight-section__bubbles', 'aria-hidden': 'true', focusable: 'false',
    preserveAspectRatio: 'xMidYMid slice',
  })
  const controller = new AbortController()
  let observer
  let bubbles = []
  let elapsed = 0
  let lastTime = 0
  let frame = 0
  let revealed = false
  let intersecting = false
  let disposed = false

  function render() {
    for (const bubble of bubbles) {
      const progress = (bubble.phase + elapsed / bubble.duration) % 1
      // A single cubic changes the side current gradually, without oscillation.
      const current = progress * .6 + smooth(0, 1, progress) * .4
      const x = bubble.x + bubble.drift * current
      const y = bubble.y - bubble.rise * progress
      const opacity = bubble.opacity * smooth(0, .12, progress) * (1 - smooth(.8, 1, progress))
      bubble.element.setAttribute('transform', `translate(${x} ${y})`)
      bubble.element.setAttribute('opacity', `${opacity}`)
    }
  }

  function build() {
    const art = ARTWORK[mobile ? 'mobile' : 'desktop']
    element.setAttribute('viewBox', `0 0 ${art.width} ${art.height}`)
    element.dataset.artwork = mobile ? 'mobile' : 'desktop'
    const rows = Math.ceil(art.count / art.columns.length)
    bubbles = Array.from({ length: art.count }, (_, i) => {
      const column = i % art.columns.length
      const radius = seed(i + 71) < .12 ? 6 + seed(i + 83) : 1.4 + seed(i + 97) * 4.5
      const shape = bubbleShape(radius)
      const direction = seed(i + 47) < .5 ? -1 : 1
      return {
        element: shape,
        x: art.columns[column] + (seed(i + 19) - .5) * (mobile ? 24 : 36),
        y: art.origins[Math.floor(i / art.columns.length) % art.origins.length] + (seed(i + 31) - .5) * (mobile ? 90 : 64),
        phase: (Math.floor(i / art.columns.length) + seed(i + 53) * .8) / rows,
        duration: 8 + seed(i + 61) * 9,
        rise: mobile ? 720 + seed(i + 89) * 330 : 360 + seed(i + 89) * 240,
        drift: direction * (mobile ? 10 + seed(i + 41) * 24 : 12 + seed(i + 41) * 36),
        opacity: .25 + seed(i + 107) * .4,
      }
    })
    element.replaceChildren(...bubbles.map(bubble => bubble.element))
    render()
  }

  function tick(now) {
    frame = 0
    if (disposed || !animated || !revealed || !intersecting || document.hidden) return
    if (lastTime) elapsed += Math.min(.1, (now - lastTime) / 1000)
    lastTime = now
    render()
    frame = requestAnimationFrame(tick)
  }

  function sync() {
    cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
    if (!disposed && animated && revealed && intersecting && !document.hidden) {
      frame = requestAnimationFrame(tick)
    }
  }

  build()
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
      if (disposed || mobile === Boolean(value)) return
      mobile = Boolean(value)
      build()
    },
    setActive(value) {
      if (disposed || revealed === Boolean(value)) return
      revealed = Boolean(value)
      sync()
    },
    destroy() {
      if (disposed) return
      disposed = true
      controller.abort()
      observer?.disconnect()
      cancelAnimationFrame(frame)
      frame = 0
      element.remove()
    },
  }
}
