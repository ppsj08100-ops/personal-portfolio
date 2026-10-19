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
  const templates = Object.fromEntries(Object.keys(documents).map(key => [key, section.querySelector(`[data-research-document="${key}"]`)]))
  let active = initial
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
    section.querySelector('[data-research-insight-label]').textContent = documents[key].label
    section.querySelector('[data-research-insight]').textContent = documents[key].insight
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
    dialog.showModal()
    dialog.scrollTop = 0
  }, { signal })
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
  }
}
