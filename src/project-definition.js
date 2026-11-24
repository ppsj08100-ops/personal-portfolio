import { initProjectResearch } from './project-research.js'

const documentTypes = {
  persona: { title: '딥디크 퍼소나', caption: '퍼소나', label: 'PERSONA', insight: '' },
  journey: { title: '딥디크 사용자 저니맵', caption: '저니맵', label: 'USER JOURNEY', insight: '' },
  canvas: { title: '딥디크 린캔버스', caption: '린캔버스', label: 'LEAN CANVAS', insight: '' },
}

const users = {
  1: {
    name: '이수진', type: '기존 고객형', label: 'SECONDARY PERSONA',
    persona: '공식 정보와 관심 제품을 한곳에서 확인하고 다시 찾고 싶은 사용자입니다.',
    journey: '공식 정보 확인에서 관심 제품 저장과 재구매로 이어지는 경로입니다.',
    canvas: '브랜드 소식·제품 정보·저장·재구매를 한 채널로 연결하는 가설입니다.',
  },
  2: {
    name: '박지은', type: '브랜드 몰입형', label: 'PRIMARY PERSONA',
    persona: '향의 이야기와 브랜드 분위기를 깊이 경험하고 싶은 사용자입니다.',
    journey: '브랜드 탐색에서 향의 이야기와 관심 제품 발견으로 이어지는 경로입니다.',
    canvas: '몰입형 메인·스토리 아카이브·관련 제품 연결로 브랜드 경험을 확장하는 가설입니다.',
  },
  3: {
    name: '최동민', type: '향 탐색형', label: 'SECONDARY PERSONA',
    persona: '전문적인 향 지식 없이 취향에 맞는 향을 찾고 싶은 사용자입니다.',
    journey: '취향 질문에서 추천 이유 확인과 향 후보 비교로 이어지는 경로입니다.',
    canvas: '장면 표현·취향 질문·추천 이유·제품 비교가 선택의 확신을 돕는지 검증하는 가설입니다.',
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
    section.querySelector('[data-research-caption]').textContent = `${doc.caption} · 세 사용자 유형`
    section.querySelector('[data-research-insight-label]').textContent = key === 'persona'
      ? `0${selectedUser} / ${user.label} · ${user.name}`
      : `0${selectedUser} / ${doc.label} · ${user.type}`
    section.querySelector('[data-research-insight]').textContent = user[key]
    section.querySelector('[data-definition-canvas-note]').hidden = key !== 'canvas'
    opener.setAttribute('aria-label', `${doc.title} 세 사용자 자료 크게 보기`)
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
    syncDialog()
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

  function syncDialog() {
    if (!dialog.open) return
    const user = users[selectedUser]
    const doc = documentTypes[section.dataset.researchActive]
    const image = dialog.querySelector(`img[data-definition-image="${selectedUser}"]`)
    dialog.querySelector('h2').textContent = `${doc.title} · ${user.name}`
    originalLink.href = image.src
    originalLink.setAttribute('aria-label', `${doc.title} — ${user.type} 원본 이미지 열기 (새 탭)`)
    zoom('fit')
  }
  opener.addEventListener('click', syncDialog, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.definitionZoom), { signal }))

  return () => {
    controller.abort()
    destroyDocuments()
    delete dialog.dataset.imageZoom
  }
}
