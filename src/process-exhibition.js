import './process-exhibition.css'
import './process-exhibition-simple.css'
import './process-copy.css'

const scenes = [
  { id: 'diptyque-planning', motif: 'plinth', variant: 'ruined-plinth', title: '01 / LEAN CANVAS' },
  { id: 'diptyque-research', motif: 'city', variant: 'lost-city-facade', complements: ['competition', 'threec', 'brand', 'steep'], companionCount: 0, title: '02 / BRAND RESEARCH' },
  { id: 'diptyque-interviews', motif: 'head', variant: 'reclining-head', sourceGallery: true, companionCount: 2, title: '03 / USER RESEARCH' },
  { id: 'diptyque-definition', motif: 'backhand', variant: 'resting-backhand', userGallery: true, companionCount: 2, title: '04 / UX STRATEGY' },
  { id: 'diptyque-structure', motif: 'city', variant: 'broken-city-colonnade', structureGallery: true, companionCount: 2, title: '05 / INFORMATION ARCHITECTURE' },
  { id: 'diptyque-visual', motif: 'city', variant: 'city-medallion', companionCount: 0, title: '06 / VISUAL DIRECTION' },
  { id: 'diptyque-screens', motif: 'fountain', variant: 'buried-fountain', companionCount: 0, title: '07 / SCREEN DESIGN' },
]

function make(tag, className) {
  const element = document.createElement(tag)
  element.className = className
  return element
}

function device(kind) {
  const shell = make('div', `process-device process-device--${kind} process-exhibit__device--${kind}`)
  shell.dataset.processContact = kind
  const viewport = make('div', 'process-device__viewport')
  const screen = make('div', 'process-device__screen')
  viewport.append(screen)
  shell.append(viewport)
  return { shell, viewport: screen }
}

function complementaryDocument(source) {
  const clone = source.cloneNode(true)
  const image = [...source.children].find(child => child.tagName === 'IMG' && !child.hidden)
  if (image && [...source.children].every(child => child.tagName === 'IMG')) {
    clone.querySelectorAll('img[hidden]').forEach(hidden => hidden.remove())
    clone.classList.add('process-mini-document--image')
    clone.style.width = `${image.getAttribute('width') || image.naturalWidth}px`
    clone.style.height = `${image.getAttribute('height') || image.naturalHeight}px`
  } else {
    const style = getComputedStyle(source)
    if (parseFloat(style.width)) clone.style.width = style.width
    if (parseFloat(style.height)) clone.style.height = style.height
  }
  for (const element of [clone, ...clone.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      if (['id', 'role', 'tabindex', 'name', 'for', 'href', 'autofocus', 'contenteditable'].includes(attribute.name)
        || /^(aria-|data-|on)/.test(attribute.name)) element.removeAttribute(attribute.name)
    }
    if (element.matches('button, input, select, textarea')) element.disabled = true
  }
  clone.classList.add('process-mini-document')
  return clone
}

