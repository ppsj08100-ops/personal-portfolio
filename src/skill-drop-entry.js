import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const clamp = gsap.utils.clamp(0, 1)
const smooth = value => value * value * (3 - 2 * value)

// The anchors stay on the coral while the bubbles travel from the side currents.
export function initSkillDropEntry(scene, buttons) {
  const controller = new AbortController()
  const records = new Map()
  let disposed = false
  let refreshFrame = 0
  const hadEntryClass = scene.classList.contains('has-skill-side-entry')
  const originalProgress = scene.style.getPropertyValue('--skill-entry-progress')
  const originalPriority = scene.style.getPropertyPriority('--skill-entry-progress')
  scene.classList.add('has-skill-side-entry')

  function draw(record) {
    if (disposed) return
    const progress = record.forced ? 1 : smooth(clamp(record.motion.progress))
    const remaining = 1 - progress
    const current = Math.sin(progress * Math.PI)

    record.x(record.fromX * remaining)
    record.y(record.fromY * remaining + current * record.side * 5)
    record.rotation(record.side * 5 * remaining)
    record.scaleX(.94 + .06 * progress)
    record.scaleY(.94 + .06 * progress)
    record.opacity(1)
    record.button.classList.toggle('is-skill-arriving', progress < .999)
    record.button.dataset.skillArrival = progress >= .999 ? 'settled' : record.side < 0 ? 'left' : 'right'
    if (record.index === 0) scene.style.setProperty('--skill-entry-progress', progress.toFixed(4))
  }

  function measure() {
    if (disposed) return
    const sceneRect = scene.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const rails = { left: [], right: [] }

    records.forEach(record => {
      const rect = record.anchor.getBoundingClientRect()
      const normalizedX = (rect.left - sceneRect.left) / Math.max(sceneRect.width, 1)
      const side = viewportWidth < 768
        ? record.index % 2 ? 1 : -1
        : normalizedX < .43 ? -1 : normalizedX > .57 ? 1 : record.index % 2 ? 1 : -1
      record.side = side
      record.targetX = rect.left
      record.targetY = rect.top + window.scrollY
      record.width = record.button.offsetWidth
      record.height = record.button.offsetHeight
      rails[side < 0 ? 'left' : 'right'].push(record)
    })

    Object.values(rails).forEach(rail => {
      const distance = record => record.side < 0 ? record.targetX : viewportWidth - record.targetX
      const distances = rail.map(distance)
      const minimum = Math.min(...distances)
      const spread = Math.max(1, Math.max(...distances) - minimum)
      const previousInLane = new Map()
      rail.sort((a, b) => a.targetY - b.targetY || a.index - b.index).forEach(record => {
        // Keep the lane order consistent with destination order so adjacent
        // bubbles do not cross each other on the way into the same coral.
        record.lane = Math.min(2, Math.floor((distance(record) - minimum) / spread * 3))
        const inset = Math.max(14, Math.min(32, viewportWidth * .025)) + record.width / 2
        const laneInset = Math.min(record.lane * record.width * .96, Math.max(0, viewportWidth * .43 - inset))
        const railX = record.side < 0 ? inset + laneInset : viewportWidth - inset - laneInset
        record.fromX = railX - record.targetX
        record.fromY = 0
        const previous = previousInLane.get(record.lane)
        if (previous && record.targetY - previous.targetY < record.height * .9) {
          previous.fromY = -20
          record.fromY = 20
        }
        previousInLane.set(record.lane, record)
      })
      rail.forEach(draw)
    })
  }

  function finish(button) {
    const record = records.get(button)
    if (!record || disposed) return
    record.forced = true
    draw(record)
  }

  function scheduleRefresh() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      if (disposed) return
      ScrollTrigger.refresh()
    })
  }

  buttons.forEach((button, index) => {
    const anchor = document.createElement('span')
    anchor.className = 'skill-drop-anchor'
    anchor.dataset.skillAnchor = button.dataset.skill
    anchor.setAttribute('aria-hidden', 'true')
    Object.assign(anchor.style, {
      position: 'absolute',
      left: 'var(--drop-x)',
      top: 'var(--drop-y)',
      width: '0px',
      height: '0px',
      pointerEvents: 'none',
    })
    anchor.style.setProperty('--drop-x', button.style.getPropertyValue('--drop-x'))
    anchor.style.setProperty('--drop-y', button.style.getPropertyValue('--drop-y'))
    button.parentElement.append(anchor)

    const saved = ['transform', 'opacity'].map(property => ({
      property,
      value: button.style.getPropertyValue(property),
      priority: button.style.getPropertyPriority(property),
    }))
    const record = {
      button, anchor, index, saved,
      motion: { progress: 0 },
      forced: false,
      side: index % 2 ? 1 : -1,
      fromX: 0,
      fromY: 0,
      x: gsap.quickSetter(button, 'x', 'px'),
      y: gsap.quickSetter(button, 'y', 'px'),
      rotation: gsap.quickSetter(button, 'rotation', 'deg'),
      scaleX: gsap.quickSetter(button, 'scaleX'),
      scaleY: gsap.quickSetter(button, 'scaleY'),
      opacity: gsap.quickSetter(button, 'opacity'),
    }
    // Keep CSS's centre anchor explicit; x/y are the travel offsets only.
    gsap.quickSetter(button, 'xPercent')(-50)
    gsap.quickSetter(button, 'yPercent')(-50)
    records.set(button, record)
  })

  measure()
  ScrollTrigger.addEventListener('refreshInit', measure)

  records.forEach(record => {
    record.tween = gsap.fromTo(record.motion, { progress: 0 }, {
      progress: 1,
      duration: 1,
      ease: 'none',
      immediateRender: false,
      onUpdate: () => draw(record),
      scrollTrigger: {
        trigger: record.anchor,
        start: 'top 92%',
        end: 'top 50%',
        scrub: .6,
      },
    })
  })
  finish(document.activeElement)

  window.addEventListener('resize', scheduleRefresh, { signal: controller.signal })
  document.fonts?.addEventListener('loadingdone', scheduleRefresh, { signal: controller.signal })
  document.fonts?.ready.then(() => {
    if (!disposed) scheduleRefresh()
  })

  return {
    finish,
    destroy() {
      disposed = true
      controller.abort()
      cancelAnimationFrame(refreshFrame)
      ScrollTrigger.removeEventListener('refreshInit', measure)
      records.forEach(record => {
        record.tween.scrollTrigger?.kill()
        record.tween.kill()
        record.button.classList.remove('is-skill-arriving')
        delete record.button.dataset.skillArrival
        record.saved.forEach(({ property, value, priority }) => {
          if (value) record.button.style.setProperty(property, value, priority)
          else record.button.style.removeProperty(property)
        })
        // Reparse the restored CSS transform if this media query is enabled again.
        if (record.button._gsap) record.button._gsap.uncache = 1
        record.anchor.remove()
      })
      records.clear()
      if (!hadEntryClass) scene.classList.remove('has-skill-side-entry')
      if (originalProgress) scene.style.setProperty('--skill-entry-progress', originalProgress, originalPriority)
      else scene.style.removeProperty('--skill-entry-progress')
    },
  }
}
