import { gsap } from 'gsap'
import { initSkillsWaterlight } from './skills-waterlight.js'
import { initSkillsCurrentTitle } from './skills-current-title.js'
import { initSkillDropEntry } from './skill-drop-entry.js'
import { initSkillReefLife } from './skill-reef-life.js'
import { initSkillsCoralCurrent } from './skills-coral-current.js'
import './skill-reef-life.css'
import './skills-coral-current.css'

const skills = {
  figma: {
    name: 'Figma', category: 'DESIGN',
    description: '와이어프레임부터 컴포넌트와 프로토타입까지, 화면의 구조와 흐름을 설계합니다.',
  },
  photoshop: {
    name: 'Photoshop', category: 'DESIGN',
    description: '이미지의 톤과 구도를 다듬고, 브랜드 분위기에 맞는 비주얼을 구성합니다.',
  },
  html: {
    name: 'HTML', category: 'FRONTEND',
    description: '콘텐츠의 의미와 읽는 순서를 생각하며, 웹페이지의 바탕이 되는 구조를 만듭니다.',
  },
  css: {
    name: 'CSS', category: 'FRONTEND',
    description: '화면 크기에 맞는 레이아웃과 섬세한 스타일로 디자인을 웹 화면에 옮깁니다.',
  },
  scss: {
    name: 'SCSS', category: 'FRONTEND',
    description: '변수와 스타일 구조를 정리해, 반복되는 디자인을 일관되게 관리합니다.',
  },
  javascript: {
    name: 'JavaScript', category: 'FRONTEND',
    description: '사용자 입력과 스크롤에 반응하는 움직임을 더해, 화면의 흐름을 연결합니다.',
  },
  react: {
    name: 'React', category: 'FRONTEND',
    description: '컴포넌트를 나누고 상태를 연결하며, 다시 사용할 수 있는 인터페이스를 구성합니다.',
  },
  git: {
    name: 'Git', category: 'WORKFLOW',
    description: '작업의 변경 이력을 기록하고, 필요한 시점을 확인하며 코드를 관리합니다.',
  },
  github: {
    name: 'GitHub', category: 'WORKFLOW',
    description: '저장소에서 작업물을 관리하고, 변경 내용을 공유하며 협업합니다.',
  },
  vercel: {
    name: 'Vercel', category: 'WORKFLOW',
    description: '완성한 웹사이트를 배포하고, 실제 화면과 동작을 확인합니다.',
  },
  gsap: {
    name: 'GSAP', category: 'INTERACTION',
    description: '요소의 등장 순서와 속도를 조절해, 작업 화면에 자연스러운 움직임과 전환을 더합니다.',
  },
  scrolltrigger: {
    name: 'ScrollTrigger', category: 'INTERACTION',
    description: '스크롤 위치와 장면의 전환을 연결해, 콘텐츠가 이어지는 타이밍을 조절합니다.',
  },
  scrolla: {
    name: 'Scrolla.js', category: 'INTERACTION',
    description: '스크롤에 따라 콘텐츠가 나타나는 동작을 적용해, 읽는 순서에 맞게 화면을 구성합니다.',
  },
  chatgpt: {
    name: 'ChatGPT', category: 'AI TOOLS',
    description: '아이디어를 정리하고, 카피와 코드 작업의 방향을 구체화하는 데 활용합니다.',
  },
  gemini: {
    name: 'Gemini', category: 'AI TOOLS',
    description: '레퍼런스와 정보를 살펴보고, 작업에 필요한 아이디어를 확장합니다.',
  },
  claude: {
    name: 'Claude', category: 'AI TOOLS',
    description: '텍스트와 코드의 구조를 검토하고, 작업 내용을 다듬는 데 활용합니다.',
  },
  'premiere-pro': {
    name: 'Premiere Pro', category: 'VIDEO',
    description: '영상의 컷과 흐름을 편집하고, 자막과 사운드를 더해 콘텐츠를 구성합니다.',
  },
  capcut: {
    name: 'CapCut', category: 'VIDEO',
    description: '숏폼 영상의 흐름과 자막을 다듬고, 화면 비율에 맞게 편집합니다.',
  },
}

