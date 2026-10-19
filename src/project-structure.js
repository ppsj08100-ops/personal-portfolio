import { initProjectResearch } from './project-research.js'

const fileUrl = 'https://www.figma.com/design/srssqZHNPbxBDzXAwby1u6/1%EC%A1%B0--DIPTYQUE-renewal-project--Copy-'
const documents = {
  meeting: {
    title: '딥디크 팀 회의록', caption: '구조 설계 회의록 · 2026.09.03', node: '463-1564',
    label: '01 / TEAM ALIGNMENT',
    insight: '카테고리와 메뉴를 함께 정하고,\n사용자 흐름의 회원·비회원 분기까지 논의했습니다.',
    source: '회의록 페이지 · 정보구조 설계 및 린캔버스 OKR 검증',
  },
  menu: {
    title: '딥디크 메뉴트리', caption: '메뉴트리 · GNB / 최대 3Depth', node: '3675-9424',
    label: '02 / INFORMATION ARCHITECTURE',
    insight: '상품 탐색·브랜드 이야기·향의 발견을 구분하고,\n최대 세 단계 안에서 각 화면으로 이어지도록 구성했습니다.',
    source: '장표 페이지 · Information Structure Diagram',
  },
  flow: {
    title: '딥디크 사용자 플로우차트', caption: '사용자 플로우차트', node: '3109-8869',
    label: '03 / PERSONA-BASED FLOWS', insight: '',
    source: '자료 분석 페이지 · 퍼소나 기반 플로우차트 3종',
  },
  requirements: {
    title: '딥디크 요구사항 정의서', caption: '요구사항 정의서 · 2026.09.22 수정본', node: '3132-11096',
    label: '04 / REQUIREMENTS DEFINITION',
    insight: '메뉴와 퍼소나 흐름을 바탕으로,\n화면별 기능과 반응형 조건을 58개 항목으로 정리했습니다.',
    source: '자료 분석 페이지 · 최신 IA와 퍼소나 흐름에 따른 기획 요구사항 58개',
  },
}

const flows = {
  1: { name: '이수진 · 기존 고객형', node: '3109-8278', insight: '공식 정보를 확인하고 관심 제품을 저장하는 흐름.\n이전 주문에서 제품을 다시 찾고 구매하는 경로까지 연결했습니다.' },
  2: { name: '박지은 · 브랜드 몰입형', node: '3109-8869', insight: '브랜드 역사에서 향의 이야기, 관심 제품으로.\n스토리 탐색 뒤 상품 상세와 구매로 이어지는 흐름을 설계했습니다.' },
  3: { name: '최동민 · 향 탐색형', node: '749-4903', insight: 'GALERIE의 비주얼 카드로 향의 분위기를 비교하고,\n관심 향을 저장하거나 연결된 제품을 살펴보도록 계획했습니다.' },
}

export function initProjectStructure(section) {
  if (!section) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const dialog = section.querySelector('dialog')
  const opener = section.querySelector('[data-research-open]')
  const full = section.querySelector('[data-research-full]')
  const flowControls = section.querySelector('[data-structure-flows]')
  const flowButtons = [...section.querySelectorAll('[data-structure-flow]')]
  const template = section.querySelector('[data-research-document="flow"]')
  const sourceLink = section.querySelector('[data-structure-source]')
  const sourceCaption = section.querySelector('[data-structure-source-caption]')
  const originalLink = dialog.querySelector('[data-structure-original]')
  const zoomButtons = [...dialog.querySelectorAll('[data-structure-zoom]')]
  let selectedFlow = '2'

  function showFlow(root) {
    root.querySelectorAll('[data-structure-flow-image]').forEach(image => {
      image.hidden = image.dataset.structureFlowImage !== selectedFlow
    })
  }

  function describe(key) {
    const doc = documents[key]
    const flow = flows[selectedFlow]
    flowControls.hidden = key !== 'flow'
    sourceCaption.textContent = doc.source
    sourceLink.href = `${fileUrl}?node-id=${key === 'flow' ? flow.node : doc.node}`
    sourceLink.setAttribute('aria-label', `${doc.title}${key === 'flow' ? ` — ${flow.name}` : ''} Figma 원본 열기 (새 탭)`)
    section.querySelector('[data-structure-document-number]').textContent = doc.label.slice(0, 2)
    if (key === 'flow') {
      section.querySelector('[data-research-caption]').textContent = `사용자 플로우차트 · ${flow.name}`
      section.querySelector('[data-research-insight]').textContent = flow.insight
      opener.setAttribute('aria-label', `딥디크 사용자 플로우차트 — ${flow.name} 크게 보기`)
    }
  }

  showFlow(template.content)
  flowButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.structureFlow === selectedFlow)))
  const destroyDocuments = initProjectResearch(section, { documents, initial: 'menu', onSelect: describe })

  flowButtons.forEach(button => button.addEventListener('click', () => {
    selectedFlow = button.dataset.structureFlow
    flowButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)))
    showFlow(template.content)
    showFlow(section)
    describe('flow')
  }, { signal }))

  function zoom(mode) {
    dialog.dataset.imageZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.structureZoom === mode)))
    const view = full.querySelector('.structure-document')
    view.tabIndex = mode === 'original' ? 0 : -1
    view.setAttribute('aria-label', `${dialog.querySelector('h2').textContent} — 방향키 또는 스크롤로 이동`)
    view.scrollTo({ left: 0, top: 0, behavior: 'instant' })
  }

  opener.addEventListener('click', () => {
    const key = section.dataset.researchActive
    const image = [...full.querySelectorAll('img')].find(item => !item.hidden)
    dialog.querySelector('h2').textContent = `${documents[key].title}${key === 'flow' ? ` · ${flows[selectedFlow].name.split(' · ')[0]}` : ''}`
    originalLink.href = image.src
    originalLink.setAttribute('aria-label', `${opener.getAttribute('aria-label').replace(' 크게 보기', '')} 원본 이미지 열기 (새 탭)`)
    zoom('fit')
  }, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.structureZoom), { signal }))

  return () => {
    controller.abort()
    destroyDocuments()
    delete dialog.dataset.imageZoom
  }
}
