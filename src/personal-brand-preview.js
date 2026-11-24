/** Only the visible, selected brand plays; source loading waits for its frame. */
export function initPersonalBrandPreviews() {
  const records = [...document.querySelectorAll('.brand-archive__preview [data-brand-video]')].map(video => ({
    video, section: video.closest('.brand-archive'), gallery: video.closest('[data-brand-gallery]'),
    visible: false, active: false, pending: false, failed: false,
  }))
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let disposed = false

  function eligible(record) {
    const { section, gallery } = record
    const index = gallery?.dataset.projectPageIndex
    const selected = index === undefined || [...gallery.querySelectorAll('.brand-archive')].indexOf(section) === Number(index)
    return !disposed && !record.failed && record.visible && selected && !section.closest('[inert], [hidden]')
      && !document.hidden
  }

  function sync() {
    if (disposed) return
    records.forEach(record => {
      const { video } = record
      if (!eligible(record)) { record.active = false; video.pause(); return }
      const entering = !record.active
      record.active = true
      if (!video.hasAttribute('src') && video.dataset.src) {
        video.src = video.dataset.src
        video.preload = 'metadata'
        video.load()
      }
      if (!entering || reduced.matches || !video.paused || record.pending) return
      record.pending = true
      video.play().then(() => {
        record.pending = false
        if (!eligible(record)) video.pause()
      }).catch(() => { record.pending = false })
    })
  }

  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const record = records.find(item => item.video === entry.target)
      if (record) record.visible = entry.isIntersecting && entry.intersectionRatio >= .2
    })
    sync()
  }, { threshold: [0, .2] })
  const changes = new MutationObserver(sync)
  function onMotionChange() {
    records.forEach(record => { record.active = false; record.video.pause() })
    sync()
  }
  records.forEach(record => {
    record.video.muted = true
    visibility.observe(record.video)
    changes.observe(record.section, { attributes: true, attributeFilter: ['inert', 'hidden'] })
    if (record.gallery) changes.observe(record.gallery, {
      attributes: true, attributeFilter: ['data-project-page-index', 'class', 'inert', 'hidden'],
    })
    record.video.addEventListener('error', () => {
      record.failed = true
      record.video.pause()
      record.video.hidden = true
    }, { signal })
  })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', onMotionChange, { signal })
  document.addEventListener('brand-gallery-change', sync, { signal })

  return {
    sync,
    destroy() {
      disposed = true
      controller.abort()
      visibility.disconnect()
      changes.disconnect()
      records.forEach(({ video }) => {
        video.pause()
        video.removeAttribute('src')
        video.load()
      })
    },
  }
}
