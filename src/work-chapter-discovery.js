import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './work-chapter-discovery.css'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (from, to, value) => {
  const p = clamp((value - from) / (to - from))
  return p * p * (3 - 2 * p)
}

/** Only the room bridges a category and its work. The original gallery owns
 * every image, video and control; category screens contain no work previews. */
export function initWorkChapterDiscovery(root = document) {
  const records = []
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let active = true
  let frame = 0
  const configs = [
    ['#personal-projects-intro', '#personal-brand-gallery', '.brand-gallery__room'],
    ['#short-form-intro', '#short-form-contents', '.short-form__room'],
  ]
  for (const [selector, destination, roomSelector] of configs) {
    const chapter = root.querySelector(selector)
    const gallery = root.querySelector(destination)
    const galleryStage = gallery?.querySelector(':scope > .project-details__stage')
    const sourceRoom = gallery?.querySelector(roomSelector)
    const sourcePicture = sourceRoom?.querySelector('picture')
    if (!chapter || !galleryStage || !sourcePicture
      || chapter.parentElement !== gallery.parentElement || chapter.nextElementSibling !== gallery) continue

    const bridge = document.createElement('div')
    bridge.className = 'chapter-discovery-bridge'
    bridge.dataset.discoveryKind = chapter.dataset.workChapter
    const scene = document.createElement('div')
    scene.className = 'chapter-discovery__scene'
    scene.setAttribute('aria-hidden', 'true')
    scene.inert = true
    const room = document.createElement('div')
    room.className = 'chapter-discovery__room'
    const picture = sourcePicture.cloneNode(true)
    for (const image of picture.querySelectorAll('img')) {
      image.alt = ''
      image.loading = 'lazy'
      image.draggable = false
    }
    room.append(picture)
    scene.append(room)
    const route = chapter.querySelector('.work-route')
    const properties = ['--discovery-copy-shift', '--discovery-copy-opacity']
      .map(name => [name, chapter.style.getPropertyValue(name), chapter.style.getPropertyPriority(name)])
    records.push({ chapter, gallery, galleryStage, sourceRoom, bridge, scene, room, route,
      hadClass: chapter.classList.contains('has-chapter-discovery'),
      hadHandoff: gallery.classList.contains('has-discovery-handoff'),
      routeWasInert: route?.inert || false, properties, inkMask: '' })
    chapter.before(bridge)
    bridge.append(scene, chapter, gallery)
    chapter.classList.add('has-chapter-discovery')
    gallery.classList.add('has-discovery-handoff')
  }

  function schedule() {
    if (active && !frame) frame = requestAnimationFrame(render)
  }
  function render() {
    frame = 0
    if (!active) return
    const height = Math.max(1, innerHeight)
    for (const record of records) {
      const { chapter, gallery, bridge, room, route } = record
      const chapterBox = chapter.getBoundingClientRect()
      const galleryBox = gallery.getBoundingClientRect()
      const progress = clamp(1 - galleryBox.top / height)
      const moving = !reduced.matches
      const compact = innerWidth <= 767
      const copy = moving ? 1 - smooth(compact ? .30 : .48, compact ? .60 : .82, progress) : 1
      // Do not let invisible translated copy extend the document's overflow.
      const shift = moving ? Math.min(chapter.clientHeight, Math.max(0, -chapterBox.top)) : 0
      chapter.style.setProperty('--discovery-copy-shift', `${shift.toFixed(3)}px`)
      chapter.style.setProperty('--discovery-copy-opacity', String(copy))
      gallery.style.setProperty('--discovery-info-opacity', String(moving ? smooth(.72, .98, progress) : 1))
      if (route) route.inert = record.routeWasInert || (moving && copy < .001)
      const arrived = galleryBox.top <= 2
      gallery.classList.toggle('is-discovery-arriving', !arrived)
      bridge.dataset.discoveryState = arrived ? 'complete' : 'arriving'
      bridge.dataset.discoveryMotion = moving ? 'full' : 'reduced'
      bridge.dataset.discoveryProgress = progress.toFixed(4)
      const mask = record.sourceRoom.style.getPropertyValue('--ocean-ink-mask')
      if (mask !== record.inkMask) {
        record.inkMask = mask
        if (mask) room.style.setProperty('--discovery-ink-mask', mask)
        else room.style.removeProperty('--discovery-ink-mask')
      }
    }
  }
  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const record = records.find(item => item.chapter === entry.target)
      for (const image of record?.scene.querySelectorAll('img') || []) image.loading = 'eager'
      intersection.unobserve(entry.target)
    }
  }, { rootMargin: '100% 0px' })
  const resize = new ResizeObserver(schedule)
  for (const record of records) {
    intersection.observe(record.chapter)
    resize.observe(record.chapter)
    resize.observe(record.galleryStage)
    for (const image of record.scene.querySelectorAll('img')) image.addEventListener('load', schedule, { signal })
  }
  window.addEventListener('scroll', schedule, { passive: true, signal })
  window.addEventListener('resize', schedule, { passive: true, signal })
  reduced.addEventListener('change', schedule, { signal })
  ScrollTrigger.addEventListener('refresh', schedule)
  document.fonts?.ready.then(schedule)
  render()
  return () => {
    active = false
    controller.abort()
    intersection.disconnect()
    resize.disconnect()
    ScrollTrigger.removeEventListener('refresh', schedule)
    cancelAnimationFrame(frame)
    for (const record of records) {
      record.gallery.classList.remove('is-discovery-arriving')
      if (!record.hadHandoff) record.gallery.classList.remove('has-discovery-handoff')
      record.gallery.style.removeProperty('--discovery-info-opacity')
      if (record.route) record.route.inert = record.routeWasInert
      for (const [name, value, priority] of record.properties) {
        if (value) record.chapter.style.setProperty(name, value, priority)
        else record.chapter.style.removeProperty(name)
      }
      if (!record.hadClass) record.chapter.classList.remove('has-chapter-discovery')
      record.bridge.before(record.chapter, record.gallery)
      record.bridge.remove()
    }
  }
}
