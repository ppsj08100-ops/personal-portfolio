import { initProjectResearch } from './project-research.js'

const fileUrl = 'https://www.figma.com/design/srssqZHNPbxBDzXAwby1u6/1%EC%A1%B0--DIPTYQUE-renewal-project--Copy-'
const documents = {
  wireframe: {
    title: '딥디크 와이어프레임', caption: '와이어프레임 · 정보의 순서를 화면의 흐름으로',
    label: '01 / WIREFRAME',
    insight: '브랜드의 이야기에서 향의 발견으로 이어지도록\n영상·이미지·텍스트의 비중과 주요 화면의 레이아웃을 구체화했습니다.',
    keywords: ['CONTENT HIERARCHY', 'SCREEN FLOW', 'LAYOUT'],
    source: '딥디크 리뉴얼 · Wireframe', node: '3823-5803',
    original: '/images/project-diptyque-screens-wireframe.png',
  },
  system: {
    title: '딥디크 디자인 시스템', caption: '디자인 시스템 · 색과 타이포그래피의 공통 기준',
    label: '02 / DESIGN SYSTEM',
    insight: '아이보리와 잉크 블랙을 바탕으로 세이지·앰버를 더하고,\nEB Garamond·KoPub 바탕·KoPubWorldDotum으로 제목과 본문의 위계를 정했습니다.',
    keywords: ['COLOR', 'TYPOGRAPHY', 'LOGO'],
    source: '딥디크 리뉴얼 · Design System', node: '3480-3029',
    original: '/images/project-diptyque-screens-system.png',
  },
  components: {
    title: '딥디크 공통 UI 컴포넌트', caption: '컴포넌트 · 내비게이션과 콘텐츠 탐색 요소',
    label: '03 / UI COMPONENTS',
    insight: '로그인 상태에 따른 내비게이션과 카테고리 콘텐츠,\nView More 버튼의 기본·활성 상태를 공통 요소로 정리했습니다.',
    keywords: ['NAVIGATION', 'CATEGORY', 'BUTTON STATES'],
    source: '딥디크 리뉴얼 · 공통 UI 컴포넌트', node: '2801-8420',
  },
}

export function initProjectScreens(section) {
  if (!section) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const dialog = section.querySelector('dialog')
  const full = dialog.querySelector('[data-research-full]')
  const sourceLink = section.querySelector('[data-screens-source]')
  const originalLink = dialog.querySelector('[data-screens-original]')
  const zoomButtons = [...dialog.querySelectorAll('[data-screens-zoom]')]
  let mode = 'fit'

  const destroyDocuments = initProjectResearch(section, {
    documents, initial: 'wireframe',
    onSelect(key) {
      const doc = documents[key]
      section.querySelector('[data-screens-keywords]').replaceChildren(...doc.keywords.map(word => {
        const item = document.createElement('li')
        item.textContent = word
        return item
      }))
      section.querySelector('[data-screens-source-caption]').textContent = doc.source
      section.querySelector('[data-screens-document-number]').textContent = doc.label.slice(0, 2)
      sourceLink.href = `${fileUrl}?node-id=${doc.node}`
      sourceLink.setAttribute('aria-label', `${doc.title} Figma 원본 보기 (새 탭)`)
    },
  })

  function fitDialog() {
    if (!dialog.open) return
    const chromeHeight = dialog.scrollHeight - full.offsetHeight
    const availableHeight = Math.max(150, innerHeight - chromeHeight - 48)
    const scale = mode === 'fit' ? Math.min(1, full.clientWidth / 1920, availableHeight / 1080) : 1
    full.style.setProperty('--screens-dialog-scale', scale)
    full.style.height = `${Math.min(availableHeight, 1080 * scale)}px`
    full.style.setProperty('--screens-dialog-left', `${mode === 'fit' ? Math.max(0, (full.clientWidth - 1920 * scale) / 2) : 0}px`)
  }

  function zoom(next) {
    mode = next
    dialog.dataset.imageZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.screensZoom === mode)))
    full.tabIndex = mode === 'original' ? 0 : -1
    full.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    fitDialog()
  }

  section.querySelector('[data-research-open]').addEventListener('click', () => {
    const doc = documents[section.dataset.researchActive]
    originalLink.href = doc.original ?? `${fileUrl}?node-id=${doc.node}`
    originalLink.querySelector('span').textContent = doc.original ? '원본 이미지 열기 ↗' : 'Figma 컴포넌트 보기 ↗'
    originalLink.setAttribute('aria-label', `${doc.title} 원본 보기 (새 탭)`)
    dialog.scrollTop = 0
    zoom('fit')
  }, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.screensZoom), { signal }))
  const observer = new ResizeObserver(fitDialog)
  observer.observe(full)
  window.addEventListener('resize', fitDialog, { signal })

  return () => {
    controller.abort()
    observer.disconnect()
    destroyDocuments()
    delete dialog.dataset.imageZoom
    full.removeAttribute('style')
    full.removeAttribute('tabindex')
  }
}
