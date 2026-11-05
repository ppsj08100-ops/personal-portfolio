import { gsap } from 'gsap'

const motionProperties = ['--projector-lens', '--projector-beam', '--projector-picture', '--projector-rise']
const geometryProperties = ['--beam-origin-x', '--beam-origin-y', '--beam-screen-x', '--beam-screen-top', '--beam-screen-bottom', '--beam-screen-right']

/** Reveal each projection once it becomes the visible, active film. */
export function initShortFormProjector(section) {
  if (!section) return () => {}
  const scenes = [...section.querySelectorAll('[data-projector-scene]')]
  if (!scenes.length) return () => {}

  const document = section.ownerDocument
  const view = document.defaultView
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)')
  const mobileRoom = view.matchMedia('(max-width: 760px)')
  const events = new AbortController()
  const { signal } = events
  const originalPlaying = section.getAttribute('data-projector-playing')
  const roomImage = section.querySelector('.short-form__room img')
  let disposed = false
  let measureFrame = 0

  const records = scenes.map((scene, index) => {
    const film = scene.closest('[data-short-film]')
    const video = scene.querySelector('video')
    const beam = scene.querySelector('.short-form__beam')
    const light = beam?.querySelector('[data-projector-light]')
    const projector = scene.querySelector('.short-form__projector')
    const record = {
      scene, film, video, index: Number(film?.dataset.shortIndex ?? index),
      projection: scene.querySelector('.short-form__projection') || scene,
      projector,
      lens: scene.querySelector('.short-form__lens'),
      beam, light,
      image: scene.querySelector('.short-form__projector img'),
      visible: false, active: false, timeline: null,
      originalState: scene.getAttribute('data-projector-state'),
      originalViewBox: beam?.getAttribute('viewBox'),
      originalLightPath: light?.getAttribute('d'),
      originalMarkerStyles: ['left', 'top'].map(property =>
        [property, projector?.style.getPropertyValue(property), projector?.style.getPropertyPriority(property)]),
      originalStyles: [...motionProperties, ...geometryProperties].map(property =>
        [property, scene.style.getPropertyValue(property), scene.style.getPropertyPriority(property)]),
    }
    record.timeline = gsap.timeline({ paused: true,
      onStart: () => { if (!disposed) scene.dataset.projectorState = 'lighting' },
      onComplete: () => { if (!disposed) scene.dataset.projectorState = 'revealed' },
    })
      .to(scene, { '--projector-lens': 1, duration: .25, ease: 'sine.out' }, 0)
      .call(() => { if (!disposed) scene.dataset.projectorState = 'beam' }, [], .2)
      .to(scene, { '--projector-beam': 1, duration: .62, ease: 'power2.out' }, .2)
      .call(() => { if (!disposed) scene.dataset.projectorState = 'picture' }, [], .62)
      .to(scene, { '--projector-picture': 1, '--projector-rise': '0px', duration: .55, ease: 'sine.out' }, .62)
    return record
  })

  function setState(record, shown) {
    record.timeline.pause(0)
    gsap.set(record.scene, {
      '--projector-lens': shown ? 1 : 0,
      '--projector-beam': shown ? 1 : 0,
      '--projector-picture': shown ? 1 : 0,
      '--projector-rise': shown ? '0px' : '10px',
    })
    record.scene.dataset.projectorState = shown ? 'revealed' : 'waiting'
  }

  function sync() {
    if (disposed) return
    const current = Number(section.dataset.projectPageIndex ?? section.dataset.shortFormIndex) || 0
    const blocked = document.hidden || document.body.classList.contains('has-menu-open')
      || !!document.querySelector('dialog[open]')
    let playing = false
    for (const record of records) {
      const available = record.index === current && record.visible && !blocked
        && !record.scene.closest('[inert], [hidden]')
      if (available !== record.active) {
        record.active = available
        if (reduced.matches) setState(record, true)
        else if (available) record.timeline.restart()
        else setState(record, false)
      }
      if (available && record.video && !record.video.paused && !record.video.ended) playing = true
    }
    const next = String(playing)
    if (section.dataset.projectorPlaying !== next) section.dataset.projectorPlaying = next
  }

  function measure() {
    measureFrame = 0
    if (disposed) return
    let roomLens = null
    if (roomImage) {
      const room = roomImage.getBoundingClientRect()
      const sourceWidth = roomImage.naturalWidth || Number(roomImage.getAttribute('width'))
      const sourceHeight = roomImage.naturalHeight || Number(roomImage.getAttribute('height'))
      if (room.width > 0 && room.height > 0 && sourceWidth > 0 && sourceHeight > 0) {
        const scale = Math.max(room.width / sourceWidth, room.height / sourceHeight)
        const width = sourceWidth * scale, height = sourceHeight * scale
        const mobileX = mobileRoom.matches ? Number.parseFloat(section.dataset.projectorRoomMobileLensX) : NaN
        const mobileY = mobileRoom.matches ? Number.parseFloat(section.dataset.projectorRoomMobileLensY) : NaN
        const normalizedX = Number.isFinite(mobileX) ? mobileX : Number.parseFloat(section.dataset.projectorRoomLensX)
        const normalizedY = Number.isFinite(mobileY) ? mobileY : Number.parseFloat(section.dataset.projectorRoomLensY)
        const x = Number.isFinite(normalizedX) ? Math.max(0, Math.min(1, normalizedX)) : .3
        const y = Number.isFinite(normalizedY) ? Math.max(0, Math.min(1, normalizedY)) : .6
        roomLens = {
          x: room.left + (room.width - width) / 2 + width * x,
          y: room.top + (room.height - height) / 2 + height * y,
        }
      }
    }
    for (const record of records) {
      if (!record.beam || !record.video) continue
      if (roomLens && record.projector) {
        const markerBase = (record.projector.offsetParent || record.scene).getBoundingClientRect()
        record.projector.style.left = `${(roomLens.x - markerBase.left).toFixed(3)}px`
        record.projector.style.top = `${(roomLens.y - markerBase.top).toFixed(3)}px`
      }
      const isSvg = record.beam.namespaceURI === 'http://www.w3.org/2000/svg'
      const base = (isSvg ? record.scene : record.beam.offsetParent || record.scene).getBoundingClientRect()
      const screen = record.video.getBoundingClientRect()
      const lens = record.lens?.getBoundingClientRect()
      const projector = record.projector?.getBoundingClientRect()
      if (base.width <= 0 || screen.width <= 0 || (!lens && !projector)) continue
      const originX = lens ? lens.left + lens.width / 2 : projector.left + projector.width * .82
      const originY = lens ? lens.top + lens.height / 2 : projector.top + projector.height * .52
      const values = [originX - base.left, originY - base.top,
        screen.left - base.left, screen.top - base.top, screen.bottom - base.top, screen.right - base.left]
      geometryProperties.forEach((property, index) => {
        record.scene.style.setProperty(property, `${values[index].toFixed(3)}px`)
      })
      if (isSvg) {
        record.beam.setAttribute('viewBox', `0 0 ${base.width.toFixed(3)} ${base.height.toFixed(3)}`)
        const [x, y, left, top, bottom, right] = values.map(value => value.toFixed(3))
        const path = view.innerWidth <= 760
          ? `M ${x} ${y} L ${left} ${bottom} L ${right} ${bottom} Z`
          : `M ${x} ${y} L ${left} ${top} L ${left} ${bottom} Z`
        record.light?.setAttribute('d', path)
      }
    }
  }

  function scheduleMeasure() {
    if (!disposed && !measureFrame) measureFrame = view.requestAnimationFrame(measure)
  }

  records.forEach(record => {
    setState(record, reduced.matches)
    record.video?.addEventListener('play', sync, { signal })
    record.video?.addEventListener('pause', sync, { signal })
    record.video?.addEventListener('ended', sync, { signal })
    record.video?.addEventListener('loadedmetadata', scheduleMeasure, { signal })
    record.video?.addEventListener('focusin', () => {
      if (record.active || reduced.matches) setState(record, true)
    }, { signal })
    record.image?.addEventListener('load', scheduleMeasure, { signal })
  })

  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = records.find(item => item.projection === entry.target)
      if (record) record.visible = entry.isIntersecting && entry.intersectionRatio >= .15
    }
    sync()
  }, { threshold: [0, .15, .5] })
  records.forEach(record => intersection.observe(record.projection))

  const resize = new ResizeObserver(scheduleMeasure)
  if (roomImage) {
    resize.observe(roomImage)
    roomImage.addEventListener('load', scheduleMeasure, { signal })
  }
  for (const record of records) {
    resize.observe(record.scene)
    if (record.projector) resize.observe(record.projector)
    if (record.video) resize.observe(record.video)
  }

  const selected = new MutationObserver(() => { sync(); scheduleMeasure() })
  selected.observe(section, { attributes: true, subtree: true,
    attributeFilter: ['data-project-page', 'data-project-page-index', 'data-short-form-index',
      'data-projector-room-lens-x', 'data-projector-room-lens-y',
      'data-projector-room-mobile-lens-x', 'data-projector-room-mobile-lens-y', 'inert', 'hidden'] })
  const menu = new MutationObserver(sync)
  menu.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  document.addEventListener('visibilitychange', sync, { signal })
  document.addEventListener('toggle', sync, { capture: true, signal })
  view.addEventListener('resize', scheduleMeasure, { signal })
  view.addEventListener('scroll', scheduleMeasure, { passive: true, signal })
  section.addEventListener('scroll', scheduleMeasure, { capture: true, passive: true, signal })
  reduced.addEventListener('change', () => {
    records.forEach(record => { record.active = false; setState(record, reduced.matches) })
    sync()
  }, { signal })
  document.fonts?.ready.then(scheduleMeasure)
  scheduleMeasure()
  sync()

  return () => {
    if (disposed) return
    disposed = true
    events.abort()
    intersection.disconnect()
    resize.disconnect()
    selected.disconnect()
    menu.disconnect()
    if (measureFrame) view.cancelAnimationFrame(measureFrame)
    records.forEach(record => {
      record.timeline.kill()
      record.originalStyles.forEach(([property, value, priority]) => {
        if (value) record.scene.style.setProperty(property, value, priority)
        else record.scene.style.removeProperty(property)
      })
      if (record.projector) record.originalMarkerStyles.forEach(([property, value, priority]) => {
        if (value) record.projector.style.setProperty(property, value, priority)
        else record.projector.style.removeProperty(property)
      })
      if (record.originalState === null) record.scene.removeAttribute('data-projector-state')
      else record.scene.setAttribute('data-projector-state', record.originalState)
      if (record.beam) {
        if (record.originalViewBox == null) record.beam.removeAttribute('viewBox')
        else record.beam.setAttribute('viewBox', record.originalViewBox)
      }
      if (record.light) {
        if (record.originalLightPath == null) record.light.removeAttribute('d')
        else record.light.setAttribute('d', record.originalLightPath)
      }
    })
    if (originalPlaying === null) section.removeAttribute('data-projector-playing')
    else section.setAttribute('data-projector-playing', originalPlaying)
  }
}
