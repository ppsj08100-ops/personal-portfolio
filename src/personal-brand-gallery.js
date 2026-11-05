import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initProjectCase } from './project-case.js'

const PAGING_ID = 'personal-brand-pages'
const ENTRY_ID = 'personal-brand-entry'
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const aliases = new Map([
  ['diesel-project', 0], ['diesel-overview', 0], ['personal-projects', 0],
  ['diesel-design-overview', 0],
  ['repetto-project', 1], ['repetto-overview', 1], ['repetto-cover', 1],
  ['repetto-design-overview', 1],
])

/** One two-brand chapter; only an explicit brand destination moves the reader. */
export function initPersonalBrandGallery() {
  const gallery = document.querySelector('#personal-brand-gallery[data-brand-gallery]')
  const stage = gallery?.querySelector(':scope > .project-details__stage')
  const track = stage?.querySelector(':scope > .project-pages')
  const pages = track ? [...track.children] : []
  const navigation = stage?.querySelector('.project-pages__navigation')
  if (!gallery || !track || !navigation || pages.length !== 2) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const buttons = [...navigation.querySelectorAll('[data-project-page]')]
  const destroyPaging = initProjectCase(pages[0], { id: PAGING_ID })
  const addedTabIndexes = new Set()
  let disposed = false
  let entry = 0
  let entryTrigger = null
  let renderFrame = 0
  let initialFrame = 0
  let assetFrame = 0
  let focusTimer = 0
  let pendingFocus = null
  let previousProgress = [null, null]
  let assetsRefreshed = false

  const layout = () => {
    const box = gallery.getBoundingClientRect()
    return [box.top + scrollY, box.height, stage.clientWidth, stage.clientHeight]
  }
  let measuredLayout = layout()

  function cancelFocus() {
    clearTimeout(focusTimer)
    focusTimer = 0
    pendingFocus = null
  }

  function finishFocus() {
    if (!pendingFocus || disposed) return
    const { index, target } = pendingFocus
    const page = pages[index]
    if (page.inert || !target.isConnected) return
    const pageBox = page.getBoundingClientRect()
    if (pageBox.right <= 0 || pageBox.left >= innerWidth
      || pageBox.bottom <= 0 || pageBox.top >= innerHeight) return
    const focus = target.matches('h1, h2, h3, h4') ? target
      : target.querySelector('h2, h3') || page.querySelector('h2, h3') || target
    const box = focus.getBoundingClientRect()
    // A heading in the incoming pane can still be horizontally outside view
    // after rounding the active index. Wait for the next paging update.
    if (box.right <= 0 || box.left >= innerWidth) return
    if (page.scrollHeight > page.clientHeight + 1) {
      page.scrollTop = Math.max(0, Math.min(page.scrollHeight - page.clientHeight,
        page.scrollTop + box.top - pageBox.top - 24))
    }
    if (!focus.hasAttribute('tabindex')) {
      focus.setAttribute('tabindex', '-1')
      addedTabIndexes.add(focus)
    }
    focus.focus({ preventScroll: true })
    cancelFocus()
  }

  function pagePosition() {
    const value = gallery.dataset.projectPage
    if (gallery.classList.contains('is-project-paged') && value !== undefined
      && Number.isFinite(Number(value))) return clamp(value)
    if (track.clientWidth > 0) return clamp(track.scrollLeft / track.clientWidth)
    return clamp(gallery.dataset.projectPageIndex)
  }

  function render(force = false) {
    if (disposed) return
    const q = pagePosition()
    const progress = reduced.matches ? [1, 1] : [entry, clamp((q - .12) / .76)]
    progress.forEach((value, index) => {
      const rounded = Number(value.toFixed(4))
      if (!force && rounded === previousProgress[index]) return
      previousProgress[index] = rounded
      document.dispatchEvent(new CustomEvent('brand-gallery-change', {
        detail: { index, progress: rounded, revealProgress: rounded },
      }))
    })
    finishFocus()
  }

  function scheduleRender() {
    if (disposed || renderFrame) return
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0
      render()
    })
  }

  function configureEntry() {
    entryTrigger?.kill()
    entryTrigger = null
    if (reduced.matches) {
      entry = 1
      render(true)
      return
    }
    const update = self => { entry = self.progress; render() }
    entryTrigger = ScrollTrigger.create({
      id: ENTRY_ID, trigger: gallery, start: 'top 85%', end: 'top 25%',
      refreshPriority: -13, onUpdate: update, onRefresh: update,
    })
    entry = entryTrigger.progress
    render(true)
  }

  function destination(hash) {
    if (!hash || hash === '#') return null
    let id
    try { id = decodeURIComponent(hash.slice(1)) } catch { return null }
    const target = document.getElementById(id)
    const index = target ? pages.findIndex(page => page === target || page.contains(target)) : -1
    const pageIndex = index >= 0 ? index : aliases.get(id)
    if (pageIndex === undefined || pageIndex < 0) return null
    return { index: pageIndex, target: index >= 0 ? target : pages[pageIndex] }
  }

  function navigate(to) {
    if (disposed || !to) return
    cancelFocus()
    pendingFocus = to
    // This is a bounded fallback; progress/scroll mutations normally complete
    // focus as soon as the requested pane is active and visible.
    focusTimer = setTimeout(() => { finishFocus(); cancelFocus() }, 2000)
    const trigger = ScrollTrigger.getById(PAGING_ID)
    const button = buttons.find(item => Number(item.dataset.projectPage) === to.index)
    if (trigger && button) button.click()
    else {
      stage.scrollIntoView({ block: 'start', behavior: 'instant' })
      track.scrollTo({ left: to.index * track.clientWidth, behavior: 'instant' })
    }
    ScrollTrigger.update()
    scheduleRender()
  }

  function onAnchor(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey || !(event.target instanceof Element)) return
    const anchor = event.target.closest('a[href]')
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
    let url
    try { url = new URL(anchor.href, location.href) } catch { return }
    if (url.origin !== location.origin || url.pathname !== location.pathname
      || url.search !== location.search) return
    const to = destination(url.hash)
    if (!to) return
    event.preventDefault()
    if (location.hash !== url.hash) history.pushState(history.state, '', url.hash)
    navigate(to)
  }

  const changes = new MutationObserver(scheduleRender)
  changes.observe(gallery, {
    attributes: true, attributeFilter: ['data-project-page', 'data-project-page-index', 'class'],
  })
  track.addEventListener('scroll', scheduleRender, { passive: true, signal })
  window.addEventListener('resize', () => { measuredLayout = layout(); scheduleRender() }, { passive: true, signal })
  window.addEventListener('hashchange', () => navigate(destination(location.hash)), { signal })
  document.addEventListener('click', onAnchor, { signal })
  navigation.addEventListener('click', event => {
    if (event.isTrusted) cancelFocus()
  }, { signal })
  reduced.addEventListener('change', configureEntry, { signal })
  ;['wheel', 'touchstart'].forEach(name => window.addEventListener(name, cancelFocus, { passive: true, signal }))
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelFocus()
  }, { signal })

  // An image with reserved dimensions usually leaves geometry unchanged. Wait
  // for all local previews and fonts, then refresh at most once if it moved.
  const images = [...track.querySelectorAll('img')]
  const pendingImages = new Set(images.filter(image => !image.complete))
  let fontsReady = !document.fonts
  function refreshAfterAssets() {
    if (disposed || assetsRefreshed || pendingImages.size || !fontsReady || assetFrame) return
    assetFrame = requestAnimationFrame(() => {
      assetFrame = 0
      if (disposed || assetsRefreshed) return
      assetsRefreshed = true
      const next = layout()
      if (next.some((value, index) => Math.abs(value - measuredLayout[index]) > 1)) ScrollTrigger.refresh()
      measuredLayout = next
      scheduleRender()
    })
  }
  pendingImages.forEach(image => {
    const settled = () => { pendingImages.delete(image); refreshAfterAssets() }
    image.addEventListener('load', settled, { once: true, signal })
    image.addEventListener('error', settled, { once: true, signal })
  })
  document.fonts?.ready.then(() => { fontsReady = true; refreshAfterAssets() })

  configureEntry()
  refreshAfterAssets()
  const initial = destination(location.hash)
  if (initial) initialFrame = requestAnimationFrame(() => {
    initialFrame = 0
    if (!disposed) navigate(initial)
  })

  return () => {
    disposed = true
    controller.abort()
    changes.disconnect()
    cancelAnimationFrame(renderFrame)
    cancelAnimationFrame(initialFrame)
    cancelAnimationFrame(assetFrame)
    cancelFocus()
    entryTrigger?.kill()
    destroyPaging()
    addedTabIndexes.forEach(element => {
      if (element.getAttribute('tabindex') === '-1') element.removeAttribute('tabindex')
    })
  }
}
