import { initProjectResearch } from './project-research.js'

const fileUrl = 'https://www.figma.com/design/srssqZHNPbxBDzXAwby1u6/1%EC%A1%B0--DIPTYQUE-renewal-project--Copy-'
const documents = {
  moodboard: {
    title: '딥디크 디자인 무드보드', caption: '무드보드 · 향과 장면, 이야기를 하나의 무드로',
    label: '01 / VISUAL MOOD',
    insight: '펜드로잉과 종이 콜라주, 식물 모티프를 중심으로\n향의 이야기와 아카이브의 분위기를 하나의 화면 언어로 모았습니다.',
    keywords: ['PEN DRAWING', 'PAPER COLLAGE', 'BOTANICAL', 'ARCHIVE', 'VINTAGE TEXTURE'],
    source: '딥디크 리뉴얼 · Design Mood Board', node: '3823-5795',
  },
  mindmap: {
    title: '딥디크 디자인 마인드맵', caption: '디자인 마인드맵 · 브랜드의 이미지와 이야기 확장',
    label: '02 / BRAND ASSOCIATIONS',
    insight: '자연·향수·파리·창립자·예술·여행·기억에서\n원료와 장소, 드로잉과 감정으로 확장해 비주얼 방향의 기준을 세웠습니다.',
    keywords: ['SCENT', 'SCENE', 'STORY', 'MEMORY'],
    source: '딥디크 리뉴얼 · Design Mind Map', node: '3624-10747',
  },
}

export function initProjectVisual(section) {
  if (!section) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const dialog = section.querySelector('dialog')
  const opener = section.querySelector('[data-research-open]')
  const keywords = section.querySelector('[data-visual-keywords]')
  const sourceLink = section.querySelector('[data-visual-source]')
  const sourceCaption = section.querySelector('[data-visual-source-caption]')
  const originalLink = dialog.querySelector('[data-visual-original]')
  const zoomButtons = [...dialog.querySelectorAll('[data-visual-zoom]')]

  const destroyDocuments = initProjectResearch(section, {
    documents, initial: 'moodboard',
    onSelect(key) {
      const doc = documents[key]
      keywords.replaceChildren(...doc.keywords.map(word => {
        const item = document.createElement('li')
        item.textContent = word
        return item
      }))
      sourceCaption.textContent = doc.source
      sourceLink.href = `${fileUrl}?node-id=${doc.node}`
      sourceLink.setAttribute('aria-label', `${doc.title} Figma 장표 열기 (새 탭)`)
      section.querySelector('[data-visual-document-number]').textContent = doc.label.slice(0, 2)
    },
  })

  function zoom(mode) {
    dialog.dataset.imageZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.visualZoom === mode)))
    const view = dialog.querySelector('.visual-document')
    view.tabIndex = mode === 'original' ? 0 : -1
    view.setAttribute('aria-label', `${dialog.querySelector('h2').textContent} — 방향키 또는 스크롤로 이동`)
    view.scrollTo({ left: 0, top: 0, behavior: 'instant' })
  }

  opener.addEventListener('click', () => {
    const image = dialog.querySelector('img')
    originalLink.href = image.src
    originalLink.setAttribute('aria-label', `${documents[section.dataset.researchActive].title} 원본 이미지 열기 (새 탭)`)
    zoom('fit')
  }, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.visualZoom), { signal }))

  return () => {
    controller.abort()
    destroyDocuments()
    delete dialog.dataset.imageZoom
  }
}