export function initToolsSkills(section) {
  if (!section) return () => {}
  const scene = section.querySelector('[data-skills-reef]')
  const buttons = [...(scene?.querySelectorAll('[data-skill-node]') || [])]
    .filter(button => skills[button.dataset.skill])
  if (!scene || !buttons.length) return () => {}

  const name = section.querySelector('[data-skill-name]')
  const category = section.querySelector('[data-skill-category]')
  const description = section.querySelector('[data-skill-description]')
  const detail = section.querySelector('.skill-reef__detail')
  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  let finishArrival = () => {}
  const glints = buttons.map(button => {
    const glint = document.createElement('span')
    glint.className = 'skill-drop__glint'
    glint.setAttribute('aria-hidden', 'true')
    button.querySelector('.skill-drop__water')?.append(glint)
    return glint
  })
  let selected = buttons.find(button => button.dataset.skill === 'figma')?.dataset.skill || buttons[0].dataset.skill
  let previewed = ''
  let focused = ''

  function positionDetail(active) {
    if (!detail) return
    delete section.dataset.skillContextual
    detail.style.removeProperty('--skill-detail-left')
    detail.style.removeProperty('--skill-detail-top')
    if (!section.dataset.skillEngaged || innerWidth >= 1200) return
    const bounds = detail.getBoundingClientRect()
    if (bounds.top >= 16 && bounds.bottom <= innerHeight - 16) return
    const button = buttons.find(item => item.dataset.skill === active)
    const water = button?.querySelector('.skill-drop__water')
    if (!water) return

    // On the stacked reef, keep the explanation beside the chosen tool rather
    // than leaving it above the viewport. It travels with that tool on scroll.
    section.dataset.skillContextual = 'true'
    const panel = detail.getBoundingClientRect()
    const tool = water.getBoundingClientRect()
    const reef = scene.getBoundingClientRect()
    const left = Math.max(0, Math.min(reef.width - panel.width, tool.left + tool.width / 2 - reef.left - panel.width / 2))
    const above = tool.top - panel.height - 20
    const below = tool.bottom + 20
    const top = above >= 16 ? above : Math.min(below, innerHeight - panel.height - 16)
    detail.style.setProperty('--skill-detail-left', `${left}px`)
    detail.style.setProperty('--skill-detail-top', `${Math.max(16, top) - reef.top}px`)
  }

  function renderPanel() {
    const active = focused || previewed || selected
    const skill = skills[active]
    if (name) name.textContent = skill.name
    if (category) category.textContent = skill.category
    if (description) description.textContent = skill.description
    section.dataset.skillActive = active
    scene.dataset.skillActive = active
    buttons.forEach(button => {
      const key = button.dataset.skill
      button.setAttribute('aria-pressed', String(key === selected))
      button.classList.toggle('is-skill-selected', key === selected)
      button.classList.toggle('is-skill-preview', key === active)
    })
    positionDetail(active)
  }

  buttons.forEach(button => {
    const key = button.dataset.skill
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return
      section.dataset.skillEngaged = 'true'
      previewed = key
      renderPanel()
    }, { signal })
    button.addEventListener('pointerleave', () => {
      if (previewed === key) previewed = ''
      renderPanel()
    }, { signal })
    button.addEventListener('click', () => {
      finishArrival(button)
      section.dataset.skillEngaged = 'true'
      selected = key
      previewed = ''
      focused = button.matches(':focus-visible') ? key : ''
      renderPanel()
    }, { signal })
  })
  scene.addEventListener('pointerleave', () => {
    previewed = ''
    renderPanel()
  }, { signal })
  scene.addEventListener('focusin', event => {
    const button = event.target.closest('[data-skill-node]')
    if (button?.matches(':focus-visible')) finishArrival(button)
    if (button) section.dataset.skillEngaged = 'true'
    // Pointer focus must not hide the next hover preview; keyboard focus takes priority.
    focused = button?.matches(':focus-visible') ? button.dataset.skill : ''
    renderPanel()
  }, { signal })
  scene.addEventListener('focusout', () => {
    focused = ''
    renderPanel()
  }, { signal })
  renderPanel()
  window.addEventListener('resize', renderPanel, { signal, passive: true })
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const arrival = initSkillDropEntry(scene, buttons)
    finishArrival = arrival.finish
    return () => {
      finishArrival = () => {}
      arrival.destroy()
    }
  })
  const destroyWaterlight = initSkillsWaterlight(section)
  const destroyTitle = initSkillsCurrentTitle(section)
  const destroyLife = initSkillReefLife(scene)
  const destroyCoral = initSkillsCoralCurrent(scene)

  return () => {
    controller.abort()
    media.revert()
    destroyWaterlight()
    destroyTitle()
    destroyLife()
    destroyCoral()
    glints.forEach(glint => glint.remove())
    delete section.dataset.skillActive
    delete section.dataset.skillEngaged
    delete section.dataset.skillContextual
    detail?.style.removeProperty('--skill-detail-left')
    detail?.style.removeProperty('--skill-detail-top')
    delete scene.dataset.skillActive
    buttons.forEach(button => {
      button.classList.remove('is-skill-selected', 'is-skill-preview')
    })
  }
}