// Keep the original interactive documents. Side displays show complementary
// source material, including the two other original lean canvases.
export function initProcessExhibition(chapter) {
  const track = chapter?.querySelector(':scope > .project-details__stage > .project-pages')
  if (!track) return () => {}
  const records = []
  const hadClass = chapter.classList.contains('has-process-exhibition')
  const hadSimpleClass = chapter.classList.contains('has-simple-process-exhibition')
  const hadInViewClass = document.body.classList.contains('has-process-exhibition-in-view')
  chapter.classList.add('has-process-exhibition', 'has-simple-process-exhibition')
  let resizeFrame = 0
  let disposed = false

  function fitDocument(root, variable) {
    const child = root.firstElementChild
    if (!child || !root.clientWidth || !root.clientHeight) return
    const width = child.offsetWidth
    const height = child.offsetHeight
    if (width && height) {
      const scale = root.dataset.previewFit === 'cover' ? Math.max : Math.min
      root.style.setProperty(variable, scale(root.clientWidth / width, root.clientHeight / height))
    }
  }

  function fit() {
    if (disposed) return
    for (const record of records) {
      const readoutHeight = record.readout.offsetHeight
      if (readoutHeight) record.visual.style.setProperty('--process-readout-height', `${Math.ceil(readoutHeight) + 12}px`)
      if (!record.planning) {
        record.visual.querySelectorAll('.project-research__paper').forEach(preview => fitDocument(preview, '--process-document-scale'))
        record.companions.forEach(side => fitDocument(side.viewport, '--process-mini-scale'))
      }
    }
  }

  function queueFit() {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; fit() })
  }

  for (const [index, scene] of scenes.entries()) {
    const page = document.getElementById(scene.id)
    const layout = page?.querySelector(':scope > .project-planning__layout, :scope > .project-research__layout')
    const visual = layout?.querySelector(':scope > .project-planning__visual, :scope > .project-research__visual')
    if (!page || !visual) continue
    const planning = index === 0
    const originalChildren = [...visual.childNodes]
    const eyebrow = layout.querySelector('.project-story__eyebrow')
    const previous = {
      pageClass: page.className, visualClass: visual.className, layoutClass: layout.className,
      index: page.getAttribute('data-process-exhibit'),
      motif: visual.getAttribute('data-motif'),
      pageVariant: page.getAttribute('data-process-variant'),
      visualVariant: visual.getAttribute('data-process-variant'),
      mainFrame: visual.getAttribute('data-process-main-frame'),
      support: visual.getAttribute('data-process-support'),
      count: visual.getAttribute('data-process-frame-count'),
      readoutHeight: visual.style.getPropertyValue('--process-readout-height'),
      readoutHeightPriority: visual.style.getPropertyPriority('--process-readout-height'),
      structureRatios: ['--structure-main-ratio', '--structure-side-ratio-1', '--structure-side-ratio-2'].map(name => [name, visual.style.getPropertyValue(name), visual.style.getPropertyPriority(name)]),
      eyebrow: eyebrow?.textContent,
    }
    page.classList.add('process-exhibition-page')
    page.dataset.processExhibit = String(index + 1)
    page.dataset.processVariant = scene.variant
    layout.classList.add('process-exhibition__layout')
    visual.classList.add('process-exhibit')
    visual.dataset.motif = scene.motif
    visual.dataset.processVariant = scene.variant
    visual.dataset.processMainFrame = 'panel'
    visual.dataset.processSupport = 'air'
    visual.classList.add(`process-exhibit--${scene.variant}`)
    if (eyebrow) eyebrow.textContent = scene.title
    const scenery = make('div', 'process-exhibit__scenery')
    scenery.setAttribute('aria-hidden', 'true')
    visual.prepend(scenery)

    const monitor = device('monitor')
    const companions = []
    let opener, openerPlaceholder
    const readout = make('div', 'process-exhibit__readout')
    if (planning) {
      const document = visual.querySelector('.project-planning__document')
      opener = document?.querySelector('[data-lean-open]')
      if (opener) {
        openerPlaceholder = window.document.createComment('original canvas zoom action')
        opener.replaceWith(openerPlaceholder)
      }
      if (document) monitor.viewport.append(document)
      const caption = make('div', 'process-exhibit__caption')
      const label = make('span', '')
      label.textContent = 'LEAN PRODUCT CANVAS / v3'
      label.dataset.leanCaption = ''
      caption.append(label)
      if (opener) caption.append(opener)
      readout.append(caption)
      for (const [i, kind] of ['tablet', 'phone'].entries()) {
        const side = device(kind)
        side.shell.classList.add('process-exhibit__companion', 'process-exhibit__canvas-companion')
        if (i) side.shell.classList.add('process-exhibit__canvas-companion--two')
        side.shell.inert = true
        side.shell.setAttribute('aria-hidden', 'true')
        companions.push(side)
      }
    } else {
      visual.querySelectorAll(':scope > .project-research__panel').forEach(panel => monitor.viewport.append(panel))
      visual.querySelectorAll(':scope > .project-research__caption, :scope > .project-definition__users, :scope > [data-structure-flows], :scope > [data-structure-meetings]').forEach(element => readout.append(element))
      for (let i = 0; i < (scene.companionCount ?? 1); i++) {
        const side = device(i ? 'phone' : 'tablet')
        side.shell.classList.add('process-exhibit__companion')
        side.shell.inert = true
        side.shell.setAttribute('aria-hidden', 'true')
        side.viewport.classList.add('process-device__mini-viewport')
        companions.push(side)
      }
    }
    visual.dataset.processFrameCount = String(1 + companions.length)
    visual.append(monitor.shell, ...companions.map(side => side.shell), readout)
    const record = { page, layout, visual, previous, planning, originalChildren, opener, openerPlaceholder, eyebrow, readout, companions }
    records.push(record)
    if (planning) {
      const sources = [...page.querySelector('#diptyque-canvas-document').content.querySelectorAll('[data-lean-document]')]
      const syncCanvases = () => {
        const active = page.dataset.leanActive || '1'
        const selected = sources.find(image => image.dataset.leanDocument === active)
        const label = readout.querySelector('[data-lean-caption]')
        label.textContent = `${selected.dataset.leanLabel} · Lean Canvas v3`
        sources.filter(image => image.dataset.leanDocument !== active).forEach((image, i) => {
          companions[i].shell.dataset.leanDocument = image.dataset.leanDocument
          companions[i].viewport.replaceChildren(image.cloneNode(true))
        })
        queueFit()
      }
      const state = new MutationObserver(syncCanvases)
      state.observe(page, { attributes: true, attributeFilter: ['data-lean-active'] })
      record.state = state
      syncCanvases()
    } else {
      const syncComplements = () => {
        if (scene.structureGallery) {
          const key = page.dataset.researchActive
          const source = monitor.viewport.querySelector(`[data-research-preview='${key}'] > .structure-document`)
          if (!source) return
          const mainImage = [...source.querySelectorAll('img')].find(image => !image.hidden)
          const setRatio = (frame, width, height, variable) => {
            const ratio = String(width / height)
            frame.shell.style.setProperty('--structure-source-ratio', ratio)
            frame.viewport.style.setProperty('--structure-source-ratio', ratio)
            visual.style.setProperty(variable, ratio)
          }
          setRatio(monitor, mainImage ? Number(mainImage.getAttribute('width')) : 960, mainImage ? Number(mainImage.getAttribute('height')) : 600, '--structure-main-ratio')
          let images = []
          if (key === 'meeting') images = [...source.querySelectorAll('[data-structure-meeting-source]')].filter(image => image.hidden)
          if (key === 'flow') images = [...source.querySelectorAll('[data-structure-flow-image]')].filter(image => image.hidden)
          visual.dataset.processFrameCount = String(1 + images.length)
          companions.forEach((side, i) => {
            const image = images[i]
            side.shell.hidden = !image
            if (!image) return
            const document = make('article', 'research-document')
            const preview = image.cloneNode(true)
            preview.hidden = false
            document.append(preview)
            side.shell.dataset.processPreviewKey = key
            if (key === 'flow') side.shell.dataset.structureFlow = image.dataset.structureFlowImage
            else delete side.shell.dataset.structureFlow
            side.viewport.replaceChildren(complementaryDocument(document))
            setRatio(side, Number(image.getAttribute('width')), Number(image.getAttribute('height')), `--structure-side-ratio-${i + 1}`)
          })
          queueFit()
          return
        }
        if (scene.userGallery) {
          const key = page.dataset.researchActive
          const source = monitor.viewport.querySelector(`[data-research-preview='${key}'] > .definition-document`)
          if (!source) return
          const images = [...source.querySelectorAll('[data-definition-image]')]
          const otherUsers = images.filter(image => image.hidden)
          companions.forEach((side, i) => {
            const image = otherUsers[i]
            if (!image) return
            const document = make('article', 'research-document')
            const preview = image.cloneNode(true)
            preview.hidden = false
            document.append(preview)
            side.shell.dataset.processPreviewKey = key
            side.shell.dataset.definitionUser = image.dataset.definitionImage
            side.viewport.replaceChildren(complementaryDocument(document))
          })
          queueFit()
          return
        }
        if (scene.sourceGallery) {
          const survey = page.dataset.researchActive === 'survey'
          visual.dataset.processFrameCount = survey ? '3' : '1'
          const sources = monitor.viewport.querySelectorAll("[data-research-preview='survey'] img")
          companions.forEach((side, i) => {
            side.shell.hidden = !survey
            const image = sources[i ? 2 : 0]
            if (!image || !survey) return
            const source = make('article', 'research-document')
            source.append(image.cloneNode(true))
            const key = `survey-${i ? '03' : '01'}`
            side.shell.dataset.processPreviewKey = key
            side.viewport.dataset.complementKey = key
            side.viewport.replaceChildren(complementaryDocument(source))
          })
          queueFit()
          return
        }
        const keys = (scene.complements ?? []).filter(key => key !== page.dataset.researchActive)
        companions.forEach((side, i) => {
          const key = keys[i]
          const source = monitor.viewport.querySelector(`[data-research-preview='${key}'] > .research-document`)
          if (!source) return
          side.shell.dataset.processPreviewKey = key
          side.viewport.dataset.complementKey = key
          side.viewport.replaceChildren(complementaryDocument(source))
        })
        queueFit()
      }
      const state = new MutationObserver(syncComplements)
      state.observe(monitor.viewport, { attributes: true, subtree: true, attributeFilter: ['hidden'] })
      record.state = state
      if (scene.structureGallery) {
        const galleryState = new MutationObserver(syncComplements)
        galleryState.observe(page, { attributes: true, attributeFilter: ['data-structure-meeting'] })
        record.galleryState = galleryState
      }
      syncComplements()
    }
  }

  const resize = new ResizeObserver(queueFit)
  for (const record of records) {
    resize.observe(record.visual)
    resize.observe(record.readout)
    record.visual.querySelectorAll('.process-device__viewport').forEach(viewport => resize.observe(viewport))
    record.visual.querySelectorAll('.process-device__note-fit').forEach(note => resize.observe(note))
  }
  const inView = new IntersectionObserver(entries => {
    const visible = entries.some(entry => entry.isIntersecting)
    document.body.classList.toggle('has-process-exhibition-in-view', visible)
  }, { threshold: 0 })
  inView.observe(chapter.querySelector(':scope > .project-details__stage'))
  fit()
  queueFit()

  return () => {
    disposed = true
    cancelAnimationFrame(resizeFrame)
    resize.disconnect()
    inView.disconnect()
    chapter.classList.toggle('has-process-exhibition', hadClass)
    chapter.classList.toggle('has-simple-process-exhibition', hadSimpleClass)
    document.body.classList.toggle('has-process-exhibition-in-view', hadInViewClass)
    for (const record of records) {
      record.state?.disconnect()
      record.galleryState?.disconnect()
      if (record.openerPlaceholder?.isConnected && record.opener) record.openerPlaceholder.replaceWith(record.opener)
      record.visual.replaceChildren(...record.originalChildren)
      record.visual.className = record.previous.visualClass
      record.page.className = record.previous.pageClass
      record.layout.className = record.previous.layoutClass
      if (record.eyebrow) record.eyebrow.textContent = record.previous.eyebrow
      if (record.previous.index === null) delete record.page.dataset.processExhibit
      else record.page.setAttribute('data-process-exhibit', record.previous.index)
      if (record.previous.motif === null) delete record.visual.dataset.motif
      else record.visual.setAttribute('data-motif', record.previous.motif)
      if (record.previous.pageVariant === null) delete record.page.dataset.processVariant
      else record.page.setAttribute('data-process-variant', record.previous.pageVariant)
      if (record.previous.visualVariant === null) delete record.visual.dataset.processVariant
      else record.visual.setAttribute('data-process-variant', record.previous.visualVariant)
      if (record.previous.mainFrame === null) delete record.visual.dataset.processMainFrame
      else record.visual.setAttribute('data-process-main-frame', record.previous.mainFrame)
      if (record.previous.support === null) delete record.visual.dataset.processSupport
      else record.visual.setAttribute('data-process-support', record.previous.support)
      if (record.previous.count === null) delete record.visual.dataset.processFrameCount
      else record.visual.setAttribute('data-process-frame-count', record.previous.count)
      if (record.previous.readoutHeight) record.visual.style.setProperty('--process-readout-height', record.previous.readoutHeight, record.previous.readoutHeightPriority)
      else record.visual.style.removeProperty('--process-readout-height')
      for (const [name, value, priority] of record.previous.structureRatios) {
        if (value) record.visual.style.setProperty(name, value, priority)
        else record.visual.style.removeProperty(name)
      }
      record.visual.querySelectorAll('[data-lean-preview], .project-research__paper').forEach(preview => preview.style.removeProperty('--process-document-scale'))
    }
  }
}
