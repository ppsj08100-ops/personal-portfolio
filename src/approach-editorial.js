import { gsap } from 'gsap'
import { createApproachIdleSwim } from './approach-idle-swim.js'
import { SWIM_ENVELOPES } from './approach-swim-bounds.js'

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const mix = (from, to, amount) => from + (to - from) * amount
const smooth = (from, to, value) => {
  const amount = clamp((value - from) / (to - from))
  return amount * amount * (3 - 2 * amount)
}
const ORIGINS = [
  { letter: 0, name: 'O', x: .5, y: .52, head: [.90, .20], direction: 1, duration: 1.15 },
  { letter: 6, name: 'E', x: .72, y: .68, head: [.10, .33], direction: -1, duration: 1.42 },
  { letter: 0, name: 'R', x: .52, y: .28, head: [.61, .30], direction: 1, duration: 1.20 },
]
const PAINTED_BOUNDS = [
  [.021, .078, .979, .968],
  [.059896, .112305, .958984, .882813],
  [.0625, .1094, .9531, .9297],
]
const FISH = [
  { head: [.10, .33], delay: 0, duration: 1.04, arc: -6 },
  { head: [.50, .50], delay: .12, duration: 1.03, arc: 4 },
  { head: [.34, .76], delay: .24, duration: .99, arc: 10 },
]
const fullCopy = () => ({ copyWeights: [1, 1, 1] })
const glideAt = (progress, kind = 0) => {
  const t = smooth(0, .86, progress)
  // A fin stroke supplies a little forward impulse, followed by a longer coast.
  return clamp(t + Math.sin(progress * Math.PI * 2 * (kind === 2 ? .8 : 1.15) - .7)
    * Math.sin(t * Math.PI) ** 2 * .022)
}

