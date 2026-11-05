import './project-research-threec.css'

const researchDocuments = {
  brand: {
    title: '딥디크 자사 분석', caption: '자사 분석',
    label: 'BRAND AUDIT → RENEWAL OPPORTUNITY',
    insight: '상품 정보에서 한 걸음 더 나아가,\n향의 기억과 원료, 분위기를 발견하는 경험으로.',
  },
  competition: {
    title: '딥디크 경쟁사 분석', caption: '경쟁사 분석',
    label: 'COMPETITIVE RESEARCH → DIPTYQUE DIRECTION',
    insight: '조말론·르라보·바이레도의 스토리와 탐색 방식을 비교해,\n딥디크의 향 이야기와 이해하기 쉬운 선택 흐름으로.',
  },
  steep: {
    title: '딥디크 STEEP 분석', caption: 'STEEP 분석',
    label: 'STEEP → EXPERIENCE DIRECTION',
    insight: '자기표현과 브랜드 가치, 디지털 탐색을 연결해\n감각적이면서 신뢰할 수 있는 향 경험으로.',
  },
  threec: {
    title: '딥디크 3C 분석', caption: '3C 분석',
    label: 'CUSTOMER · COMPETITOR · COMPANY → INSIGHT',
    insight: '고객의 빠르고 명확한 탐색과 딥디크의 감성·세계관을 연결해\n빠르게 찾고, 깊게 경험하고, 자연스럽게 구매하는 온라인 경험으로.',
    image: '/images/research/diptyque-threec-original-v1.webp',
  },
}

export function initProjectResearch(section, { documents = researchDocuments, initial = 'brand', onSelect } = {}) {
  if (!section) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const tabs = [...section.querySelectorAll('[data-research-tab]')]
  const previews = [...section.querySelectorAll('[data-research-preview]')]
  const dialog = section.querySelector('dialog')
  const full = section.querySelector('[data-research-full]')
  const opener = section.querySelector('[data-research-open]')
  const imageTools = dialog.querySelector('[data-research-image-tools]')
  const imageZoomButtons = [...dialog.querySelectorAll('[data-research-image-zoom]')]
  const originalImageLink = dialog.querySelector('[data-research-image-original]')
  const templates = Object.fromEntries(Object.keys(documents).map(key => [key, section.querySelector(`[data-research-document="${key}"]`)]))
  let active = initial
  function imageZoom(mode) {
    if (!imageTools || !documents[active].image) return
    dialog.dataset.threecZoom = mode
    imageZoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.researchImageZoom === mode)))
    const view = full.querySelector('.research-threec')
    if (!view) return
    view.tabIndex = mode === 'original' ? 0 : -1
    view.setAttribute('aria-label', `${documents[active].title} — 방향키 또는 스크롤로 이동`)
    view.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    if (mode === 'original') view.focus({ preventScroll: true })
  }
  const fit = () => previews.forEach(preview => {
    if (preview.clientWidth) preview.style.setProperty('--research-document-scale', preview.clientWidth / preview.firstElementChild.offsetWidth)
  })
  const observer = new ResizeObserver(fit)
  previews.forEach(preview => {
    preview.replaceChildren(templates[preview.dataset.researchPreview].content.cloneNode(true))
    observer.observe(preview)
  })

  function select(key, focus = false) {
    if (!documents[key]) return
    active = key
    tabs.forEach(tab => {
      const selected = tab.dataset.researchTab === key
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
      section.querySelector(`#${tab.getAttribute('aria-controls')}`).hidden = !selected
      if (selected && focus) tab.focus()
    })
    section.querySelector('[data-research-caption]').textContent = documents[key].caption
    const insightLabel = section.querySelector('[data-research-insight-label]')
    const insight = section.querySelector('[data-research-insight]')
    if (insightLabel) insightLabel.textContent = documents[key].label
    if (insight) insight.textContent = documents[key].insight
    opener.setAttribute('aria-label', `${documents[key].title} 크게 보기`)
    section.dataset.researchActive = key
    fit()
    onSelect?.(key)
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.researchTab), { signal })
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key]
      if (next === undefined) return
      event.preventDefault()
      select(tabs[next].dataset.researchTab, true)
    }, { signal })
  })
  opener.hidden = false
  opener.addEventListener('click', () => {
    dialog.querySelector('h2').textContent = documents[active].title
    full.replaceChildren(templates[active].content.cloneNode(true))
    if (imageTools) {
      imageTools.hidden = !documents[active].image
      if (documents[active].image) originalImageLink.href = documents[active].image
      else delete dialog.dataset.threecZoom
    }
    dialog.showModal()
    dialog.scrollTop = 0
    imageZoom('fit')
  }, { signal })
  imageZoomButtons.forEach(button => button.addEventListener('click', () => imageZoom(button.dataset.researchImageZoom), { signal }))
  section.querySelector('[data-research-close]').addEventListener('click', () => dialog.close(), { signal })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  }, { signal })
  select(active)
  return () => {
    if (dialog.open) dialog.close()
    controller.abort()
    observer.disconnect()
    previews.forEach(preview => preview.replaceChildren())
    full.replaceChildren()
    opener.hidden = true
    delete section.dataset.researchActive
    delete dialog.dataset.threecZoom
    if (imageTools) imageTools.hidden = true
  }
}
