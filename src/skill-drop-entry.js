import { gsap } from 'gsap'

// Observe stationary landing points so a travelling bubble cannot trigger itself.
export function initSkillDropEntry(scene, buttons) {
  const controller = new AbortController()
  let disposed = false
  let resizeFrame = 0
  const records = new Map()
  const byAnchor = new Map()

  function clear(record) {
    record.button.classList.remove('is-skill-arriving')
    gsap.set(record.button, { clearProps: 'transform,opacity' })
    gsap.set(record.label, { clearProps: 'opacity' })
  }
  function finish(button) {
    const record = records.get(button)
    if (!record || record.done) return
    record.done = true
    record.timeline?.kill()
    record.timeline = null
    observer.unobserve(record.anchor)
    clear(record)
  }

  function measure(record) {
    const rock = record.button.offsetParent
    const targetX = rock.getBoundingClientRect().left + record.button.offsetLeft
    const side = targetX < innerWidth / 2 ? -1 : 1
    const inset = Math.max(18, record.button.offsetWidth / 2 + 6)
    record.fromX = (side < 0 ? inset : innerWidth - inset) - targetX
    record.fromY = 24 + record.index % 4 * 9
    record.curveY = (record.index % 2 ? -1 : 1) * (28 + record.index % 3 * 12)
    record.side = side
  }
  function draw(record, p) {
    const remaining = 1 - p
    const bow = Math.sin(p * Math.PI)
    record.x(remaining * remaining * record.fromX + 2 * remaining * p * record.fromX * .32)
    record.y(remaining * remaining * record.fromY + 2 * remaining * p * record.curveY)
    record.scaleX(.86 + .14 * p + .18 * bow)
    record.scaleY(.86 + .14 * p - .065 * bow)
    record.rotation(-record.side * remaining * 7)
    record.opacity(.24 + .76 * Math.min(1, p * 3))
  }
  function park(record) {
    measure(record)
    gsap.set(record.button, { xPercent: -50, yPercent: -50, x: 0, y: 0 })
    gsap.set(record.label, { opacity: 0 })
    record.button.classList.add('is-skill-arriving')
    draw(record, 0)
  }
  function arrive(record, order) {
    if (disposed || record.started || record.done) return
    record.started = true
    observer.unobserve(record.anchor)
    measure(record)
    const state = { p: 0 }
    record.timeline = gsap.timeline({
      delay: Math.min(order, 7) * .032,
      onComplete: () => finish(record.button),
    }).to(state, {
      p: 1, duration: .68, ease: 'power3.out',
      onUpdate: () => draw(record, state.p),
    }, 0).to(record.label, { opacity: 1, duration: .23, ease: 'sine.out' }, .36)
    if (document.hidden) record.timeline.pause()
  }

  const observer = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
      .forEach((entry, order) => arrive(byAnchor.get(entry.target), order))
  }, { rootMargin: '0px 0px -55px 0px' })

  buttons.forEach((button, index) => {
    const anchor = document.createElement('span')
    anchor.className = 'skill-drop-anchor'
    anchor.setAttribute('aria-hidden', 'true')
    anchor.style.left = button.style.getPropertyValue('--drop-x')
    anchor.style.top = button.style.getPropertyValue('--drop-y')
    button.parentElement.append(anchor)
    const record = {
      button, index, anchor, label: button.lastElementChild,
      done: false, started: false, timeline: null,
      x: gsap.quickSetter(button, 'x', 'px'),
      y: gsap.quickSetter(button, 'y', 'px'),
      scaleX: gsap.quickSetter(button, 'scaleX'),
      scaleY: gsap.quickSetter(button, 'scaleY'),
      rotation: gsap.quickSetter(button, 'rotation', 'deg'),
      opacity: gsap.quickSetter(button, 'opacity'),
    }
    records.set(button, record)
    byAnchor.set(anchor, record)
    park(record)
    observer.observe(anchor)
  })
  finish(document.activeElement)

  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (disposed) return
      records.forEach(record => {
        if (record.done) return
        if (record.started) finish(record.button)
        else park(record)
      })
    })
  }, { signal: controller.signal })
  document.addEventListener('visibilitychange', () => {
    records.forEach(record => {
      if (record.started && !record.done) record.timeline?.paused(document.hidden)
    })
  }, { signal: controller.signal })

  return {
    finish,
    destroy() {
      disposed = true
      observer.disconnect()
      controller.abort()
      cancelAnimationFrame(resizeFrame)
      records.forEach(record => {
        record.timeline?.kill()
        clear(record)
        record.anchor.remove()
      })
      records.clear()
      byAnchor.clear()
    },
  }
}
