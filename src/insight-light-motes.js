const SVG = 'http://www.w3.org/2000/svg'
const ARTWORK = {
  desktop: { width: 1672, height: 941, top: 70, bottom: 490, count: 56 },
  mobile: { width: 941, height: 1672, top: 130, bottom: 930, count: 34 },
}
const LIGHT_FANS = {
  desktop: [
    [-60, -45, 330, 570, 95, 1], [90, -65, 640, 565, 90, 1],
    [350, -90, 1230, 455, 180, .45], [630, -100, 1540, 425, 220, .35],
  ],
  mobile: [
    [-60, -70, 270, 960, 100, 1], [65, -80, 540, 1070, 115, 1],
    [220, -100, 730, 920, 150, .45], [390, -90, 940, 840, 185, .35],
  ],
}
const seed = value => {
  const result = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return result - Math.floor(result)
}
const smooth = (start, end, value) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}
let fieldId = 0

function lightAt(x, y, mobile) {
  let light = 0
  for (const [startX, startY, endX, endY, width, strength] of LIGHT_FANS[mobile ? 'mobile' : 'desktop']) {
    const progress = Math.max(0, Math.min(1, (y - startY) / (endY - startY)))
    const center = startX + (endX - startX) * progress
    const distance = (x - center) / (width * (.3 + progress * .7))
    light = Math.max(light, Math.exp(-distance * distance) * strength)
  }
  return light * (1 - smooth(mobile ? 720 : 310, mobile ? 930 : 490, y))
}

function node(tag, attributes = {}) {
  const element = document.createElementNS(SVG, tag)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, `${value}`))
  return element
}

function halo(id, warm = false) {
  const gradient = node('radialGradient', { id, cx: '.46', cy: '.43', r: '.5' })
  ;[
    ['0%', warm ? '#dce7e3' : '#c4dee2', .54],
    ['26%', warm ? '#d0dfe0' : '#b8d7df', .26],
    ['62%', '#9ac4d0', .09],
    ['100%', '#8bbdcd', 0],
  ].forEach(([offset, color, opacity]) => {
    gradient.append(node('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }))
  })
  return gradient
}

// Small suspended dust catches the upper light, without adding stars or rings.
// Fixed shapes drift on one slow route; only their gradual lifecycle fades.
export function createInsightMotes(mobile = false, animated = false) {
  mobile = Boolean(mobile)
  const id = `insight-mote-${++fieldId}`
  const element = node('svg', {
    class: 'insight-section__light-motes', 'aria-hidden': 'true', focusable: 'false',
    preserveAspectRatio: 'xMidYMid slice',
  })
  const definitions = node('defs')
  definitions.append(halo(`${id}-cool`), halo(`${id}-warm`, true))
  const controller = new AbortController()
  let motes = []
  let observer
  let frame = 0
  let lastTime = 0
  let elapsed = 0
  let revealed = false
  let intersecting = false
  let disposed = false

  function render() {
    for (const mote of motes) {
      const progress = (mote.phase + elapsed / mote.duration) % 1
      const current = progress * .7 + smooth(0, 1, progress) * .3
      const x = mote.x + mote.drift * current
      const y = mote.y - mote.rise * progress
      const illumination = .85 + lightAt(x, y, mobile) * .27
      const opacity = mote.opacity * illumination * smooth(0, .16, progress) * (1 - smooth(.76, 1, progress))
      mote.element.setAttribute('transform', `translate(${x} ${y})`)
      mote.element.setAttribute('opacity', `${opacity}`)
    }
  }

  function build() {
    const art = ARTWORK[mobile ? 'mobile' : 'desktop']
    element.setAttribute('viewBox', `0 0 ${art.width} ${art.height}`)
    element.dataset.artwork = mobile ? 'mobile' : 'desktop'
    motes = Array.from({ length: art.count }, (_, i) => {
      const depth = .3 + seed(i + 79) * .7
      const rise = (mobile ? 90 + seed(i + 59) * 140 : 55 + seed(i + 59) * 90) * (.7 + depth * .3)
      const drift = (seed(i + 47) < .28 ? -1 : 1) * (18 + seed(i + 41) * (mobile ? 44 : 34)) * (.65 + depth * .35)
      // A few extra motes inhabit the pale fan, while the remaining water stays quiet.
      const x = i % 3 === 0
        ? 60 + seed(i + 19) * art.width * .33
        : 60 + seed(i + 19) * (art.width - 120)
      let y = art.top + rise + seed(i + 31) * (art.bottom - art.top - rise)
      // The mermaid's head rises into the desktop upper water. Keep both
      // endpoints of nearby routes above her silhouette and the ship's stern.
      if (!mobile && Math.min(x, x + drift) < 1460 && Math.max(x, x + drift) > 1155 && y > 330) {
        y = Math.max(art.top + rise, 160 + seed(i + 37) * 155)
      }
      const inLight = lightAt(x, y, mobile) > .25
      const radius = seed(i + 71) < .045
        ? 1.15 + seed(i + 83) * .2
        : (.4 + seed(i + 97) * .6) * (.7 + depth * .35)
      const group = node('g', { class: 'insight-mote' })
      group.append(
        node('circle', { r: radius * (2.4 + depth * .5), fill: `url(#${id}-${inLight ? 'warm' : 'cool'})` }),
        node('circle', {
          r: radius * (.32 + depth * .1),
          fill: inLight ? '#dce6e2' : '#bdd8df', 'fill-opacity': .36 + depth * .1,
        }),
      )
      return {
        element: group, x, y, drift, rise,
        duration: 24 + seed(i + 61) * 12 - depth * 3,
        phase: (i + seed(i + 53) * .75) / art.count,
        opacity: (.14 + seed(i + 107) * .18) * (.74 + depth * .26),
      }
    })
    element.replaceChildren(definitions, ...motes.map(mote => mote.element))
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
