const SVG = 'http://www.w3.org/2000/svg'
const ARTWORK = {
  desktop: {
    width: 1672, height: 941, fadeStart: 340, fadeEnd: 600,
    ambientFadeStart: 190, ambientFadeEnd: 420,
    pool: [210, -35, 560, 165], haze: [300, 160, 410, 250],
    rays: [
      [-60, -45, 330, 570, 16, 110, .31],
      [90, -65, 640, 565, 12, 95, .35],
      [260, -60, 960, 535, 22, 145, .18],
      [15, -55, 470, 550, 7, 48, .21],
      [190, -70, 810, 560, 8, 45, .16],
    ],
    ambientRays: [
      [350, -90, 1230, 455, 40, 340, .095],
      [630, -100, 1540, 425, 55, 420, .075],
    ],
  },
  mobile: {
    width: 941, height: 1672, fadeStart: 720, fadeEnd: 1140,
    ambientFadeStart: 510, ambientFadeEnd: 930,
    pool: [85, -30, 360, 160], haze: [240, 280, 330, 480],
    rays: [
      [-60, -70, 270, 960, 16, 95, .29],
      [65, -80, 540, 1070, 12, 120, .33],
      [205, -70, 860, 1030, 20, 145, .15],
      [0, -70, 405, 1000, 7, 48, .2],
      [140, -80, 700, 1050, 8, 50, .14],
    ],
    ambientRays: [
      [220, -100, 730, 920, 34, 265, .09],
      [390, -90, 940, 840, 48, 330, .07],
    ],
  },
}
let layerId = 0

function node(tag, attributes = {}) {
  const element = document.createElementNS(SVG, tag)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, `${value}`))
  return element
}

