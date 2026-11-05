import { initOctopusColumnStroke } from './process-octopus-stroke.js'

// Small, phase-delayed contractions travel through exposed arm spans. The
// head, column, phone coil and central screen contact remain unfiltered copies.
const spans = [
  { x: .25, y: .845, rx: .065, ry: .027, amplitude: 1.8, phase: -.85 },
  { x: .56, y: .852, rx: .07, ry: .027, amplitude: 2.4, phase: 0 },
  { x: .56, y: .904, rx: .095, ry: .018, amplitude: 1.8, phase: -1.3 },
]
let serial = 0

export function initProcessOctopusLife(chapter, page, visual) {
  const artwork = visual.querySelector('.process-exhibit__prop--grounded')
  if (!artwork) return () => {}
  const ns = 'http://www.w3.org/2000/svg'
  const id = `process-arm-wave-${++serial}`
  const uri = body => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="${ns}" viewBox="0 0 1000 1000">${body}</svg>`)}`
  const map = span => uri(`<defs><radialGradient id="g"><stop stop-color="rgb(50%,100%,50%)"/><stop offset="1" stop-color="rgb(50%,50%,50%)"/></radialGradient></defs><path fill="rgb(50%,50%,50%)" d="M0 0H1000V1000H0Z"/><ellipse cx="${span.x * 1000}" cy="${span.y * 1000}" rx="${span.rx * 1000}" ry="${span.ry * 1000}" fill="url(#g)"/>`)
  const mask = span => uri(`<defs><radialGradient id="g"><stop offset=".18" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><ellipse cx="${span.x * 1000}" cy="${span.y * 1000}" rx="${span.rx * 1000}" ry="${span.ry * 1000}" fill="url(#g)"/>`)
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'
  svg.dataset.processArmFilter = ''
  svg.dataset.armSpans = JSON.stringify(spans)
  const passes = spans.map((span, index) => {
    const input = index ? `arm-${index - 1}` : 'SourceGraphic'
    return `<feImage href="${map(span)}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map-${index}"/><feDisplacementMap data-arm-wave="${index}" in="${input}" in2="map-${index}" scale="0" xChannelSelector="R" yChannelSelector="G" result="moved-${index}"/><feImage href="${mask(span)}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="mask-${index}"/><feComposite in="moved-${index}" in2="mask-${index}" operator="in" result="moving-${index}"/><feComposite in="${input}" in2="mask-${index}" operator="out" result="fixed-${index}"/><feComposite in="moving-${index}" in2="fixed-${index}" operator="arithmetic" k2="1" k3="1" result="arm-${index}"/>`
  }).join('')
  svg.innerHTML = `<defs><filter id="${id}" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">${passes}</filter></defs>`
  visual.querySelector('.process-exhibit__scenery').append(svg)
  const offsets = [...svg.querySelectorAll('[data-arm-wave]')]
  const originalFilter = artwork.style.filter
  const tone = getComputedStyle(artwork).filter
  artwork.style.filter = `url("#${id}")${tone === 'none' ? '' : ` ${tone}`}`
  const stroke = initOctopusColumnStroke(artwork, visual)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let intersecting = false
  let disposed = false
  let running = false
  let timer = 0
  let frame = 0
  let elapsed = 0
  let previousTime = 0
  let height = artwork.clientHeight
  let width = artwork.clientWidth

  function stop() {
    clearTimeout(timer)
    cancelAnimationFrame(frame)
    frame = timer = 0
    running = false
    elapsed = previousTime = 0
    offsets.forEach(offset => offset.setAttribute('scale', '0'))
    stroke.reset()
    artwork.dataset.armLife = 'paused'
    artwork.dataset.armDisplacements = '[0,0,0]'
  }

  function tick(time) {
    frame = 0
    if (!running || disposed) return
    if (previousTime) elapsed += time - previousTime
    previousTime = time
    const phase = elapsed * Math.PI * 2 / 10500
    const size = Math.min(1, Math.max(.6, width / 690))
    const gain = Math.min(1, elapsed / 1400)
    const pixels = spans.map((span, index) => {
      const pulse = .9 * Math.sin(phase + span.phase) + .1 * Math.sin(phase * .67 + span.phase)
      const displacement = pulse * span.amplitude * size * gain
      offsets[index].setAttribute('scale', height ? String(displacement * 2 / height) : '0')
      return Number(displacement.toFixed(4))
    })
    artwork.dataset.armDisplacements = JSON.stringify(pixels)
    stroke.setWave(phase, gain)
    timer = setTimeout(() => { timer = 0; frame = requestAnimationFrame(tick) }, 50)
  }

  function update() {
    const arrival = parseFloat(getComputedStyle(chapter).getPropertyValue('--process-arrival'))
    const ready = !disposed && intersecting && !page.inert && !document.hidden && !reduced.matches && arrival >= .999
    if (!ready) { stop(); return }
    if (running) return
    running = true
    artwork.dataset.armLife = 'running'
    frame = requestAnimationFrame(tick)
  }

  const intersection = new IntersectionObserver(entries => {
    intersecting = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .05)
    update()
  }, { threshold: [0, .05] })
  const mutations = new MutationObserver(update)
  const resize = new ResizeObserver(entries => {
    width = entries[0].contentRect.width
    height = entries[0].contentRect.height
  })
  stop()
  intersection.observe(visual)
  mutations.observe(chapter, { attributes: true, attributeFilter: ['style', 'class', 'data-project-page-index'] })
  resize.observe(artwork)
  reduced.addEventListener('change', update)
  document.addEventListener('visibilitychange', update)

  return () => {
    disposed = true
    stop()
    intersection.disconnect()
    mutations.disconnect()
    resize.disconnect()
    stroke.dispose()
    reduced.removeEventListener('change', update)
    document.removeEventListener('visibilitychange', update)
    artwork.style.filter = originalFilter
    delete artwork.dataset.armLife
    delete artwork.dataset.armDisplacements
    svg.remove()
  }
}