/** Each animal emerges from its letter once its chapter is in view. */
export function createApproachEditorial(section, { onFrame } = {}) {
  const art = section?.querySelector('[data-approach-art]')
  if (!art) return { setProgress: fullCopy, refresh: fullCopy, destroy() {} }
  const studies = [...art.querySelectorAll('[data-approach-study]')]
  const displays = [...section.querySelectorAll('[data-approach-display]')]
  const fronts = [...section.querySelectorAll('[data-approach-front]')]
  const composition = art.closest('.design-process__composition') || art.parentElement
  const centers = [...section.querySelectorAll('[data-approach-scene]')].map(scene => scene.querySelector('.design-process__center'))
  const originalStyles = new Map()
  function write(element, property, value) {
    if (!originalStyles.has(element)) originalStyles.set(element, new Map())
    const properties = originalStyles.get(element)
    if (!properties.has(property)) properties.set(property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)])
    element.style.setProperty(property, value)
  }
  function restoreProperty(element, property) {
    const [value, priority] = originalStyles.get(element)?.get(property) || ['', '']
    if (value) element.style.setProperty(property, value, priority)
    else element.style.removeProperty(property)
  }
  const dataKeys = ['editorialProgress', 'editorialStudy', 'editorialMotion', 'editorialPhase',
    'editorialWordFocus', 'editorialEntry', 'editorialOrigin', 'editorialOriginX', 'editorialOriginY',
    'editorialFish0', 'editorialFish1', 'editorialFish2']
  const originalData = dataKeys.map(key => [key, section.dataset[key]])
  const listeners = new AbortController()
  const { signal } = listeners
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  const actors = ORIGINS.map(() => ({ q: 0, fade: 0, shown: 0 }))
  let swimmer, entryTimeline, measureContext
  let currentStudy = -1, currentWeight = 0, wordOwner = -1, syncingMotion = false
  let disposed = false, onScreen = false, mostlyInView = false, progress = 0
  let focusTimer = 0, focusSettled = true, entryStarted = false
  let measurements = []
  try { measureContext = document.createElement('canvas').getContext('2d') } catch { /* Element bounds remain a safe fallback. */ }

  function firstTextNode(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node && !/\S/.test(node.textContent)) node = walker.nextNode()
    return node
  }
  function glyphInk(element, fontStyle, compositionRect, shiftX = 0) {
    const bounds = element.getBoundingClientRect()
    const fallback = {
      left: bounds.left - compositionRect.left - shiftX,
      top: bounds.top - compositionRect.top,
      right: bounds.right - compositionRect.left - shiftX,
      bottom: bounds.bottom - compositionRect.top,
    }
    if (!measureContext) return fallback
    try {
      measureContext.font = `${fontStyle.fontStyle} ${fontStyle.fontWeight} ${fontStyle.fontSize} ${fontStyle.fontFamily}`
      const glyphs = [...element.querySelectorAll('.design-process__letter')]
      const text = glyphs.length ? glyphs.map(glyph => glyph.textContent).join('') : element.textContent.trim()
      const metrics = measureContext.measureText(text)
      const textNode = firstTextNode(element)
      if (!textNode || !Number.isFinite(metrics.fontBoundingBoxAscent)
        || !Number.isFinite(metrics.actualBoundingBoxAscent) || !Number.isFinite(metrics.actualBoundingBoxDescent)) return fallback
      const range = document.createRange()
      range.selectNodeContents(textNode)
      const textRect = range.getBoundingClientRect()
      const baseline = textRect.top - compositionRect.top + metrics.fontBoundingBoxAscent
      return {
        left: textRect.left - compositionRect.left - shiftX - (metrics.actualBoundingBoxLeft || 0),
        right: textRect.left - compositionRect.left - shiftX + (metrics.actualBoundingBoxRight || bounds.width),
        top: baseline - metrics.actualBoundingBoxAscent,
        bottom: baseline + metrics.actualBoundingBoxDescent,
      }
    } catch { return fallback }
  }
  function currentShift(display) {
    const word = display.firstElementChild
    if (!word) return 0
    const transform = getComputedStyle(word).transform
    if (!transform || transform === 'none') return 0
    try { return new DOMMatrixReadOnly(transform).m41 } catch { return 0 }
  }
  function measure() {
    const rootStyle = getComputedStyle(section)
    const viewportHeight = window.innerHeight
    const nativeMinimum = parseFloat(rootStyle.getPropertyValue('--native-scene-min')) || 640
    const logicalHeight = section.classList.contains('is-pinned') && !reduced.matches
      ? viewportHeight : Math.max(viewportHeight, nativeMinimum)
    const gap = parseFloat(rootStyle.getPropertyValue('--poster-copy-gap')) || 0
    const compositionRect = composition.getBoundingClientRect()
    const artRect = art.getBoundingClientRect()
    const width = art.clientWidth || art.offsetWidth
    const height = art.clientHeight || art.offsetHeight
    const artLeft = artRect.left - compositionRect.left
    const artTop = art.offsetTop
    const preferredScale = window.innerWidth >= 900 ? .9 : 1
    measurements = ORIGINS.map((origin, index) => {
      const idleEnvelope = reduced.matches ? 0 : SWIM_ENVELOPES[index]
      const study = studies.find(element => Number(element.dataset.approachStudy) === index)
      const image = study?.querySelector('img')
      const alpha = PAINTED_BOUNDS[index]
      const imageWidth = image?.offsetWidth || width
      const imageHeight = image?.offsetHeight || imageWidth * 2 / 3
      const imageLeft = (study?.offsetLeft || 0) + (image?.offsetLeft || 0)
      const imageTop = (study?.offsetTop || 0) + (image?.offsetTop || 0)
      const localTop = imageTop + alpha[1] * imageHeight
      const paintedHeight = Math.max(1, (alpha[3] - alpha[1]) * imageHeight)
      const localCx = imageLeft + (alpha[0] + alpha[2]) * imageWidth / 2
      const localCy = localTop + paintedHeight / 2
      const headX = imageLeft + origin.head[0] * imageWidth
      const headY = imageTop + origin.head[1] * imageHeight
      const display = displays.find(element => Number(element.dataset.approachDisplay) === index)
      const fontStyle = getComputedStyle(display)
      const shift = currentShift(display)
      const ink = glyphInk(display, fontStyle, compositionRect, shift)
      const glyph = display.querySelectorAll('.design-process__letter')[origin.letter] || display
      const letter = glyphInk(glyph, fontStyle, compositionRect, shift)
      const originX = mix(letter.left, letter.right, origin.x)
      const originY = mix(letter.top, letter.bottom, origin.y)
      const typeSize = parseFloat(fontStyle.fontSize) || 160
      const copyHeight = centers[index]?.offsetHeight || 0
      const available = logicalHeight - 40 - copyHeight - gap - ink.bottom - 12
      const scale = Math.max(.05, Math.min(preferredScale, available / (paintedHeight + idleEnvelope * 2)))
      const motionSpace = idleEnvelope * scale
      const parkY = ink.bottom + 12 + motionSpace - artTop - scale * localTop
      const copyTop = ink.bottom + 12 + scale * paintedHeight + motionSpace * 2 + gap
      write(section, `--study-${index}-copy-top`, `${copyTop.toFixed(3)}px`)
      const endX = artLeft + width / 2 + scale * (headX - width / 2)
      const endY = artTop + parkY + scale * headY
      return {
        width, height, imageWidth, imageHeight, imageLeft, imageTop, artLeft, artTop, localCx, localCy, headX, headY, scale, parkY, originX, originY, endX, endY,
        painted: [imageLeft + alpha[0] * imageWidth, localTop, imageLeft + alpha[2] * imageWidth, localTop + paintedHeight],
        controlX: mix(originX, endX, .6) + origin.direction * Math.min(width * .08, 30),
        controlY: mix(originY, endY, .12) - height * .03,
        focusBlur: Math.min(6, typeSize * .035), focusDrift: 0,
      }
    })
  }

  function headPath(geometry, q, kind, endX = geometry.endX, endY = geometry.endY, arc = 0) {
    const travel = glideAt(q, kind), t = 1 - travel
    const controlX = mix(geometry.originX, endX, .54) + ORIGINS[kind].direction * Math.min(geometry.width * .025, 12)
    const controlY = mix(geometry.originY, endY, .40) + arc - geometry.height * .008
    return {
      x: t * t * geometry.originX + 2 * t * travel * controlX + travel * travel * endX,
      y: t * t * geometry.originY + 2 * t * travel * controlY + travel * travel * endY,
      travel,
    }
  }

  function fishPaths(geometry, q) {
    const seconds = q * ORIGINS[1].duration
    const paths = FISH.map((fish, index) => {
      const started = seconds >= fish.delay
      const entry = clamp((seconds - fish.delay) / fish.duration)
      const localX = geometry.imageLeft + fish.head[0] * geometry.imageWidth
      const localY = geometry.imageTop + fish.head[1] * geometry.imageHeight
      const endX = geometry.artLeft + geometry.width / 2 + geometry.scale * (localX - geometry.width / 2)
      const endY = geometry.artTop + geometry.parkY + geometry.scale * localY
      const path = headPath(geometry, entry, 1, endX, endY, fish.arc)
      section.dataset[`editorialFish${index}`] = (started ? entry : -1).toFixed(4)
      return { ...path, endX, endY, entry: started ? entry : -1 }
    })
    const common = { x: paths[0].x - paths[0].endX, y: paths[0].y - paths[0].endY }
    return {
      x: common.x, y: geometry.parkY + common.y,
      fish: paths.map(path => ({
        x: (path.x - path.endX - common.x) / geometry.scale,
        y: (path.y - path.endY - common.y) / geometry.scale,
        turn: -4 * Math.sin(path.travel * Math.PI),
        progress: path.entry,
      })),
    }
  }

  function autoFrame() {
    if (disposed) return
    const frame = render()
    onFrame?.(frame)
  }
  function selectStudy(index, replay = false) {
    if (index === currentStudy && !replay) return
    entryTimeline?.kill()
    entryTimeline = null
    currentStudy = index
    entryStarted = false
    if (reduced.matches) {
      actors.forEach((actor, order) => { actor.q = 1; actor.fade = actor.shown = Number(order === index) })
      return
    }
    const oldVisible = actors.some((actor, order) => order !== index && actor.shown > .5 && actor.fade > .0001)
    actors[index].q = 0
    actors[index].fade = 1
    actors[index].shown = Number(!oldVisible)
    entryTimeline = gsap.timeline({ paused: true, onUpdate: autoFrame, onComplete: autoFrame })
    actors.forEach((actor, order) => {
      if (order !== index) entryTimeline.to(actor, { fade: 0, duration: .04, ease: 'power1.out' }, 0)
    })
    if (oldVisible) entryTimeline.set(actors[index], { shown: 1 }, .04)
    entryTimeline.to(actors[index], { q: 1, duration: ORIGINS[index].duration, ease: 'none' }, .04)
  }

  function renderWords(orbit) {
    const owner = Math.round(orbit)
    const changed = owner !== wordOwner
    const committed = []
    for (const element of [...displays, ...fronts]) {
      const study = Number(element.dataset.approachDisplay ?? element.dataset.approachFront)
      const distance = study - orbit
      const focus = reduced.matches || focusSettled ? 0 : smooth(0, .5, Math.abs(distance))
      const weight = study === owner ? mix(1, .24, focus) : 0
      if (changed && study === owner) {
        write(element, 'transition', 'none')
        committed.push(element)
      }
      write(element, '--display-current', '0px')
      write(element, '--display-blur', `${(focus * (measurements[study]?.focusBlur || 0)).toFixed(3)}px`)
      write(element, 'opacity', weight.toFixed(5))
      write(element, 'visibility', study === owner ? 'visible' : 'hidden')
    }
    if (committed.length) {
      // Commit the new word at a visible opacity before restoring its CSS settling.
      getComputedStyle(committed[0]).opacity
      committed.forEach(element => restoreProperty(element, 'transition'))
    }
    wordOwner = owner
    section.dataset.editorialWordFocus = reduced.matches || focusSettled ? 'settled' : 'underwater'
  }

  function render() {
    if (disposed) return fullCopy()
    const continuous = smooth(.22, .44, progress) + smooth(.55, .77, progress)
    const orbit = reduced.matches ? Math.round(continuous) : continuous
    const selected = Math.round(orbit)
    selectStudy(selected)
    if (reduced.matches) {
      entryTimeline?.kill()
      entryTimeline = null
      actors.forEach((actor, index) => { actor.q = 1; actor.fade = actor.shown = Number(index === selected) })
    }
    currentWeight = 0
    const copyWeights = reduced.matches || !section.classList.contains('is-pinned')
      ? [1, 1, 1] : actors.map((actor, index) => smooth(index === 1 ? .83 : .75, 1, actor.q) * actor.fade)
    for (const element of studies) {
      const study = Number(element.dataset.approachStudy)
      const geometry = measurements[study], origin = ORIGINS[study], actor = actors[study]
      if (!geometry || !actor) continue
      const scale = geometry.scale
      let x, y, turn = 0, fish
      if (study === 1) {
        const school = fishPaths(geometry, actor.q)
        x = school.x
        y = school.y
        fish = school.fish
      } else {
        const path = headPath(geometry, actor.q, study)
        turn = -origin.direction * (study === 2 ? 3 : 5) * (1 - path.travel)
          + Math.sin(path.travel * Math.PI) * (study === 2 ? 2 : 1)
        const radians = turn * Math.PI / 180
        const localX = scale * (geometry.headX - geometry.width / 2), localY = scale * geometry.headY
        x = path.x - geometry.artLeft - geometry.width / 2 - (Math.cos(radians) * localX - Math.sin(radians) * localY)
        y = path.y - geometry.artTop - (Math.sin(radians) * localX + Math.cos(radians) * localY)
      }
      const weight = actor.fade
      write(element, '--study-x', `${x.toFixed(3)}px`)
      write(element, '--study-y', `${y.toFixed(3)}px`)
      write(element, '--study-turn', `${turn.toFixed(3)}deg`)
      write(element, '--study-scale', scale.toFixed(5))
      write(element, '--study-drift-x', '0px')
      write(element, 'opacity', weight.toFixed(5))
      write(element, 'visibility', actor.shown > .5 && weight > .0001 ? 'visible' : 'hidden')
      if (study === selected) swimmer?.setEntrance?.({ progress: actor.q, fish })
      if (study === selected) currentWeight = actor.shown > .5 ? weight : 0
    }
    renderWords(orbit)
    const active = actors[selected]
    section.dataset.editorialProgress = progress.toFixed(4)
    section.dataset.editorialStudy = String(selected)
    section.dataset.editorialEntry = active.q.toFixed(4)
    section.dataset.editorialOrigin = ORIGINS[selected].name
    section.dataset.editorialOriginX = measurements[selected]?.originX.toFixed(3) || '0'
    section.dataset.editorialOriginY = measurements[selected]?.originY.toFixed(3) || '0'
    section.dataset.editorialPhase = reduced.matches ? 'hold' : !entryStarted ? 'waiting'
      : active.q < .2 ? 'emerge' : active.q < .82 ? 'glide' : active.q < 1 ? 'copy' : 'hold'
    syncMotion()
    return { copyWeights }
  }

  function syncMotion() {
    if (disposed || syncingMotion) return
    syncingMotion = true
    try {
      const allowed = onScreen && !document.hidden && !menu?.open && !document.body.classList.contains('has-menu-open')
      if (entryTimeline && !reduced.matches) {
        if (allowed && (entryStarted || mostlyInView)) {
          if (!entryStarted) { entryStarted = true; entryTimeline.play(0) }
          else if (entryTimeline.paused()) entryTimeline.resume()
        } else if (!entryTimeline.paused()) entryTimeline.pause()
      }
      const enabled = !reduced.matches
      const running = enabled && allowed && currentWeight > .0001
      swimmer?.setEnabled(enabled)
      swimmer?.setActive(currentStudy)
      swimmer?.setRunning(running)
      section.dataset.editorialMotion = !enabled ? 'reduced' : swimmer?.ready ? running ? 'running' : 'paused' : 'static'
    } finally { syncingMotion = false }
  }
  function refresh() {
    if (disposed) return fullCopy()
    if (reduced.matches) {
      clearTimeout(focusTimer)
      focusTimer = 0
      focusSettled = true
    }
    measure()
    swimmer?.refresh()
    return render()
  }

  const intersection = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1]
    const wasOnScreen = onScreen
    onScreen = Boolean(entry?.isIntersecting && entry.intersectionRatio > .01)
    mostlyInView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= .85)
    // Prepare a completed replay while it is offscreen, so no parked animal
    // flashes briefly before the next 85%-visible entrance begins.
    if (wasOnScreen && !onScreen && actors[currentStudy]?.q >= 1 && !reduced.matches) {
      selectStudy(currentStudy, true)
      render()
    }
    syncMotion()
  }, { threshold: [0, .01, .85, 1] })
  intersection.observe(composition)
  const menuObserver = new MutationObserver(syncMotion)
  menuObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  if (menu) menuObserver.observe(menu, { attributes: true, attributeFilter: ['open'] })
  document.addEventListener('visibilitychange', syncMotion, { signal })
  reduced.addEventListener('change', refresh, { signal })
  menu?.addEventListener('toggle', syncMotion, { signal })
  swimmer = createApproachIdleSwim(art, { onStateChange: syncMotion })
  refresh()
  return {
    setProgress(value) {
      if (disposed) return fullCopy()
      const next = clamp(value)
      if (!reduced.matches && Math.abs(next - progress) > .000001) {
        focusSettled = false
        clearTimeout(focusTimer)
        focusTimer = setTimeout(() => {
          focusTimer = 0
          if (disposed) return
          focusSettled = true
          const orbit = smooth(.22, .44, progress) + smooth(.55, .77, progress)
          renderWords(orbit)
        }, 180)
      }
      progress = next
      return render()
    },
    refresh,
    destroy() {
      if (disposed) return
      disposed = true
      clearTimeout(focusTimer)
      entryTimeline?.kill()
      listeners.abort()
      intersection.disconnect()
      menuObserver.disconnect()
      swimmer?.destroy()
      for (const [element, properties] of originalStyles) {
        for (const [property, [value, priority]] of properties) {
          if (value) element.style.setProperty(property, value, priority)
          else element.style.removeProperty(property)
        }
      }
      for (const [key, value] of originalData) {
        if (value === undefined) delete section.dataset[key]
        else section.dataset[key] = value
      }
    },
  }
}