function paint(tag, id, stops, attributes = {}) {
  const element = node(tag, { id, ...attributes })
  stops.forEach(([offset, color, opacity]) => {
    element.append(node('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }))
  })
  return element
}

export function createInsightSunrays(mobile = false, animated = false) {
  const id = `insight-sunrays-${++layerId}`
  const element = node('svg', {
    class: `insight-section__sunrays${animated ? ' is-animated' : ''}`,
    'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid slice',
  })
  const controller = new AbortController()
  let observer, disposed = false, revealed = false, intersecting = false

  function build() {
    const art = ARTWORK[mobile ? 'mobile' : 'desktop']
    const defs = node('defs')
    defs.append(
      paint('linearGradient', `${id}-beam`, [
        ['0%', '#69a3d0', 0], ['18%', '#8bbadb', .07],
        ['40%', '#a9cee2', .6], ['50%', '#badbe7', .8],
        ['60%', '#a9cee2', .6], ['82%', '#8bbadb', .07], ['100%', '#69a3d0', 0],
      ], { x1: '0%', y1: '0%', x2: '100%', y2: '0%' }),
      paint('linearGradient', `${id}-ambient`, [
        ['0%', '#679ac0', 0], ['24%', '#83b1ce', .035],
        ['42%', '#a3c6d9', .3], ['50%', '#accfdd', .42],
        ['58%', '#a3c6d9', .3], ['76%', '#83b1ce', .035], ['100%', '#679ac0', 0],
      ], { x1: '0%', y1: '0%', x2: '100%', y2: '0%' }),
      paint('radialGradient', `${id}-surface`, [
        ['0%', '#bfdeed', .27], ['28%', '#8bbfe2', .19],
        ['65%', '#4b8ec7', .06], ['100%', '#3c74b0', 0],
      ]),
      paint('radialGradient', `${id}-haze`, [
        ['0%', '#5b9bd0', .13], ['45%', '#477fb7', .07], ['100%', '#38689f', 0],
      ]),
      paint('linearGradient', `${id}-fade`, [
        ['0%', '#fff', 1], [`${art.fadeStart / art.fadeEnd * 100}%`, '#fff', .68],
        ['100%', '#fff', 0],
      ], { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: art.fadeEnd }),
      paint('linearGradient', `${id}-ambient-fade`, [
        ['0%', '#fff', 1], [`${art.ambientFadeStart / art.ambientFadeEnd * 100}%`, '#fff', .6],
        ['100%', '#fff', 0],
      ], { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: art.ambientFadeEnd }),
    )
    const mask = node('mask', {
      id: `${id}-water-mask`, maskUnits: 'userSpaceOnUse',
      x: 0, y: 0, width: art.width, height: art.height, style: 'mask-type:alpha',
    })
    mask.append(node('rect', { width: art.width, height: art.fadeEnd, fill: `url(#${id}-fade)` }))
    const feather = node('filter', {
      id: `${id}-soft-edge`, x: '-80%', y: '-6%', width: '260%', height: '112%',
      'color-interpolation-filters': 'sRGB',
    })
    feather.append(node('feGaussianBlur', { stdDeviation: mobile ? 7 : 8 }))
    const ambientMask = node('mask', {
      id: `${id}-ambient-mask`, maskUnits: 'userSpaceOnUse',
      x: 0, y: 0, width: art.width, height: art.height, style: 'mask-type:alpha',
    })
    ambientMask.append(node('rect', {
      width: art.width, height: art.ambientFadeEnd, fill: `url(#${id}-ambient-fade)`,
    }))
    const diffusion = node('filter', {
      id: `${id}-diffuse-edge`, x: '-65%', y: '-10%', width: '230%', height: '120%',
      'color-interpolation-filters': 'sRGB',
    })
    diffusion.append(node('feGaussianBlur', { stdDeviation: mobile ? 19 : 24 }))
    defs.append(mask, feather, ambientMask, diffusion)

    // Fade after the feathering, so the muted treasure never receives a wash.
    const water = node('g', { mask: `url(#${id}-water-mask)` })
    const [cx, cy, rx, ry] = art.pool
    water.append(node('ellipse', { cx, cy, rx, ry, fill: `url(#${id}-surface)` }))
    const [hx, hy, hrx, hry] = art.haze
    water.append(node('ellipse', {
      cx: hx, cy: hy, rx: hrx, ry: hry,
      transform: `rotate(-32 ${hx} ${hy})`, fill: `url(#${id}-haze)`,
    }))
    const ambientWater = node('g', { mask: `url(#${id}-ambient-mask)` })
    function addRay([x, y, endX, endY, topWidth, bottomWidth, strength], index, ambient = false) {
      const length = Math.hypot(endX - x, endY - y)
      const angle = -Math.atan2(endX - x, endY - y) * 180 / Math.PI
      const position = node('g', { transform: `translate(${x} ${y}) rotate(${angle})`, opacity: strength })
      const ray = node('g', {
        class: `insight-sunray${ambient ? ' insight-sunray--ambient' : ''}`,
        style: `--ray-duration:${ambient ? 43 + index * 5.7 : 29 + index * 3.1}s;--ray-delay:${-(index + (ambient ? 2 : 0)) * 6.7}s;--ray-sway:${ambient ? .78 + index * .12 : .32 + index * .07}deg`,
      })
      const shape = (top, bottom) => `M${-top / 2} 0L${top / 2} 0L${bottom / 2} ${length}L${-bottom / 2} ${length}Z`
      ray.append(node('path', {
        d: shape(topWidth, bottomWidth), fill: `url(#${id}-${ambient ? 'ambient' : 'beam'})`,
        filter: `url(#${id}-${ambient ? 'diffuse-edge' : 'soft-edge'})`,
      }))
      // A finer core adds definition without introducing a sharp white stripe.
      if (!ambient) ray.append(node('path', {
        d: shape(topWidth * .4, bottomWidth * .35), fill: `url(#${id}-beam)`,
        opacity: .32, filter: `url(#${id}-soft-edge)`,
      }))
      position.append(ray)
      ;(ambient ? ambientWater : water).append(position)
    }
    art.rays.forEach((ray, index) => addRay(ray, index))
    art.ambientRays.forEach((ray, index) => addRay(ray, index, true))
    element.setAttribute('viewBox', `0 0 ${art.width} ${art.height}`)
    element.dataset.artwork = mobile ? 'mobile' : 'desktop'
    element.replaceChildren(defs, ambientWater, water)
  }

  function sync() {
    element.classList.toggle('is-active', animated && revealed && intersecting && !document.hidden)
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
      element.remove()
    },
  }
}
