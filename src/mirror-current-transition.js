import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createMirrorSurfaceRipples } from './mirror-surface-ripples.js'
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
  media.add('(prefers-reduced-motion: no-preference) and (min-height: 600px)', () => {
    const originalLoading = image.loading
    image.loading = 'eager'
    const id = `mirror-current-${++instance}`
    const layer = document.createElement('div')
    layer.className = 'mirror-current'
    layer.setAttribute('aria-hidden', 'true')
    layer.hidden = true
    layer.innerHTML = `<div class="mirror-current__shade"></div>
      <div class="mirror-current__water-plane"></div>
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
    const waterPlane = layer.querySelector('.mirror-current__water-plane')
    layer.querySelectorAll('image').forEach(copy => copy.setAttribute('href', image.currentSrc || image.src))
    const canvas = document.createElement('canvas')
    canvas.className = 'mirror-current__surface'
    canvas.setAttribute('aria-hidden', 'true')
    layer.insertBefore(canvas, waterPlane)
    const ripples = createMirrorSurfaceRipples(canvas)

    let disposed = false
    let ready = false
    let trigger
    let last = -1
    let geometry

    function measure() {
      const width = document.documentElement.clientWidth
      const height = window.innerHeight
      const boundary = section.getBoundingClientRect().top + window.scrollY
      const rect = image.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const end = Math.max(boundary, Math.min(boundary + height * .45, top + rect.height - height * .96))
      const fitHeight = Math.min(rect.height, height * .76)
      geometry = {
        width, height, start: boundary - height * 1.45, end,
        target: { x: rect.left, top, width: rect.width, height: rect.height },
        origin: { x: (width - fitHeight * 2 / 3) / 2, y: height * .43 - fitHeight / 2, width: fitHeight * 2 / 3, height: fitHeight },
      }
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      ripples.resize(width, height)
      last = -1
    }

    function render(progress, force = false) {
      if (!ready || disposed || destroyed) return
      const p = clamp(progress)
      if (!force && Math.abs(p - last) < .00001) return
      last = p
      const { width, height, origin, target } = geometry
      const rising = smooth((p - .08) / .58)
      const depth = mix(.84, 1, rising)
      const landing = smooth((p - .73) / .27)
      const emergingWidth = origin.width * depth
      const emergingHeight = origin.height * depth
      const rect = {
        x: mix((width - emergingWidth) / 2, target.x, landing),
        y: mix(origin.y + (origin.height - emergingHeight) / 2 + height * .07 * (1 - rising), target.top - window.scrollY, landing),
        width: mix(emergingWidth, target.width, landing),
        height: mix(emergingHeight, target.height, landing),
      }
      const scale = rect.width / 1024
      mirror.setAttribute('transform', `translate(${rect.x} ${rect.y}) scale(${scale})`)

      // One complete mirror sits beneath the water from the first moment.
      // Change its light and refraction while preserving an opaque glass base.
      const clarity = smooth((p - .18) / .50)
      const contrast = mix(.045, 1, clarity)
      const tint = 1 - contrast
      refraction.setAttribute('scale', String(26 * (1 - clarity)))
      softFocus.setAttribute('stdDeviation', String(3.5 * (1 - clarity)))
      waterOffset.setAttribute('dx', String(p * 32))
      waterOffset.setAttribute('dy', String(p * 110))
      waterTint.setAttribute('values', `${contrast} 0 0 0 ${tint * 2 / 255} 0 ${contrast} 0 0 ${tint * 11 / 255} 0 0 ${contrast} 0 ${tint * 29 / 255} 0 0 0 1 0`)
      if (clarity >= .99999) submerged.removeAttribute('filter')
      else submerged.setAttribute('filter', `url(#${id}-water)`)
      face.setAttribute('opacity', String(smooth((p - .39) / .30)))

      ripples.render({ progress: p, rect, width, height })
      const title = smooth((p - .72) / .22)
      section.style.setProperty('--current-title-opacity', String(title))
      section.style.setProperty('--current-title-offset', `${16 * (1 - title)}px`)
      section.dataset.currentProgress = p.toFixed(4)

      // The previous scene sinks into navy before the reflection approaches.
      // Clear that veil only after the mirror has regained its original light.
      shade.style.opacity = String(smooth((p - .01) / .18) * (1 - smooth((p - .72) / .23)))
      waterPlane.style.opacity = String(.65 * smooth((p - .03) / .14) * (1 - smooth((p - .42) / .30)))
      waterPlane.style.transform = `translate(${mix(-5, 5, rising)}px, ${mix(7, -7, rising)}px)`
      mirror.style.visibility = p <= .12 ? 'hidden' : 'visible'
      const landed = p >= .99999
      section.classList.toggle('is-current-landed', landed)
      layer.hidden = p <= .00001 || landed
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
        onRefresh: self => render(self.progress, true),
        onUpdate: self => render(self.progress),
      })
      render(trigger.progress, true)
    }).catch(() => {})

    return () => {
      disposed = true
      trigger?.kill()
      ripples.destroy()
      layer.remove()
      image.loading = originalLoading
      section.classList.remove('is-current-linked', 'is-current-landed')
      section.style.removeProperty('--current-title-opacity')
      section.style.removeProperty('--current-title-offset')
      delete section.dataset.currentProgress
    }
  })

  return () => { destroyed = true; media.revert() }
}
