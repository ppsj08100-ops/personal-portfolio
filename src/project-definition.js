import { initProjectResearch } from './project-research.js'

const documentTypes = {
  persona: { title: '딥디크 퍼소나', caption: '퍼소나', label: 'PERSONA', insight: '' },
  journey: { title: '딥디크 사용자 저니맵', caption: '저니맵', label: 'USER JOURNEY', insight: '' },
  canvas: { title: '딥디크 린캔버스', caption: '린캔버스', label: 'LEAN CANVAS', insight: '' },
}

const users = {
  1: {
    name: '이수진', type: '기존 고객형', label: 'SECONDARY PERSONA',
    persona: '공식 제품 정보와 브랜드 소식을 한곳에서 확인하고 싶은 사용자.\n관심 제품을 저장하고 다시 찾기 쉬운 탐색을 계획했습니다.',
    journey: '브랜드 소식과 제품 정보가 여러 채널에 흩어지는 여정.\n공식 정보 탐색부터 관심 제품 관리·재구매까지 연결합니다.',
    canvas: '공식 정보와 제품 탐색을 하나의 채널로.\n브랜드 소식·제품 정보·저장·재구매가 이어지는 경험을 가설로 정리했습니다.',
  },
  2: {
    name: '박지은', type: '브랜드 몰입형', label: 'PRIMARY PERSONA',
    persona: '브랜드의 분위기와 향의 이야기를 깊이 경험하고 싶은 사용자.\n이야기에서 관심 제품을 발견하는 흐름을 설계했습니다.',
    journey: '브랜드 탐색에서 향의 이야기, 제품 발견으로 이어지는 여정.\n이야기와 제품의 연결이 약해지는 지점을 찾아 경험을 이어줍니다.',
    canvas: '제품을 보기 전에, 딥디크의 세계를 경험하도록.\n몰입형 메인·스토리 아카이브·관련 제품 연결을 해결 가설로 정리했습니다.',
  },
  3: {
    name: '최동민', type: '향 탐색형', label: 'SECONDARY PERSONA',
    persona: '전문적인 향 지식 없이 나에게 맞는 향을 찾고 싶은 사용자.\n장면과 분위기로 향을 이해하고 후보를 비교하도록 계획했습니다.',
    journey: '향 찾기에서 취향 발견, 추천 향 비교와 선택 판단까지.\n짧은 질문과 추천 이유를 통해 선택의 근거를 이해하도록 연결합니다.',
    canvas: '향 용어를 해석하는 탐색에서, 장면으로 이해하는 탐색으로.\n취향 질문·추천 이유·제품 차이 비교가 선택의 확신을 돕는지 검증합니다.',
  },
}

export function initProjectDefinition(section) {
  if (!section) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const userButtons = [...section.querySelectorAll('[data-definition-user]')]
  const templates = [...section.querySelectorAll('template[data-research-document]')]
  const dialog = section.querySelector('dialog')
  const opener = section.querySelector('[data-research-open]')
  const originalLink = dialog.querySelector('[data-definition-original]')
  const zoomButtons = [...dialog.querySelectorAll('[data-definition-zoom]')]
  let selectedUser = '2'

  function describe(key) {
    const user = users[selectedUser]
    const doc = documentTypes[key]
    section.querySelector('[data-research-caption]').textContent = `${user.name} · ${user.type} / ${doc.caption}`
    section.querySelector('[data-research-insight-label]').textContent = key === 'persona'
      ? `0${selectedUser} / ${user.label} · ${user.name}`
      : `0${selectedUser} / ${doc.label} · ${user.type}`
    section.querySelector('[data-research-insight]').textContent = user[key]
    section.querySelector('[data-definition-canvas-note]').hidden = key !== 'canvas'
    opener.setAttribute('aria-label', `${doc.title} — ${user.name}, ${user.type} 크게 보기`)
  }

  function showUser(root) {
    root.querySelectorAll('[data-definition-image]').forEach(image => {
      image.hidden = image.dataset.definitionImage !== selectedUser
    })
  }

  templates.forEach(template => showUser(template.content))
  userButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.definitionUser === selectedUser)))
  const destroyDocuments = initProjectResearch(section, {
    documents: documentTypes, initial: 'persona', onSelect: describe,
  })

  userButtons.forEach(button => button.addEventListener('click', () => {
    selectedUser = button.dataset.definitionUser
    userButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)))
    templates.forEach(template => showUser(template.content))
    showUser(section)
    describe(section.dataset.researchActive)
  }, { signal }))

  function zoom(mode) {
    dialog.dataset.imageZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.definitionZoom === mode)))
    const view = dialog.querySelector('.definition-document')
    if (view) {
      view.tabIndex = mode === 'original' ? 0 : -1
      view.setAttribute('aria-label', `${dialog.querySelector('h2').textContent} — 방향키 또는 스크롤로 이동`)
      view.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    }
  }

  opener.addEventListener('click', () => {
    const user = users[selectedUser]
    const doc = documentTypes[section.dataset.researchActive]
    const image = dialog.querySelector(`img[data-definition-image="${selectedUser}"]`)
    dialog.querySelector('h2').textContent = `${doc.title} · ${user.name}`
    originalLink.href = image.src
    originalLink.setAttribute('aria-label', `${doc.title} — ${user.type} 원본 이미지 열기 (새 탭)`)
    zoom('fit')
  }, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.definitionZoom), { signal }))

  return () => {
    controller.abort()
    destroyDocuments()
    delete dialog.dataset.imageZoom
  }
}
