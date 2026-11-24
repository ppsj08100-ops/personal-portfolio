import { initProjectResearch } from './project-research.js'

const documents = {
  survey: {
    title: '딥티크 설문 자료', caption: '설문 자료 · 3장',
    description: '설문으로 온라인에서 향과 제품을 탐색하는 과정을 살펴봤습니다. 정보 탐색의 불편함과 브랜드 경험에 대한 기대를 개선 방향으로 정리했습니다.',
  },
  interview: {
    title: '딥티크 사용자 인터뷰', caption: '인터뷰 · 질문과 응답',
    description: '웹사이트 이용 경험을 바탕으로 향수 비교의 어려움과 브랜드 콘텐츠에 대한 기대를 살펴봤습니다. 답변에서 드러난 불편함을 정리해 개선 방향을 구체화했습니다.',
  },
}

export function initProjectInterviews(section) {
  if (!section) return () => {}
  const description = section.querySelector('.project-research__description')
  const originalDescription = description.textContent
  const destroyDocuments = initProjectResearch(section, {
    documents, initial: 'survey',
    onSelect(key) {
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

  // The third survey source contains two captures surrounded by gray browser
  // canvas. Fit those content regions only in the inert companion preview.
  // The original source file and the dialog's full document stay untouched.
  function fitSurveyCompanion() {
    section.querySelectorAll("[data-process-preview-key='survey-03'] .process-mini-document:not(.survey-preview--cropped)").forEach(preview => {
      const source = preview.querySelector('img')
      if (!source) return
      const parts = ['overview', 'comments'].map(name => {
        const segment = document.createElement('div')
        segment.className = `survey-preview__segment survey-preview__segment--${name}`
        const image = source.cloneNode(true)
        image.alt = ''
        segment.append(image)
        return segment
      })
      const label = document.createElement('p')
      label.className = 'survey-preview__label'
      label.textContent = '의견'
      preview.classList.add('survey-preview--cropped')
      preview.replaceChildren(parts[0], label, parts[1])
    })
  }
  const companionObserver = new MutationObserver(fitSurveyCompanion)
  companionObserver.observe(section, { childList: true, subtree: true })
  fitSurveyCompanion()

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
    companionObserver.disconnect()
    destroyDocuments()
    description.textContent = originalDescription
    delete dialog.dataset.imageZoom
  }
}
