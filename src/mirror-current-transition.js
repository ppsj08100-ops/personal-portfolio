import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createMirrorWaterImpact } from './mirror-water-impact.js'
import './mirror-current-transition.css'

gsap.registerPlugin(ScrollTrigger)

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
const GLASS = 'M512 174 C303 174 139 404 139 775 C139 1114 277 1340 512 1340 C747 1340 885 1114 885 775 C885 404 721 174 512 174Z'
let instance = 0

// The previous chapter keeps its own sticky stage and navigation. This single
// reversible sequence follows the existing document boundary without a new pin.
export function initMirrorCurrentTransition(section) {
  const previous = document.querySelector('.design-process')
  const figure = section?.querySelector('.capabilities__artwork')
  const image = section?.querySelector('.capabilities__mirror-frame')
  if (!section || !previous || !figure || !image) return () => {}

  const media = gsap.matchMedia()
  let destroyed = false
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const controller = new AbortController()
    const originalLoading = image.loading
    image.loading = 'eager'
    const id = `mirror-current-${++instance}`
    const layer = document.createElement('div')
    layer.className = 'mirror-current'
    layer.setAttribute('aria-hidden', 'true')
    layer.hidden = true
    layer.innerHTML = `<div class="mirror-current__shade"></div>
      <svg class="mirror-current__drawing" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <defs>
          <filter id="${id}-water" x="-12%" y="-10%" width="124%" height="120%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".005 .018" numOctaves="1" seed="8" result="water-field"/>
            <feOffset class="mirror-current__water-offset" in="water-field" result="moving-water"/>
            <feDisplacementMap class="mirror-current__refraction" in="SourceGraphic" in2="moving-water" scale="0" xChannelSelector="R" yChannelSelector="G" result="refracted"/>
            <feGaussianBlur class="mirror-current__soft-focus" in="refracted" stdDeviation="0" result="softened"/>
            <feColorMatrix class="mirror-current__water-tint" in="softened" type="matrix"/>
          </filter>
          <mask id="${id}-frame" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536">
            <rect width="1024" height="1536" fill="white"/><path d="${GLASS}" fill="black"/>
          </mask>
          <clipPath id="${id}-glass" clipPathUnits="userSpaceOnUse"><path d="${GLASS}"/></clipPath>
        </defs>
        <g class="mirror-current__mirror">
          <g class="mirror-current__submerged" filter="url(#${id}-water)">
            <image class="mirror-current__frame-image" width="1024" height="1536" mask="url(#${id}-frame)"/>
            <g class="mirror-current__glass" clip-path="url(#${id}-glass)">
              <path d="${GLASS}" fill="#041330"/>
              <image class="mirror-current__portrait-image" width="1024" height="1536" opacity="0"/>
            </g>
          </g>
        </g>
      </svg>`
    document.body.append(layer)

    const svg = layer.querySelector('svg')
    const mirror = layer.querySelector('.mirror-current__mirror')
    const submerged = layer.querySelector('.mirror-current__submerged')
    const refraction = layer.querySelector('.mirror-current__refraction')
    const softFocus = layer.querySelector('.mirror-current__soft-focus')
    const waterOffset = layer.querySelector('.mirror-current__water-offset')
    const waterTint = layer.querySelector('.mirror-current__water-tint')
    const face = layer.querySelector('.mirror-current__portrait-image')
    const shade = layer.querySelector('.mirror-current__shade')
    const water = createMirrorWaterImpact(svg, id)
    layer.querySelectorAll('image').forEach(copy => copy.setAttribute('href', image.currentSrc || image.src))

    let disposed = false
    let ready = false
    let trigger
    let last = -1
    let geometry
    let waterFrame
    let ticking = false
    let elapsed = 0
    let lastTick = null
    let travel
    const motion = { progress: 0 }
    const menu = document.querySelector('#portfolio-menu')

    function waterTick(time) {
      if (ticking) {
        if (lastTick !== null) elapsed += Math.max(0, Math.min(.05, time - lastTick))
        lastTick = time
      }
      if (waterFrame) water.render({ ...waterFrame, time, elapsed })
    }

    function syncWater() {
      const active = !disposed && !destroyed && last > .12 && last < .94
        && !document.hidden && !menu?.open && !document.body.classList.contains('has-menu-open')
      if (active === ticking) return
      ticking = active
      if (active) gsap.ticker.add(waterTick)
      else {
        gsap.ticker.remove(waterTick)
        lastTick = null
      }
    }

    document.addEventListener('visibilitychange', syncWater, { signal: controller.signal })
    const menuObserver = new MutationObserver(syncWater)
    if (menu) menuObserver.observe(menu, { attributes: true, attributeFilter: ['open'] })
    menuObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    function measure() {
      const width = document.documentElement.clientWidth
      const height = window.innerHeight
      const boundary = section.getBoundingClientRect().top + window.scrollY
      // Measure the layout box so the falling frame's rotation cannot inflate
      // the geometry of its final, upright handoff.
      const rect = figure.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const end = Math.max(boundary, Math.min(boundary + height * .45, top + rect.height - height * .96))
      // The drop follows the final approach chapter without adding a scroll pin.
      const approachEnd = ScrollTrigger.getById('design-process-pinned')?.end
        ?? previous.getBoundingClientRect().bottom + window.scrollY - height
      const start = Math.max(boundary - height * 1.45, approachEnd)
      const fitHeight = Math.min(rect.height, height * .76)
      const restAngle = Number.parseFloat(getComputedStyle(section).getPropertyValue('--mirror-rest-angle'))
      geometry = {
        width, height, start, end,
        restAngle: Number.isFinite(restAngle) ? restAngle : 0,
        target: { x: rect.left, top, width: rect.width, height: rect.height },
        origin: { x: (width - fitHeight * 2 / 3) / 2, y: height * .43 - fitHeight / 2, width: fitHeight * 2 / 3, height: fitHeight },
      }
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      last = -1
    }

    function render(progress, force = false) {
      if (!ready || disposed || destroyed) return
      const p = clamp(progress)
      if (!force && Math.abs(p - last) < .00001) return
      last = p
      const { width, height, origin, target, restAngle } = geometry
      const fall = clamp((p - .06) / .28)
      const gravity = fall * fall
      const drag = clamp((p - .34) / .38)
      const settle = 1 - (1 - drag) ** 3
      const landing = smooth((p - .73) / .27)
      const drop = Math.min(height * .26, 250)
      const sideways = Math.min(width * .065, 72)
      const fallY = origin.y - drop * (1 - gravity) + height * .055 * settle
      const fallX = origin.x + sideways * (1 - smooth(fall)) - sideways * .12 * settle
      const rect = {
        x: mix(fallX, target.x, landing),
        y: mix(fallY, target.top - window.scrollY, landing),
        width: mix(origin.width, target.width, landing),
        height: mix(origin.height, target.height, landing),
      }
      const scale = rect.width / 1024
      const sinkingTilt = -5 - 5.5 * (1 - smooth(fall)) - 1.6 * Math.sin(settle * Math.PI)
      const tilt = mix(sinkingTilt, restAngle, landing)
      mirror.setAttribute('transform', `translate(${rect.x} ${rect.y}) scale(${scale}) rotate(${tilt} 512 768)`)
      waterFrame = {
        progress: p, width, height, mirrorWidth: rect.width, mirrorHeight: rect.height,
        rotation: tilt,
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      }
      if (p <= .08) { elapsed = 0; lastTick = null }
      waterTick(gsap.ticker.time)
      syncWater()

      // The frame descends through the water column. A soft blue veil and
      // restrained refraction clear as trapped air escapes from its edges.
      const clarity = smooth((p - .22) / .44)
      const immersion = smooth((p - .10) / .20)
      const contrast = mix(.72, 1, clarity)
      const tint = 1 - contrast
      refraction.setAttribute('scale', String(5.5 * immersion * (1 - clarity)))
      softFocus.setAttribute('stdDeviation', String(.28 * immersion * (1 - clarity)))
      waterOffset.setAttribute('dx', String(p * 32))
      waterOffset.setAttribute('dy', String(p * 110))
      waterTint.setAttribute('values', `${contrast} 0 0 0 ${tint * 2 / 255} 0 ${contrast} 0 0 ${tint * 11 / 255} 0 0 ${contrast} 0 ${tint * 29 / 255} 0 0 0 1 0`)
      if (clarity >= .99999) submerged.removeAttribute('filter')
      else submerged.setAttribute('filter', `url(#${id}-water)`)
      face.setAttribute('opacity', String(smooth((p - .12) / .28)))
      mirror.style.opacity = String(smooth((p - .055) / .06))

      const title = smooth((p - .72) / .22)
      section.style.setProperty('--current-title-opacity', String(title))
      section.style.setProperty('--current-title-offset', `${16 * (1 - title)}px`)
      section.dataset.currentProgress = p.toFixed(4)
      section.dataset.currentPhase = p < .08 ? 'waiting' : p < .34 ? 'falling' : p < .73 ? 'submerged' : p < 1 ? 'landing' : 'landed'

      shade.style.opacity = String(smooth((p - .005) / .10) * (1 - smooth((p - .72) / .23)))
      mirror.style.visibility = p <= .055 ? 'hidden' : 'visible'
      const landed = p >= .99999
      section.classList.toggle('is-current-landed', landed)
      layer.hidden = p <= .00001 || landed
    }

    function follow(progress, immediate = false) {
      travel?.kill()
      if (immediate) {
        motion.progress = progress
        render(progress, true)
        return
      }
      const distance = Math.abs(progress - motion.progress)
      // A quick wheel gesture still passes through the drop and its impact.
      travel = gsap.to(motion, {
        progress, duration: distance > .45 ? .9 : .32, ease: 'power1.out',
        onUpdate: () => render(motion.progress),
      })
    }

    const load = image.complete && image.naturalWidth ? Promise.resolve() : image.decode()
    load.then(() => {
      if (disposed || destroyed) return
      ready = true
      section.classList.add('is-current-linked')
      measure()
      trigger = ScrollTrigger.create({
        id: 'mirror-current-handoff', trigger: section,
        start: () => { measure(); return geometry.start },
        end: () => geometry.end,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: self => follow(self.progress, true),
        onUpdate: self => follow(self.progress),
      })
      follow(trigger.progress, true)
    }).catch(() => {})

    return () => {
      disposed = true
      controller.abort()
      menuObserver.disconnect()
      travel?.kill()
      gsap.ticker.remove(waterTick)
      water.destroy()
      trigger?.kill()
      layer.remove()
      image.loading = originalLoading
      section.classList.remove('is-current-linked', 'is-current-landed')
      section.style.removeProperty('--current-title-opacity')
      section.style.removeProperty('--current-title-offset')
      delete section.dataset.currentProgress
      delete section.dataset.currentPhase
    }
  })

  return () => { destroyed = true; media.revert() }
}
