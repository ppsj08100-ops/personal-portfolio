import './ocean-entry-waterline.css'

let nextWaterlineId = 0
const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => value * value * (3 - 2 * value)
const range = (value, from, to) => clamp((value - from) / (to - from))
const mix = (from, to, amount) => from + (to - from) * amount
const dimension = value => Math.max(1, Math.min(8192, Number.isFinite(value) ? value : 1))

// One water surface passes the camera. Everything below the curved boundary
// belongs to the underwater scene; the narrow meniscus only softens that edge.
export function createOceanEntryWaterline(host) {
  if (!host) return { resize() {}, render() {}, destroy() {} }

  const id = `ocean-entry-waterline-${++nextWaterlineId}`
  const layer = document.createElement('div')
  layer.className = 'ocean-entry-waterline'
  layer.setAttribute('aria-hidden', 'true')
  layer.innerHTML = `
    <svg class="ocean-entry-waterline__surface" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
      <defs>
        <clipPath id="${id}-clip" clipPathUnits="userSpaceOnUse"><path class="ocean-entry-waterline__clip" /></clipPath>
        <linearGradient id="${id}-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#143c59" />
          <stop offset=".3" stop-color="#082441" />
          <stop offset="1" stop-color="#020d22" />
        </linearGradient>
        <linearGradient id="${id}-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#04152b" stop-opacity=".1" />
          <stop offset=".42" stop-color="#020f24" stop-opacity=".17" />
          <stop offset="1" stop-color="#020b1d" stop-opacity=".6" />
        </linearGradient>
        <linearGradient id="${id}-meniscus" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#142b40" stop-opacity=".45" />
          <stop offset=".22" stop-color="#b9d0dc" stop-opacity=".28" />
          <stop offset=".42" stop-color="#638faa" stop-opacity=".25" />
          <stop offset="1" stop-color="#163953" stop-opacity="0" />
        </linearGradient>
        <radialGradient id="${id}-vignette" cx=".48" cy="0" r=".9">
          <stop offset=".3" stop-color="#010a1b" stop-opacity="0" />
          <stop offset="1" stop-color="#010a1b" stop-opacity=".35" />
        </radialGradient>
      </defs>
      <g clip-path="url(#${id}-clip)">
        <rect class="ocean-entry-waterline__body" fill="url(#${id}-depth)" />
        <image class="ocean-entry-waterline__water" href="/images/ocean-descent-water-matched.png" preserveAspectRatio="xMidYMin slice" />
        <rect class="ocean-entry-waterline__shade" fill="url(#${id}-shade)" />
        <rect class="ocean-entry-waterline__vignette" fill="url(#${id}-vignette)" />
      </g>
      <path class="ocean-entry-waterline__meniscus" fill="url(#${id}-meniscus)" />
    </svg>`
  host.append(layer)

  const svg = layer.querySelector('svg')
  const clip = layer.querySelector('.ocean-entry-waterline__clip')
  const meniscus = layer.querySelector('.ocean-entry-waterline__meniscus')
  const gradient = layer.querySelector(`#${id}-meniscus`)
  const image = layer.querySelector('image')
  const rects = [...layer.querySelectorAll('rect')]
  const controller = new AbortController()
  image.addEventListener('error', () => { image.style.display = 'none' }, { signal: controller.signal })
  let width = 1
  let height = 1
  let lastProgress = 0
  let destroyed = false

  function resize(nextWidth, nextHeight) {
    if (destroyed) return
    width = dimension(nextWidth)
    height = dimension(nextHeight)
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    for (const rect of rects) {
      rect.setAttribute('width', width)
      rect.setAttribute('height', height)
    }
    image.setAttribute('width', width)
    image.setAttribute('height', Math.max(height * 1.14, width * .5))
    draw(lastProgress)
  }

  function draw(progress) {
    const p = clamp(progress)
    lastProgress = p
    const crossing = smooth(range(p, .06, .43))
    const y = mix(height * 1.12, -height * .15, crossing)
    const amplitude = Math.min(14, height * .012)
    const phase = p * Math.PI * 1.6
    const points = [
      [0, y + Math.sin(phase + .3) * amplitude * .64],
      [width * .28, y + Math.sin(phase + 1.4) * amplitude],
      [width * .65, y + Math.sin(phase + 3.5) * amplitude * .78],
      [width, y + Math.sin(phase + 5.2) * amplitude * .6],
    ]
    const fmt = value => value.toFixed(3)
    const [a, b, c, d] = points
    const edge = `M0 ${fmt(a[1])} C${fmt(width * .1)} ${fmt(a[1])} ${fmt(width * .16)} ${fmt(b[1])} ${fmt(b[0])} ${fmt(b[1])} C${fmt(width * .41)} ${fmt(b[1])} ${fmt(width * .5)} ${fmt(c[1])} ${fmt(c[0])} ${fmt(c[1])} C${fmt(width * .78)} ${fmt(c[1])} ${fmt(width * .88)} ${fmt(d[1])} ${fmt(width)} ${fmt(d[1])}`
    clip.setAttribute('d', `${edge} L${fmt(width)} ${fmt(height + 30)} L0 ${fmt(height + 30)}Z`)

    const band = Math.min(20, Math.max(10, height * .018))
    // A shallow filled lens, rather than a bright stroked line, lets the water
    // surface catch a little pearl light without becoming a decorative ribbon.
    const lower = `L${fmt(width)} ${fmt(d[1] + band)} C${fmt(width * .88)} ${fmt(d[1] + band)} ${fmt(width * .78)} ${fmt(c[1] + band)} ${fmt(c[0])} ${fmt(c[1] + band)} C${fmt(width * .5)} ${fmt(c[1] + band)} ${fmt(width * .41)} ${fmt(b[1] + band)} ${fmt(b[0])} ${fmt(b[1] + band)} C${fmt(width * .16)} ${fmt(b[1] + band)} ${fmt(width * .1)} ${fmt(a[1] + band)} 0 ${fmt(a[1] + band)}Z`
    meniscus.setAttribute('d', edge + lower)
    gradient.setAttribute('x1', 0)
    gradient.setAttribute('x2', 0)
    gradient.setAttribute('y1', y - amplitude * .35)
    gradient.setAttribute('y2', y + band)
    image.setAttribute('y', (y - height * .035).toFixed(3))
    const opacity = smooth(range(p, .002, .045)) * (1 - smooth(range(p, .43, .58)))
    layer.style.opacity = opacity.toFixed(4)
    layer.style.visibility = opacity > 0 ? 'visible' : 'hidden'
    layer.dataset.waterlineY = y.toFixed(3)
  }

  function render({ progress = 0, width: nextWidth = width, height: nextHeight = height } = {}) {
    if (destroyed) return
    if (dimension(nextWidth) !== width || dimension(nextHeight) !== height) resize(nextWidth, nextHeight)
    draw(Number.isFinite(progress) ? progress : 0)
  }

  return {
    resize,
    render,
    destroy() {
      if (destroyed) return
      destroyed = true
      controller.abort()
      layer.remove()
    },
  }
}
