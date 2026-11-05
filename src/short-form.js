import { initProjectCase } from './project-case.js'
import { initShortFormProjector } from './short-form-projector.js'

const clampIndex = (value, count) => Math.max(0, Math.min(count - 1, Number(value) || 0))

/** The shared pager owns the three films' layout, navigation and inert state. */
export function initShortForm(section) {
  if (!section) return () => {}
  const stage = section.querySelector('.project-details__stage')
  const track = stage?.querySelector('.project-pages')
  const films = track ? [...track.children].filter(film => film.matches('[data-short-film]')) : []
  const navigation = stage?.querySelector('.project-pages__navigation')
  const buttons = navigation ? [...navigation.querySelectorAll('[data-project-page]')] : []
  if (!films.length || films.length !== buttons.length || films.some(film => !film.querySelector('video'))) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const status = stage.querySelector('[data-short-status]')
  const records = films.map((film, index) => {
    const video = film.querySelector('video')
    const heading = film.querySelector('h3')
    return { film, video, heading, index, visible: false, manualPaused: false, userPlaying: !video.paused,
      internalPauses: 0, pending: false, autoStart: false, autoBlocked: false, playToken: 0,
      originalPreload: video.getAttribute('preload'), originalAutoplay: video.getAttribute('autoplay'),
      originalHeadingTabIndex: heading?.getAttribute('tabindex') ?? null }
  })
  const destroyPager = initProjectCase(films[0], { id: 'short-form-pages' })
  const destroyProjector = initShortFormProjector(section)
  let disposed = false
  let current = -1
  let stageInView = false
  let focusFrame = 0
  let startupFrame = 0
  let pendingFocus = null
  let navigationRevision = 0

  function availability(record) {
    if (record.index !== current) return 'inactive-page'
    if (!record.visible) return 'offscreen'
    if (document.hidden) return 'document-hidden'
    if (document.body.classList.contains('has-menu-open') || document.querySelector('dialog[open]')) return 'dialog-open'
    if (record.video.closest('[inert], [hidden]')) return 'inert'
    return 'visible'
  }

  function pause(record) {
    const video = record.video
    record.userPlaying = false
    if (!video.paused || record.pending) {
      record.playToken += 1
      if (!video.paused) record.internalPauses += 1
      record.pending = false
      record.autoStart = false
      video.pause()
    }
  }

  function autoplay(record) {
    if (disposed || record.pending || !record.video.paused || record.manualPaused || record.autoBlocked) return
    const token = ++record.playToken
    record.pending = true
    record.autoStart = true
    record.video.preload = 'metadata'
    record.video.muted = true
    let request
    try { request = record.video.play() }
    catch { record.pending = false; record.autoStart = false; record.autoBlocked = true; return }
    Promise.resolve(request).then(() => {
      if (disposed || token !== record.playToken) return
      if (availability(record) !== 'visible' || reduced.matches || record.manualPaused) pause(record)
    }).catch(error => {
      if (disposed || token !== record.playToken) return
      if (error?.name === 'NotAllowedError') record.autoBlocked = true
    }).finally(() => {
      if (disposed || token !== record.playToken) return
      record.pending = false
      record.autoStart = false
      describePlayback(record)
    })
  }

  function describePlayback(record, reason = availability(record)) {
    record.video.dataset.shortPlayback = record.video.paused ? 'paused' : 'playing'
    record.video.dataset.shortPlaybackReason = reason === 'visible'
      ? record.manualPaused ? 'manual-pause' : reduced.matches && !record.userPlaying ? 'reduced-motion'
        : record.autoBlocked && record.video.paused ? 'autoplay-blocked' : 'visible'
      : reason
    if (record.index === current) section.dataset.shortFormPlayback = record.video.dataset.shortPlayback
  }

  function syncPlayback() {
    if (disposed) return
    for (const record of records) {
      const reason = availability(record)
      if (reason !== 'visible') {
        pause(record)
        record.video.preload = 'none'
      } else {
        record.video.preload = 'metadata'
        if (reduced.matches) {
          if (!record.userPlaying) pause(record)
        } else if (section.dataset.shortAutoplay !== 'false' && !record.manualPaused) autoplay(record)
      }
      describePlayback(record, reason)
    }
  }

  function syncCurrent() {
    if (disposed) return
    document.body.classList.toggle('has-short-film-in-view', stageInView)
    const next = clampIndex(section.dataset.projectPageIndex, records.length)
    if (next !== current) {
      records.forEach(record => { if (record.index !== next) pause(record) })
      current = next
      records[current].autoBlocked = false
      section.dataset.shortFormIndex = String(current)
      records.forEach(record => { record.film.dataset.shortActive = String(record.index === current) })
      if (status) status.textContent = `영상 ${current + 1} / ${records.length} · ${records[current].heading?.textContent.trim() || ''}`
    }
    syncPlayback()
  }

  function cancelFocus() {
    if (focusFrame) cancelAnimationFrame(focusFrame)
    focusFrame = 0
    pendingFocus = null
  }

  function waitForHeading() {
    focusFrame = 0
    if (disposed || !pendingFocus) return
    const request = pendingFocus
    const record = records[request.index]
    const page = section.classList.contains('is-project-paged')
      ? Number(section.dataset.projectPage) : track.scrollLeft / Math.max(1, track.clientWidth)
    const targetBox = record.film.getBoundingClientRect()
    const stageBox = stage.getBoundingClientRect()
    const settled = current === request.index && !record.film.inert
      && Math.abs(page - request.index) < .005 && Math.abs(targetBox.left - stageBox.left) < 3
    request.stable = settled ? request.stable + 1 : 0
    if (request.stable >= 2) {
      pendingFocus = null
      record.heading?.focus({ preventScroll: true })
      section.dataset.shortHashState = 'settled'
      return
    }
    if (performance.now() > request.deadline) {
      pendingFocus = null
      section.dataset.shortHashState = 'cancelled'
      return
    }
    focusFrame = requestAnimationFrame(waitForHeading)
  }

  function goTo(index, { heading = false, brief = false } = {}) {
    const next = clampIndex(index, records.length)
    cancelFocus()
    navigationRevision += 1
    if (brief) records[next].film.querySelector('#diesel-film-brief')?.setAttribute('open', '')
    if (!section.classList.contains('is-project-paged')) stage.scrollIntoView({ block: 'start', behavior: 'instant' })
    buttons[next].click()
    syncCurrent()
    if (heading) {
      section.dataset.shortHashState = 'pending'
      pendingFocus = { index: next, stable: 0, deadline: performance.now() + 2200 }
      focusFrame = requestAnimationFrame(waitForHeading)
    }
  }

  function hashTarget(hash) {
    let id
    try { id = decodeURIComponent(hash.replace(/^#/, '')) } catch { return null }
    if (id === 'diesel-film-brief') return { index: records.findIndex(record => record.film.contains(document.getElementById(id))), brief: true }
    const index = records.findIndex(record => record.film.id === id)
    return index >= 0 ? { index, brief: false } : null
  }

  function followHash(hash) {
    const target = hashTarget(hash)
    if (!target || target.index < 0) return false
    goTo(target.index, { heading: true, brief: target.brief })
    return true
  }

  records.forEach(record => {
    const { video, heading } = record
    video.autoplay = false
    video.preload = 'none'
    if (heading) heading.tabIndex = -1
    video.addEventListener('pause', () => {
      if (record.internalPauses) record.internalPauses -= 1
      else if (availability(record) === 'visible') { record.manualPaused = true; record.userPlaying = false }
      describePlayback(record)
    }, { signal })
    video.addEventListener('play', () => {
      record.manualPaused = false
      record.autoBlocked = false
      record.userPlaying = !record.autoStart
      records.forEach(other => { if (other !== record) pause(other) })
      if (availability(record) !== 'visible') pause(record)
      describePlayback(record)
    }, { signal })
    video.addEventListener('loadedmetadata', syncPlayback, { signal })
  })
  const intersection = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === stage) {
        stageInView = entry.isIntersecting && entry.intersectionRatio >= .15
        return
      }
      const record = records.find(item => item.video === entry.target)
      if (record) record.visible = entry.isIntersecting && entry.intersectionRatio >= .15
    })
    syncCurrent()
  }, { threshold: [0, .15, .5] })
  records.forEach(record => intersection.observe(record.video))
  intersection.observe(stage)
  const mutation = new MutationObserver(syncCurrent)
  mutation.observe(document.body, { attributes: true, subtree: true,
    attributeFilter: ['data-project-page-index', 'inert', 'hidden', 'open', 'class'] })
  track.addEventListener('scroll', syncCurrent, { passive: true, signal })
  section.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', syncPlayback, { signal }))
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelFocus()
    syncPlayback()
  }, { signal })
  reduced.addEventListener('change', () => {
    if (reduced.matches) records.forEach(pause)
    syncCurrent()
  }, { signal })

  section.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.target.closest('video, audio, input, textarea, select, details, summary, a, [contenteditable="true"]')) return
    const focusedButton = event.target.closest('[data-project-page]')
    const from = focusedButton ? Number(focusedButton.dataset.projectPage) : current
    const destination = { ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: records.length - 1 }[event.key]
    if (destination === undefined) return
    event.preventDefault()
    const next = clampIndex(destination, records.length)
    goTo(next)
    buttons[next].focus({ preventScroll: true })
  }, { signal })

  window.addEventListener('hashchange', () => followHash(location.hash), { signal })
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target.closest('a[href]')
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return
    const url = new URL(link.href, location.href)
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !hashTarget(url.hash)) return
    event.preventDefault()
    if (location.hash !== url.hash) history.pushState(null, '', url.hash)
    followHash(url.hash)
  }, { signal })
  ;['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(name => window.addEventListener(name, () => {
    if (pendingFocus) { cancelFocus(); section.dataset.shortHashState = 'cancelled' }
  }, { passive: true, capture: true, signal }))

  syncCurrent()
  const initialHash = location.hash
  const initialRevision = navigationRevision
  Promise.resolve(document.fonts?.ready).then(() => {
    if (disposed || navigationRevision !== initialRevision || location.hash !== initialHash || !hashTarget(initialHash)) return
    startupFrame = requestAnimationFrame(() => { startupFrame = 0; if (!disposed) followHash(initialHash) })
  })

  return () => {
    if (disposed) return
    disposed = true
    controller.abort()
    intersection.disconnect()
    mutation.disconnect()
    document.body.classList.remove('has-short-film-in-view')
    cancelFocus()
    if (startupFrame) cancelAnimationFrame(startupFrame)
    records.forEach(pause)
    destroyProjector()
    destroyPager()
    records.forEach(record => {
      if (record.originalPreload === null) record.video.removeAttribute('preload')
      else record.video.setAttribute('preload', record.originalPreload)
      if (record.originalAutoplay === null) record.video.removeAttribute('autoplay')
      else record.video.setAttribute('autoplay', record.originalAutoplay)
      if (record.heading) {
        if (record.originalHeadingTabIndex === null) record.heading.removeAttribute('tabindex')
        else record.heading.setAttribute('tabindex', record.originalHeadingTabIndex)
      }
      delete record.film.dataset.shortActive
      delete record.video.dataset.shortPlayback
      delete record.video.dataset.shortPlaybackReason
    })
    delete section.dataset.shortFormIndex
    delete section.dataset.shortFormPlayback
    delete section.dataset.shortHashState
  }
}
