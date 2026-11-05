// The original arm pixels sit above a clean, stationary pillar. Only the
// middle of this cutout bends; its body connection and far curl stay anchored.
const armOutline = 'M1118 797 C1146 830 1189 841 1208 794 C1219 764 1210 738 1240 710 C1278 676 1354 665 1411 634 C1464 604 1485 584 1476 555 C1504 567 1515 598 1510 637 C1507 680 1468 708 1432 734 C1397 761 1373 787 1357 818 C1338 855 1321 877 1274 889 C1223 906 1164 890 1115 860 L1094 824Z'
let serial = 0

export function initOctopusColumnStroke(artwork, visual) {
  const originalSrc = artwork.getAttribute('src')
  const ns = 'http://www.w3.org/2000/svg'
  const id = `column-stroke-${++serial}`
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 1536 1024')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.dataset.processStrokeLayer = ''
  svg.dataset.strokeRegion = JSON.stringify({ x: 1390 / 1536, y: 720 / 1024, rx: 190 / 1536, ry: 180 / 1024 })
  svg.style.cssText = 'position:absolute;left:0;bottom:calc(var(--process-floor) - var(--process-art) * (1 - var(--process-prop-foot)));width:100%;height:auto;aspect-ratio:3/2;overflow:visible;pointer-events:none;opacity:clamp(0,calc(var(--process-arrival) / .55),1)'
  const map = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${ns}" viewBox="0 0 1536 1024"><defs><radialGradient id="g"><stop stop-color="rgb(65%,100%,50%)"/><stop offset="1" stop-color="rgb(50%,50%,50%)"/></radialGradient></defs><path fill="rgb(50%,50%,50%)" d="M0 0H1536V1024H0Z"/><ellipse cx="1390" cy="720" rx="190" ry="180" fill="url(#g)"/></svg>`)}`
  svg.innerHTML = `<defs><clipPath id="${id}-outline"><path d="${armOutline}"/></clipPath><filter id="${id}-motion" x="-24" y="-24" width="1584" height="1072" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${map}" x="0" y="0" width="1536" height="1024" preserveAspectRatio="none" result="field"/><feDisplacementMap data-stroke-displacement in="SourceGraphic" in2="field" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></defs><g filter="url(#${id}-motion)"><image href="${originalSrc}" x="0" y="0" width="1536" height="1024" clip-path="url(#${id}-outline)"/></g>`
  const displacement = svg.querySelector('[data-stroke-displacement]')
  const plate = new Image()
  const original = new Image()
  plate.src = '/images/process-octopus-column-clean-plate-v4.png'
  original.src = originalSrc
  let disposed = false
  let loaded = false
  let readyTime = 0
  let changedSource = false
  const ready = Promise.all([plate.decode(), original.decode()]).then(() => {
    if (disposed) return
    artwork.dataset.processRestingArt = originalSrc
    artwork.src = plate.src
    changedSource = true
    visual.querySelector('.process-exhibit__scenery').append(svg)
    loaded = true
    readyTime = performance.now()
    svg.dataset.strokeScale = '0'
    svg.dataset.strokeYpx = '0'
  }).catch(() => { /* The complete original remains visible if loading fails. */ })

  return {
    ready,
    setWave(phase, gain) {
      if (!loaded || disposed) return
      const entrance = Math.min(1, (performance.now() - readyTime) / 1800)
      const scale = 20 * Math.sin(phase * .84) * gain * entrance
      displacement.setAttribute('scale', String(scale))
      svg.dataset.strokeScale = scale.toFixed(4)
      svg.dataset.strokeYpx = (scale * .5 * artwork.clientHeight / 1024).toFixed(4)
    },
    reset() {
      displacement.setAttribute('scale', '0')
      svg.dataset.strokeScale = '0'
      svg.dataset.strokeYpx = '0'
    },
    dispose() {
      disposed = true
      svg.remove()
      if (changedSource) artwork.setAttribute('src', originalSrc)
      delete artwork.dataset.processRestingArt
    },
  }
}
