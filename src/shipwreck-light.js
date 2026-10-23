const SVG = 'http://www.w3.org/2000/svg'
const ARTWORK = {
  desktop: {
    width: 1672, height: 941,
    // Follow the missing planks above the bow-side chest, inside their pale rim.
    aperture: 'M634 543L667 555L665.5 558L664 560L666 562L663.5 564L665 566L661.5 569L663 571L660 575L620 563.5L623 561.5L623 559.5L626 558.5L625.5 556L628.5 554.5L628 552L630 550.5L630 548L632 546Z',
    direction: { x1: 630, y1: 543, x2: 661, y2: 576 },
    timber: 'M646 550L642 561L638.5 570',
    reflection: 'M627 566.8C635 568.7 648 573.4 658.5 576.4M665.2 559.8L664 562.4L665.1 564.7',
    grain: 'M644.5 554L640.5 564M646 555L642.5 563.5',
    stroke: .7,
  },
  mobile: {
    width: 941, height: 1672,
    aperture: 'M357 1061L371 1067L370 1069L372 1070L369 1072L370 1074L368 1076L369 1078L367 1080L353 1074L354 1072L352.5 1071L355 1069L354.5 1067L356 1066L355.5 1064Z',
    direction: { x1: 355, y1: 1061, x2: 369, y2: 1081 },
    timber: 'M362 1065.5L360.5 1070L359 1074.5',
    reflection: 'M354.7 1075C358 1076.6 363.1 1078.6 366.7 1081M370 1069.1L369 1071.1L370 1073.2',
    grain: 'M361 1068L359 1073M362 1068.5L360.5 1072.5',
    stroke: .5,
  },
}
let lightId = 0

function node(tag, attributes = {}) {
  const element = document.createElementNS(SVG, tag)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, `${value}`))
  return element
}

function gradient(id, stops) {
  const element = node('linearGradient', { id, gradientUnits: 'userSpaceOnUse' })
  stops.forEach(([offset, color, opacity]) => {
    element.append(node('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }))
  })
  return element
}

export function createShipwreckLight(mobile = false) {
  const id = `shipwreck-light-${++lightId}`
  const element = node('svg', {
    class: 'insight-section__shipwreck-light',
    'aria-hidden': 'true', focusable: 'false',
    // Match the illustration's object-fit: cover at every viewport ratio.
    preserveAspectRatio: 'xMidYMid slice',
  })
  const definitions = node('defs')
  const interior = gradient(`${id}-interior`, [
    ['0%', '#87582e', .18],
    ['18%', '#bd8849', .58],
    ['42%', '#e4b878', .84],
    ['70%', '#d7a260', .76],
    ['100%', '#8f6035', .3],
  ])
  const reflected = gradient(`${id}-reflected`, [
    ['0%', '#9c6a38', .12],
    ['48%', '#d2a265', .52],
    ['100%', '#e6bd7c', .66],
  ])
  const clip = node('clipPath', { id: `${id}-opening`, clipPathUnits: 'userSpaceOnUse' })
  const cutout = node('path')
  clip.append(cutout)
  // Feather the opening's chipped edge, rather than blurring a light source.
  // The dark rear timber interrupts the illumination and retains its depth.
  const feather = node('filter', {
    id: `${id}-edge`, x: '-12%', y: '-12%', width: '124%', height: '124%',
    'color-interpolation-filters': 'sRGB',
  })
  const edgeBlur = node('feGaussianBlur')
  feather.append(edgeBlur)
  const insideMask = node('mask', {
    id: `${id}-interior-mask`, maskUnits: 'userSpaceOnUse',
    maskContentUnits: 'userSpaceOnUse', style: 'mask-type:luminance', x: 0, y: 0,
  })
  const interiorShape = node('path', {
    fill: '#fff', stroke: '#000', 'stroke-linejoin': 'round',
    filter: `url(#${id}-edge)`,
  })
  const occludingTimber = node('path', {
    fill: 'none', stroke: '#000', 'stroke-opacity': .55, 'stroke-linecap': 'round',
    filter: `url(#${id}-edge)`,
  })
  insideMask.append(interiorShape, occludingTimber)
  definitions.append(
    interior,
    reflected,
    clip,
    feather,
    insideMask,
  )
  const glow = node('g', { class: 'insight-section__shipwreck-glow' })
  const cavity = node('g', { 'clip-path': `url(#${id}-opening)` })
  // Broad amber bounce remains legible in the small mobile opening. Its linear
  // shading, dark timber and chipped edge keep it inside the illustrated hull.
  const aperture = node('path', {
    fill: `url(#${id}-interior)`, mask: `url(#${id}-interior-mask)`,
  })
  const timber = node('path', {
    fill: 'none', stroke: `url(#${id}-reflected)`, 'stroke-opacity': .65,
    'stroke-linecap': 'round',
  })
  const reflection = node('path', {
    fill: 'none', stroke: `url(#${id}-reflected)`, 'stroke-linecap': 'round',
  })
  const grain = node('path', {
    fill: 'none', stroke: '#d2a166', 'stroke-opacity': .17,
    'stroke-linecap': 'round',
  })
  cavity.append(aperture, timber, grain)
  // A short bounce on the adjacent chipped lip connects the warm interior to
  // the blue drawing; the rest of the hull keeps its original cool outline.
  glow.append(cavity, reflection)
  element.append(definitions, glow)

  function setMobile(isMobile) {
    const variant = isMobile ? 'mobile' : 'desktop'
    const { width, height, aperture: path, direction, timber: rearTimber,
      reflection: innerRim, grain: rearGrain, stroke } = ARTWORK[variant]
    element.setAttribute('viewBox', `0 0 ${width} ${height}`)
    element.dataset.artwork = variant
    cutout.setAttribute('d', path)
    interiorShape.setAttribute('d', path)
    interiorShape.setAttribute('stroke-width', `${stroke * 2.8}`)
    occludingTimber.setAttribute('d', rearTimber)
    occludingTimber.setAttribute('stroke-width', `${stroke * 3}`)
    edgeBlur.setAttribute('stdDeviation', `${stroke * .75}`)
    insideMask.setAttribute('width', `${width}`)
    insideMask.setAttribute('height', `${height}`)
    aperture.setAttribute('d', path)
    timber.setAttribute('d', rearTimber)
    reflection.setAttribute('d', innerRim)
    grain.setAttribute('d', rearGrain)
    timber.setAttribute('stroke-width', `${stroke * 1.6}`)
    reflection.setAttribute('stroke-width', `${stroke}`)
    grain.setAttribute('stroke-width', `${stroke * .6}`)
    for (const paint of [interior, reflected]) {
      Object.entries(direction).forEach(([key, value]) => paint.setAttribute(key, `${value}`))
    }
  }

  setMobile(mobile)
  return { element, setMobile }
}
