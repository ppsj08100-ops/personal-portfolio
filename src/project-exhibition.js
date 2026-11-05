import './team-exhibition-simple.css'

const exhibitionScenes = [
  { motif: 'air', support: 'air', emphasis: true, omit: '[data-exhibition-device="tablet"]' },
  { motif: 'air', support: 'air', omit: '.project-overview__sheet--collection' },
  { motif: 'air', support: 'air', omit: '.project-overview__object--tertiary' },
  { motif: 'air', support: 'air', emphasis: true },
  { motif: 'air', support: 'air' },
  { motif: 'air', support: 'air' },
  { motif: 'air', support: 'air', choices: true },
  { motif: 'air', support: 'air', emphasis: true },
]

// The existing chapter still owns paging, previews, videos and their controls.
// Decorations share each screen's surface, so entry opacity and travel stay aligned.
export function initProjectExhibition(chapter) {
  const track = chapter?.querySelector(':scope > .project-details__stage > .project-pages')
  if (!track || chapter.id !== 'diptyque-details') return () => {}

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const records = []
  const originalMotionClass = chapter.classList.contains('has-exhibition-motion')
  const originalSimpleClass = chapter.classList.contains('has-simple-team-exhibition')
  const originalBodyClass = document.body.classList.contains('has-project-exhibition-in-view')
  chapter.classList.add('has-simple-team-exhibition')

  function previewState(element) {
    return { element, hidden: element.hidden, inert: element.inert }
  }

  function showPreview(element, show) {
    element.hidden = !show
    element.inert = !show
    if (!show) element.querySelectorAll('video').forEach(video => video.pause())
  }

  function decorate(page, index) {
    const scene = exhibitionScenes[index]
    const figure = page.querySelector('.sail-project__screen, .project-overview__scene')
    const surface = figure?.querySelector('.sail-project__surface, .project-overview__depth')
    if (!scene || !figure || !surface) return

    const roots = [page, figure]
    const attributes = roots.map(root => ({
      root,
      index: root.getAttribute('data-exhibition-index'),
      motif: root.getAttribute('data-exhibition-motif'),
      support: root.getAttribute('data-exhibition-support'),
    }))
    const hadFigureClass = figure.classList.contains('project-exhibition')
    const hadPageClass = page.classList.contains('has-project-exhibition')
    const hadEmphasisClass = figure.classList.contains('project-exhibition--emphasis')
    const originalLabel = figure.getAttribute('aria-label')
    roots.forEach(root => {
      root.dataset.exhibitionIndex = String(index + 1)
      root.dataset.exhibitionMotif = scene.motif
      root.dataset.exhibitionSupport = scene.support
    })
    figure.classList.add('project-exhibition')
    page.classList.add('has-project-exhibition')
    if (scene.emphasis) figure.classList.add('project-exhibition--emphasis')

    const scenery = document.createElement('div')
    scenery.className = 'project-exhibition__scenery'
    scenery.setAttribute('aria-hidden', 'true')
    surface.prepend(scenery)

    const previewStates = []
    if (scene.omit) surface.querySelectorAll(scene.omit).forEach(element => {
      previewStates.push(previewState(element))
      showPreview(element, false)
    })
    if (index === 0) figure.setAttribute('aria-label', '컴퓨터와 휴대폰으로 배치한 딥디크 실제 웹사이트 화면')

    // The two secondary contribution recordings share one display position.
    // Both original links and playback controls remain available on demand.
    let switcher = null
    if (scene.choices) {
      const alternatives = [
        { element: surface.querySelector('.project-overview__object--secondary'), label: '콘텐츠 흐름' },
        { element: surface.querySelector('.project-overview__object--tertiary'), label: '반응형' },
      ].filter(option => option.element)
      if (alternatives.length > 1) {
        switcher = document.createElement('div')
        switcher.className = 'project-exhibition__choices'
        switcher.setAttribute('role', 'group')
        switcher.setAttribute('aria-label', '두 번째 목업의 프로젝트 화면 선택')
        alternatives.forEach(({ element }) => previewStates.push(previewState(element)))
        alternatives.forEach((option, optionIndex) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.textContent = option.label
          button.setAttribute('aria-pressed', String(optionIndex === 0))
          showPreview(option.element, optionIndex === 0)
          button.addEventListener('click', () => {
            alternatives.forEach(({ element }, index) => showPreview(element, index === optionIndex))
            Array.from(switcher.children).forEach((control, index) => control.setAttribute('aria-pressed', String(index === optionIndex)))
          }, { signal: controller.signal })
          switcher.append(button)
        })
        figure.append(switcher)
      }
    }

    const exhibits = [...surface.children].filter(element => element.matches(
      '.project-overview__object, .project-overview__laptop, .project-overview__sheet, .sail-project__device, .sail-project__fragment, [data-exhibition-device]',
    ))
    const exhibitState = exhibits.map((element, order) => {
      const previous = {
        element,
        className: element.classList.contains('project-exhibition__exhibit'),
        order: element.style.getPropertyValue('--exhibit-order'),
      }
      element.classList.add('project-exhibition__exhibit')
      element.style.setProperty('--exhibit-order', String(order))
      return previous
    })
    records.push({ page, figure, scenery, switcher, attributes, exhibitState, previewStates, originalLabel, hadFigureClass, hadPageClass, hadEmphasisClass, intersecting: false })
  }

  ;[...track.children].slice(0, 8).forEach(decorate)

  function sync() {
    chapter.classList.toggle('has-exhibition-motion', !reducedMotion.matches)
    const ready = !chapter.classList.contains('is-project-paged') || chapter.classList.contains('is-project-ready')
    let inView = false
    for (const record of records) {
      const active = ready && record.intersecting && !record.page.closest('[inert]') && !document.hidden
      record.figure.classList.toggle('is-exhibition-visible', active)
      inView ||= active
    }
    document.body.classList.toggle('has-project-exhibition-in-view', inView)
  }

  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = records.find(item => item.figure === entry.target)
      if (record) record.intersecting = entry.isIntersecting && entry.intersectionRatio >= .08
    }
    sync()
  }, { threshold: [0, .08] })
  records.forEach(record => visibility.observe(record.figure))

  const state = new MutationObserver(sync)
  state.observe(chapter, {
    subtree: true,
    attributes: true,
    attributeFilter: ['inert', 'data-project-page-index'],
  })
  const readiness = new MutationObserver(sync)
  readiness.observe(chapter, { attributes: true, attributeFilter: ['class'] })
  reducedMotion.addEventListener('change', sync, { signal: controller.signal })
  document.addEventListener('visibilitychange', sync, { signal: controller.signal })
  sync()

  return () => {
    controller.abort()
    visibility.disconnect()
    state.disconnect()
    readiness.disconnect()
    chapter.classList.toggle('has-exhibition-motion', originalMotionClass)
    chapter.classList.toggle('has-simple-team-exhibition', originalSimpleClass)
    document.body.classList.toggle('has-project-exhibition-in-view', originalBodyClass)
    for (const record of records) {
      record.scenery.remove()
      record.switcher?.remove()
      record.figure.classList.remove('is-exhibition-visible')
      record.figure.classList.toggle('project-exhibition--emphasis', record.hadEmphasisClass)
      record.figure.classList.toggle('project-exhibition', record.hadFigureClass)
      record.page.classList.toggle('has-project-exhibition', record.hadPageClass)
      if (record.originalLabel === null) record.figure.removeAttribute('aria-label')
      else record.figure.setAttribute('aria-label', record.originalLabel)
      record.previewStates.forEach(({ element, hidden, inert }) => {
        element.hidden = hidden
        element.inert = inert
      })
      record.attributes.forEach(({ root, index, motif, support }) => {
        if (index === null) root.removeAttribute('data-exhibition-index')
        else root.setAttribute('data-exhibition-index', index)
        if (motif === null) root.removeAttribute('data-exhibition-motif')
        else root.setAttribute('data-exhibition-motif', motif)
        if (support === null) root.removeAttribute('data-exhibition-support')
        else root.setAttribute('data-exhibition-support', support)
      })
      record.exhibitState.forEach(({ element, className, order }) => {
        element.classList.toggle('project-exhibition__exhibit', className)
        if (order) element.style.setProperty('--exhibit-order', order)
        else element.style.removeProperty('--exhibit-order')
      })
    }
  }
}
