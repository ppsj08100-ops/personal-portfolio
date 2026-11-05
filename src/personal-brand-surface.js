import { gsap } from 'gsap'

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))

/** Personal designs reveal with their chapter; the artwork stays flat. */
export function initPersonalBrandSurface() {
  const records = [...document.querySelectorAll('.brand-archive')].map((section, index) => {
    const stage = section.querySelector('.brand-archive__water-stage')
    if (!stage || !stage.querySelector('button.brand-archive__preview')) return null
    return {
      section, stage, index,
      content: ['header', 'body', 'footer']
        .map(name => section.querySelector(`.brand-archive__${name}`)).filter(Boolean),
      progress: section.closest('[data-brand-gallery], .brand-gallery') ? 0 : 1,
      timeline: null,
      originalReveal: section.getAttribute('data-personal-reveal'),
      originalState: section.getAttribute('data-personal-state'),
    }
  }).filter(Boolean)
  if (!records.length) return () => {}

  const controller = new AbortController()
  const media = gsap.matchMedia()
  const byIndex = new Map(records.map(record => [record.index, record]))
  let disposed = false
  let reduced = false

  function describe(record, progress, staticMode = false) {
    record.section.dataset.personalReveal = progress.toFixed(4)
    record.section.dataset.personalState = staticMode ? 'static'
      : progress <= 0 ? 'hidden' : progress >= 1 ? 'settled' : 'revealing'
  }

  // Register before gallery initialization, which sends its first progress
  // synchronously. Image loading never gates the preview or its controls.
  document.addEventListener('brand-gallery-change', event => {
    if (disposed) return
    const record = byIndex.get(Number(event.detail?.index))
    if (!record) return
    record.progress = clamp(event.detail?.revealProgress ?? event.detail?.progress ?? 1)
    if (reduced) describe(record, 1, true)
    else {
      record.timeline?.pause().progress(record.progress)
      describe(record, record.progress)
    }
  }, { capture: true, signal: controller.signal })

  media.add({
    motion: '(prefers-reduced-motion: no-preference)',
    reduced: '(prefers-reduced-motion: reduce)',
  }, context => {
    reduced = !!context.conditions.reduced
    for (const record of records) {
      if (reduced) {
        gsap.set(record.stage, { autoAlpha: 1, y: 0, scale: 1 })
        if (record.content.length) gsap.set(record.content, { autoAlpha: 1, y: 0 })
        describe(record, 1, true)
        continue
      }

      // The complete personal-design stage moves as one object. Nothing
      // transforms or blurs the real design image independently of its stage.
      gsap.set(record.stage, {
        autoAlpha: 0, y: 18, scale: .98, transformOrigin: '50% 100%',
      })
      if (record.content.length) gsap.set(record.content, { autoAlpha: 0, y: 8 })

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: 'none' },
        onUpdate: () => describe(record, timeline.progress()),
      })
      record.timeline = timeline
      timeline.to(record.stage, { autoAlpha: 1, y: 0, scale: 1, duration: .5 }, .1)
      if (record.content.length) timeline.to(record.content, {
        autoAlpha: 1, y: 0, duration: .28, stagger: .07,
      }, .52)
      timeline.progress(record.progress)
      describe(record, record.progress)
    }
    return () => { records.forEach(record => { record.timeline = null }) }
  })

  return () => {
    if (disposed) return
    disposed = true
    controller.abort()
    // Revert kills each paused timeline and restores the original inline
    // transforms, opacity, visibility, and transform origins, including after
    // a reduced-motion preference change.
    media.revert()
    for (const record of records) {
      if (record.originalReveal === null) record.section.removeAttribute('data-personal-reveal')
      else record.section.setAttribute('data-personal-reveal', record.originalReveal)
      if (record.originalState === null) record.section.removeAttribute('data-personal-state')
      else record.section.setAttribute('data-personal-state', record.originalState)
    }
  }
}
