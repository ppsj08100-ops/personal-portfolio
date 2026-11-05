import { initProjectResearch } from './project-research.js'

const documents = {
  survey: {
    title: '딥티크 설문 자료', caption: '설문 자료 · 3장',
    heading: '사용자 조사와 분석',
    description: '설문과 인터뷰를 통해 사용자가 딥티크 온라인 사이트에서 제품과 향을 탐색하는 과정을 살펴봤습니다. 정보 탐색의 불편함과 브랜드 경험에 대한 기대를 분석하고, 이를 바탕으로 주요 개선 방향을 정리했습니다.',
  },
  interview: {
    title: '딥티크 사용자 인터뷰', caption: '인터뷰 · 질문과 응답',
    heading: '사용자 인터뷰와 분석',
    description: '딥티크 웹사이트 이용 경험을 바탕으로 제품 탐색 과정에서 느끼는 불편함과 브랜드 콘텐츠에 대한 기대를 살펴봤습니다. 인터뷰 답변을 통해 향수 비교의 어려움과 브랜드 스토리 전달의 아쉬움을 파악하고, 개선 방향을 구체화했습니다.',
  },
}

export function initProjectInterviews(section) {
  if (!section) return () => {}
  const heading = section.querySelector('.project-research__title')
  const description = section.querySelector('.project-research__description')
  const originalCopy = { heading: heading.textContent, description: description.textContent }
  const destroyDocuments = initProjectResearch(section, {
    documents, initial: 'survey',
    onSelect(key) {
      heading.textContent = documents[key].heading
      description.textContent = documents[key].description
    },
  })
  const controller = new AbortController()
  const { signal } = controller
  const dialog = section.querySelector('dialog')
  const pages = dialog.querySelector('[data-interview-pages]')
  const pageButtons = [...pages.querySelectorAll('[data-interview-page]')]
  const zoomButtons = [...dialog.querySelectorAll('[data-interview-zoom]')]
  const originalLink = dialog.querySelector('[data-interview-original]')

  function zoom(mode, focus = false) {
    const view = dialog.querySelector('.user-research-document')
    if (!view) return
    dialog.dataset.imageZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.interviewZoom === mode)))
    view.tabIndex = mode === 'original' ? 0 : -1
    view.setAttribute('aria-label', `${documents[section.dataset.researchActive].title} — 방향키 또는 스크롤로 이동`)
    view.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    if (focus && mode === 'original') view.focus({ preventScroll: true })
  }

  function selectPage(index) {
    const images = [...dialog.querySelectorAll('.user-research-document > img')]
    const active = images[index]
    if (!active) return
    images.forEach((image, i) => { image.hidden = i !== index })
    pageButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.interviewPage) === index)))
    originalLink.href = active.getAttribute('src')
    const view = active.parentElement
    view.style.setProperty('--source-width', `${active.getAttribute('width')}px`)
    zoom('fit')
  }

  section.querySelector('[data-research-open]').addEventListener('click', () => {
    const survey = section.dataset.researchActive === 'survey'
    pages.hidden = !survey
    selectPage(survey ? 1 : 0)
  }, { signal })
  pageButtons.forEach(button => button.addEventListener('click', () => selectPage(Number(button.dataset.interviewPage)), { signal }))
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.interviewZoom, true), { signal }))

  return () => {
    controller.abort()
    destroyDocuments()
    heading.textContent = originalCopy.heading
    description.textContent = originalCopy.description
    delete dialog.dataset.imageZoom
  }
}
