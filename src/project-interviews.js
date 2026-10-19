import { initProjectResearch } from './project-research.js'

const documents = {
  original: { title: '딥디크 인터뷰 원문', caption: '인터뷰 원문 · 자료 연결 예정', label: 'INTERVIEW RECORDS / SOURCE PENDING', insight: '어피니티 자료에 정리된 의견의 맥락을 살펴보기 위해,\n인터뷰 원문을 연결할 자리입니다.' },
  questions: { title: '딥디크 인터뷰 질문안', caption: '인터뷰 질문 · 후속 조사 질문안', label: 'INTERVIEW GUIDE / DRAFT', insight: '향을 고르는 기준부터 온라인과 시향의 차이까지,\n사용자의 실제 탐색 경험을 듣기 위한 질문안입니다.' },
  summary: { title: '딥디크 사용자 의견 요약', caption: '응답 요약 · 어피니티 자료 기준', label: 'USER NEEDS → DESIGN DIRECTION', insight: '브랜드 감성, 향의 이해, 비교와 첫 화면, 시향의 연결.\n자료에 담긴 의견을 다섯 가지 디자인 주제로 정리했습니다.' },
  affinity: { title: '딥디크 어피니티 다이어그램', caption: '어피니티 다이어그램', label: 'USER VOICES → DESIGN THEMES', insight: '향을 상상하기 쉽게, 비교는 명확하게.\n온라인에서도 딥디크의 세계를 느끼도록.' },
}

export function initProjectInterviews(section) {
  if (!section) return () => {}
  const destroyDocuments = initProjectResearch(section, { documents, initial: 'affinity' })
  const controller = new AbortController()
  const { signal } = controller
  const dialog = section.querySelector('dialog')
  const tools = section.querySelector('[data-interview-image-tools]')
  const zoomButtons = [...section.querySelectorAll('[data-interview-zoom]')]
  function zoom(mode) {
    dialog.dataset.imageZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.interviewZoom === mode)))
    const image = dialog.querySelector('.interview-affinity')
    if (image) {
      image.tabIndex = mode === 'original' ? 0 : -1
      image.setAttribute('aria-label', '딥디크 어피니티 다이어그램 — 방향키 또는 스크롤로 이동')
      image.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    }
  }
  section.querySelector('[data-research-open]').addEventListener('click', () => {
    tools.hidden = section.dataset.researchActive !== 'affinity'
    zoom('fit')
  }, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.interviewZoom), { signal }))
  return () => { controller.abort(); destroyDocuments(); delete dialog.dataset.imageZoom }
}
