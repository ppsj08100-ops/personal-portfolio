import { initProjectResearch } from './project-research.js'
import './project-structure-controls.css'
const structureMeetings = {
  '0903': { date: '2026.09.03', node: '463-1564' },
  '0908': { date: '2026.09.08', node: '901-278' },
  '0917': { date: '2026.09.17', node: '1837-848' },
}
const documents = {
  meeting: {
    title: '딥디크 팀 회의록', caption: '팀 회의록 · 원문 3장', node: '293-220',
    label: '01 / TEAM ALIGNMENT',
    insight: '카테고리와 메뉴, 회원·비회원의 탐색 분기를 함께 논의했습니다.',
    source: '회의록 페이지 · 정보구조 설계 및 린캔버스 OKR 검증',
  },
  menu: {
    title: '딥디크 메뉴트리', caption: '메뉴트리 · GNB / 최대 3Depth', node: '3675-9424',
    label: '02 / INFORMATION ARCHITECTURE',
    insight: '상품·브랜드·향 탐색을 구분하고, 최대 세 단계로 연결했습니다.',
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
    insight: '화면별 기능과 반응형 조건을 58개 요구사항으로 정리했습니다.',
    source: '자료 분석 페이지 · 최신 IA와 퍼소나 흐름에 따른 기획 요구사항 58개',
  },
}

const flows = {
  1: { name: '이수진 · 기존 고객형', node: '3109-8278', insight: '공식 정보 확인에서 관심 제품 저장과 재구매로 이어지는 경로를 설계했습니다.' },
  2: { name: '박지은 · 브랜드 몰입형', node: '3109-8869', insight: '브랜드 역사와 향의 이야기에서 제품 상세·구매로 이어지는 경로를 설계했습니다.' },
  3: { name: '최동민 · 향 탐색형', node: '749-4903', insight: 'GALERIE에서 향의 분위기를 비교하고 관심 향 저장과 제품 탐색으로 이어지도록 계획했습니다.' },
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
  const meetingControls = [...section.querySelectorAll('[data-structure-meetings]')]
  const meetingButtons = [...section.querySelectorAll('[data-structure-meeting]')]
  const meetingTemplate = section.querySelector('[data-research-document="meeting"]')
  const template = section.querySelector('[data-research-document="flow"]')
  const sourceLink = section.querySelector('[data-structure-source]')
  const originalLink = dialog.querySelector('[data-structure-original]')
  const zoomButtons = [...dialog.querySelectorAll('[data-structure-zoom]')]
  let selectedFlow = '2'
  let selectedMeeting = '0903'

  function sizeDocument(image) {
    if (!image) return
    const document = image.closest('.structure-document')
    if (!document) return
    document.style.setProperty('--structure-document-width', `${image.getAttribute('width')}px`)
    document.style.setProperty('--structure-document-height', `${image.getAttribute('height')}px`)
    document.style.setProperty('--structure-original-width', `${image.getAttribute('width')}px`)
  }

  function showMeeting() {
    for (const root of [meetingTemplate.content, section]) {
      root.querySelectorAll('[data-structure-meeting-source]').forEach(image => {
        image.hidden = image.dataset.structureMeetingSource !== selectedMeeting
        if (!image.hidden) sizeDocument(image)
      })
    }
    meetingButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.structureMeeting === selectedMeeting)))
    section.dataset.structureMeeting = selectedMeeting
  }

  function showFlow(root) {
    root.querySelectorAll('[data-structure-flow-image]').forEach(image => {
      image.hidden = image.dataset.structureFlowImage !== selectedFlow
      if (!image.hidden) sizeDocument(image)
    })
  }

  function describe(key) {
    const doc = documents[key]
    const flow = flows[selectedFlow]
    flowControls.hidden = key !== 'flow'
    meetingControls.forEach(controls => { controls.hidden = key !== 'meeting' })
    section.querySelector('.process-dialog__context').hidden = key === 'meeting'
    sourceLink.title = doc.source
    const node = key === 'meeting' ? structureMeetings[selectedMeeting].node : key === 'flow' ? flow.node : doc.node
    sourceLink.href = `https://www.figma.com/design/srssqZHNPbxBDzXAwby1u6/DIPTYQUE-renewal-project?node-id=${node}`
    sourceLink.setAttribute('aria-label', `${doc.title}${key === 'flow' ? ` — ${flow.name}` : ''} Figma 원본 열기 (새 탭)`)
    section.querySelector('[data-structure-document-number]').textContent = doc.label.slice(0, 2)
    if (key === 'flow') {
      section.querySelector('[data-research-caption]').textContent = '사용자 플로우차트 · 세 사용자 유형'
      section.querySelector('[data-research-insight]').textContent = flow.insight
      opener.setAttribute('aria-label', '딥디크 사용자 플로우차트 세 자료 크게 보기')
    } else if (key === 'meeting') {
      opener.setAttribute('aria-label', '팀 회의록 원문 세 자료 크게 보기')
    }
  }

  showMeeting()
  section.querySelectorAll('template[data-research-document]').forEach(template => {
    const image = [...template.content.querySelectorAll('img')].find(image => !image.hidden)
    sizeDocument(image)
  })
  showFlow(template.content)
  section.dataset.structureFlow = selectedFlow
  flowButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.structureFlow === selectedFlow)))
  const destroyDocuments = initProjectResearch(section, { documents, initial: 'menu', onSelect: describe })

  flowButtons.forEach(button => button.addEventListener('click', () => {
    selectedFlow = button.dataset.structureFlow
    flowButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)))
    showFlow(template.content)
    showFlow(section)
    section.dataset.structureFlow = selectedFlow
    describe('flow')
    syncDialog()
  }, { signal }))
  meetingButtons.forEach(button => button.addEventListener('click', () => {
    selectedMeeting = button.dataset.structureMeeting
    showMeeting()
    describe('meeting')
    syncDialog()
  }, { signal }))

  function zoom(mode) {
    dialog.dataset.imageZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.structureZoom === mode)))
    const view = full.querySelector('.structure-document')
    view.tabIndex = mode === 'original' ? 0 : -1
    view.setAttribute('aria-label', `${dialog.querySelector('h2').textContent} — 방향키 또는 스크롤로 이동`)
    view.scrollTo({ left: 0, top: 0, behavior: 'instant' })
  }

  function syncDialog() {
    if (!dialog.open) return
    const key = section.dataset.researchActive
    const image = [...full.querySelectorAll('img')].find(item => !item.hidden)
    dialog.querySelector('h2').textContent = `${documents[key].title}${key === 'flow' ? ` · ${flows[selectedFlow].name.split(' · ')[0]}` : key === 'meeting' ? ` · ${structureMeetings[selectedMeeting].date}` : ''}`
    originalLink.href = image.src
    originalLink.setAttribute('aria-label', `${opener.getAttribute('aria-label').replace(' 크게 보기', '')} 원본 이미지 열기 (새 탭)`)
    zoom('fit')
  }
  opener.addEventListener('click', syncDialog, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.structureZoom), { signal }))

  return () => {
    controller.abort()
    destroyDocuments()
    delete dialog.dataset.imageZoom
    delete section.dataset.structureMeeting
    delete section.dataset.structureFlow
  }
}
