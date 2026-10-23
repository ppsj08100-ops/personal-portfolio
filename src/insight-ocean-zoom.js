import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createShipwreckLight } from './shipwreck-light.js'
import { createMarineLife } from './insight-marine-life.js'
import { createInsightBubbles } from './insight-bubbles.js'
import { createInsightSunrays } from './insight-sunrays.js'
import { createInsightMotes } from './insight-light-motes.js'

gsap.registerPlugin(ScrollTrigger)

const SVG = 'http://www.w3.org/2000/svg'
const SCENES = {
  desktop: '/images/insight-shipwreck-treasure-subdued.png',
  mobile: '/images/insight-shipwreck-treasure-subdued-mobile.png',
}
const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}
const node = (tag, attributes = {}) => {
  const element = document.createElementNS(SVG, tag)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, `${value}`))
  return element
}

export function initInsightOceanZoom(section) {
  const voyage = section?.querySelector('[data-insight-voyage]')
  const stage = section?.querySelector('[data-insight-stage]')
  const heading = section?.querySelector('.insight-section__title')
  const scene = section?.querySelector('[data-insight-scene]')
  if (!voyage || !stage || !heading || !scene) return () => {}

  const media = gsap.matchMedia()
  const artworkCache = new Map()
  const mobileArtwork = matchMedia('(max-width: 767px)')
  const staticLight = createShipwreckLight(mobileArtwork.matches)
  const staticLife = createMarineLife(mobileArtwork.matches)
  const staticBubbles = createInsightBubbles(mobileArtwork.matches)
  const staticSunrays = createInsightSunrays(mobileArtwork.matches)
  const staticMotes = createInsightMotes(mobileArtwork.matches)
  const staticImage = scene.querySelector('img')
  const updateStaticArtwork = () => {
    if (!staticImage?.complete || !staticImage.naturalWidth) return
    const mobile = new URL(staticImage.currentSrc, document.baseURI).pathname === SCENES.mobile
    staticLight.setMobile(mobile)
    staticLife.setMobile(mobile)
    staticBubbles.setMobile(mobile)
    staticSunrays.setMobile(mobile)
    staticMotes.setMobile(mobile)
    staticLight.element.style.removeProperty('visibility')
    staticLife.element.style.removeProperty('visibility')
    staticBubbles.element.style.removeProperty('visibility')
    staticSunrays.element.style.removeProperty('visibility')
    staticMotes.element.style.removeProperty('visibility')
  }
  staticLight.element.style.visibility = 'hidden'
  staticLife.element.style.visibility = 'hidden'
  staticBubbles.element.style.visibility = 'hidden'
  staticSunrays.element.style.visibility = 'hidden'
  staticMotes.element.style.visibility = 'hidden'
  scene.append(staticSunrays.element, staticMotes.element, staticBubbles.element, staticLight.element, staticLife.element)
  staticImage?.addEventListener('load', updateStaticArtwork)
  updateStaticArtwork()
  let disposed = false
  let refreshFrame = 0

  function preload(source) {
    if (!artworkCache.has(source)) {
      const image = new Image()
      image.src = source
      artworkCache.set(source, image.decode())
    }
    return artworkCache.get(source)
  }

  function refresh() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!disposed) ScrollTrigger.refresh()
    })
  }

  media.add('(prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-immersive')
    let active = true
    let timeline
    let exitFade
    let artworkRequest = 0
    let sizeObserver
    let layoutFrame = 0
    let sizeKey = ''
    const plane = section.closest('#app')?.querySelector('.ocean-transition')
    const originalPlaneOpacity = plane?.style.opacity ?? ''
    const state = { progress: 0 }
    const root = node('svg', {
      class: 'insight-section__portal', 'aria-hidden': 'true', focusable: 'false',
      preserveAspectRatio: 'none',
    })
    const definitions = node('defs')
    const mask = node('mask', {
      id: 'insight-ocean-letter-mask', maskUnits: 'userSpaceOnUse',
      maskContentUnits: 'userSpaceOnUse', style: 'mask-type:alpha',
    })
    const letters = node('g', { id: 'insight-ocean-glyphs', fill: '#fff', color: '#fff' })
    mask.append(node('use', { href: '#insight-ocean-glyphs' }))
    definitions.append(letters, mask)
    // One stationary illustration spans the text voyage and the final hold.
    const world = document.createElement('div')
    world.className = 'insight-section__ocean-world'
    world.setAttribute('aria-hidden', 'true')
    const water = document.createElement('img')
    water.alt = ''
    water.draggable = false
    const light = createShipwreckLight(mobileArtwork.matches)
    const life = createMarineLife(mobileArtwork.matches, true)
    const bubbles = createInsightBubbles(mobileArtwork.matches, true)
    const sunrays = createInsightSunrays(mobileArtwork.matches, true)
    const motes = createInsightMotes(mobileArtwork.matches, true)
    world.append(water, sunrays.element, motes.element, bubbles.element, light.element, life.element)
    const ink = node('image', {
      preserveAspectRatio: 'xMidYMid slice',
      mask: 'url(#insight-ocean-letter-mask)', class: 'insight-section__ocean-ink',
    })
    const luster = node('use', { href: '#insight-ocean-glyphs' })
    root.append(definitions, ink, luster)
    const measureContext = document.createElement('canvas').getContext('2d')
    let width = 0
    let height = 0
    let focus = { x: 0, y: 0 }
    let finalScale = 1

    async function selectArtwork() {
      const request = ++artworkRequest
      const source = mobileArtwork.matches ? SCENES.mobile : SCENES.desktop
      await preload(source)
      if (!active || disposed || request !== artworkRequest) return
      // A resize may cross the breakpoint during the initial image decode.
      if (source !== (mobileArtwork.matches ? SCENES.mobile : SCENES.desktop)) return selectArtwork()
      water.src = source
      ink.setAttribute('href', source)
      light.setMobile(mobileArtwork.matches)
      life.setMobile(mobileArtwork.matches)
      bubbles.setMobile(mobileArtwork.matches)
      sunrays.setMobile(mobileArtwork.matches)
      motes.setMobile(mobileArtwork.matches)
    }

    function queueArtwork() {
      selectArtwork().catch(() => {})
    }

    function render() {
      const progress = state.progress
      const zoom = smooth(.2, .86, progress)
      const scale = Math.exp(Math.log(finalScale) * zoom)
      const pan = smooth(0, 1, zoom)
      const x = focus.x + (width / 2 - focus.x) * pan
      const y = focus.y + (height / 2 - focus.y) * pan
      letters.setAttribute('transform', `translate(${x} ${y}) scale(${scale}) translate(${-focus.x} ${-focus.y})`)
      heading.style.opacity = `${1 - smooth(.14, .22, progress)}`
      ink.style.opacity = `${smooth(.02, .14, progress) * (1 - smooth(.86, .98, progress))}`
      world.style.opacity = `${smooth(.78, .88, progress)}`
      life.setActive(progress > .78)
      bubbles.setActive(progress > .78)
      sunrays.setActive(progress > .78)
      motes.setActive(progress > .78)
      luster.style.opacity = `${.2 * smooth(.02, .14, progress) * (1 - smooth(.4, .7, progress))}`
      if (plane) plane.style.opacity = `${1 - smooth(.08, .2, progress)}`
    }

    function measure() {
      if (!active || !measureContext) return
      width = stage.clientWidth
      height = stage.clientHeight
      const stageBox = stage.getBoundingClientRect()
      root.setAttribute('viewBox', `0 0 ${width} ${height}`)
      for (const element of [mask, ink]) {
        element.setAttribute('x', '0')
        element.setAttribute('y', '0')
        element.setAttribute('width', `${width}`)
        element.setAttribute('height', `${height}`)
      }
      letters.replaceChildren()
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
      let text
      let focused = false
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim() || text.parentElement.closest('.sr-only, svg')) continue
        const range = document.createRange()
        range.selectNodeContents(text)
        const bounds = range.getBoundingClientRect()
        const style = getComputedStyle(text.parentElement)
        const fontSize = parseFloat(style.fontSize)
        measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const metrics = measureContext.measureText(text.textContent)
        const baseline = bounds.top - stageBox.top + (metrics.fontBoundingBoxAscent ?? fontSize * .93)
        const x = bounds.left - stageBox.left
        const run = node('text', {
          x, y: baseline, 'font-family': style.fontFamily, 'font-size': fontSize,
          'font-weight': style.fontWeight, 'font-style': style.fontStyle,
          'letter-spacing': style.letterSpacing, 'xml:space': 'preserve',
        })
        run.textContent = text.textContent
        letters.append(run)
        if (!focused && text.textContent.trim() === 'INSIGHT') {
          const stem = measureContext.measureText('I')
          const stemWidth = Math.max(1, stem.actualBoundingBoxLeft + stem.actualBoundingBoxRight)
          focus = {
            x: x + (stem.actualBoundingBoxRight - stem.actualBoundingBoxLeft) / 2,
            y: baseline - stem.actualBoundingBoxAscent / 2,
          }
          finalScale = Math.max(width / (stemWidth * .72), height / Math.max(1, stem.actualBoundingBoxAscent * .75)) * 1.15
          focused = true
        }
      }
      heading.querySelectorAll('.insight-section__symbol').forEach(symbol => {
        const bounds = symbol.getBoundingClientRect()
        const shape = node('g', {
          transform: `translate(${bounds.left - stageBox.left} ${bounds.top - stageBox.top}) scale(${bounds.width / 200} ${bounds.height / 200})`,
          color: '#fff',
        })
        for (const path of symbol.children) shape.append(path.cloneNode(true))
        letters.append(shape)
      })
      if (!focused) {
        focus = { x: width / 2, y: heading.offsetHeight / 2 }
        finalScale = 360
      }
      section.style.setProperty('--insight-zoom-runway', `${Math.ceil(Math.max(height * 1.9, heading.offsetHeight * 2.2))}px`)
      sizeKey = `${width}:${height}:${heading.offsetWidth}:${heading.offsetHeight}`
      render()
    }

    Promise.all([document.fonts.ready, selectArtwork()]).then(async () => {
      if (!active || disposed) return
      // Fonts can finish after the viewport has crossed the artwork breakpoint.
      await selectArtwork()
      if (!active || disposed) return
      if (!measureContext) {
        cleanup()
        return
      }
      mobileArtwork.addEventListener('change', queueArtwork)
      section.prepend(world)
      stage.append(root)
      measure()
      timeline = gsap.to(state, {
        progress: 1, duration: 1, ease: 'none', onUpdate: render,
        scrollTrigger: {
          id: 'insight-ocean-zoom', trigger: voyage,
          start: 'top top', end: 'bottom bottom', scrub: .55,
          invalidateOnRefresh: true, onRefreshInit: measure, onRefresh: render,
        },
      })
      const shadeDeparture = trigger => {
        world.style.setProperty('--insight-exit-progress', `${smooth(0, 1, trigger.progress)}`)
      }
      exitFade = ScrollTrigger.create({
        id: 'insight-ocean-exit', trigger: scene,
        start: () => `bottom bottom+=${stage.clientHeight * .4}`,
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate: shadeDeparture, onRefresh: shadeDeparture,
      })
      sizeObserver = new ResizeObserver(() => {
        const next = `${stage.clientWidth}:${stage.clientHeight}:${heading.offsetWidth}:${heading.offsetHeight}`
        if (next === sizeKey) return
        cancelAnimationFrame(layoutFrame)
        layoutFrame = requestAnimationFrame(() => {
          if (!active) return
          measure()
          refresh()
        })
      })
      sizeObserver.observe(stage)
      sizeObserver.observe(heading)
      refresh()
    }).catch(() => {
      if (active) cleanup()
    })

    function cleanup() {
      active = false
      sizeObserver?.disconnect()
      cancelAnimationFrame(layoutFrame)
      timeline?.scrollTrigger?.kill()
      timeline?.kill()
      exitFade?.kill()
      artworkRequest++
      mobileArtwork.removeEventListener('change', queueArtwork)
      root.remove()
      life.destroy()
      bubbles.destroy()
      sunrays.destroy()
      motes.destroy()
      world.remove()
      section.classList.remove('is-immersive')
      section.style.removeProperty('--insight-zoom-runway')
      heading.style.removeProperty('opacity')
      if (plane) plane.style.opacity = originalPlaneOpacity
      refresh()
    }
    return cleanup
  })

  return () => {
    disposed = true
    media.revert()
    staticImage?.removeEventListener('load', updateStaticArtwork)
    staticLight.element.remove()
    staticLife.destroy()
    staticBubbles.destroy()
    staticSunrays.destroy()
    staticMotes.destroy()
    cancelAnimationFrame(refreshFrame)
  }
}
