import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initSkillDropEntry } from './skill-drop-entry.js'

gsap.registerPlugin(ScrollTrigger)

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
    description: '장면의 움직임과 전환을 조절해, 화면에 자연스러운 흐름을 더합니다.',
  },
  scrolltrigger: {
    name: 'ScrollTrigger', category: 'INTERACTION',
    description: '스크롤 위치와 화면 전환을 연결해, 콘텐츠가 이어지는 타이밍을 조절합니다.',
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
  const title = section.querySelector('.tools-skills__title')
  const voyage = section.querySelector('[data-tools-title-voyage]')
  const stage = section.querySelector('[data-tools-title-stage]')
  const track = section.querySelector('[data-tools-title-track]')
  const first = section.querySelector('[data-tools-title-first]')
  const final = section.querySelector('[data-tools-title-final]')
  const tide = section.querySelector('[data-tools-title-tide]')
  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  let selected = buttons.find(button => button.dataset.skill === 'figma')?.dataset.skill || buttons[0].dataset.skill
  let previewed = ''
  let focused = ''
  let visible = false
  let disposed = false
  let refreshFrame = 0
  let finishArrival = () => {}

  function refreshLayout() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!disposed) ScrollTrigger.refresh()
    })
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
  }

  function syncPlayback() {
    section.classList.toggle('is-tools-in-view', visible && !document.hidden)
  }

  buttons.forEach(button => {
    const key = button.dataset.skill
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return
      previewed = key
      renderPanel()
    }, { signal })
    button.addEventListener('pointerleave', () => {
      if (previewed === key) previewed = ''
      renderPanel()
    }, { signal })
    button.addEventListener('click', () => {
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
    if (button) finishArrival(button)
    // Pointer focus must not hide the next hover preview; keyboard focus takes priority.
    focused = button?.matches(':focus-visible') ? button.dataset.skill : ''
    renderPanel()
  }, { signal })
  scene.addEventListener('focusout', () => {
    focused = ''
    renderPanel()
  }, { signal })
  document.addEventListener('visibilitychange', syncPlayback, { signal })

  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    syncPlayback()
  })
  observer.observe(scene)
  renderPanel()
  syncPlayback()

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const arrivals = initSkillDropEntry(scene, buttons)
    finishArrival = arrivals.finish
    return () => {
      finishArrival = () => {}
      arrivals.destroy()
    }
  })

  if (title && voyage && stage && track && first && final && tide) {
    media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      section.classList.add('is-title-voyage')
      let active = true
      const originalFirst = first.textContent
      const originalFinal = final.textContent
      const split = run => {
        const letters = Array.from(run.textContent, character => {
          const letter = document.createElement('span')
          letter.className = 'tools-skills__title-char'
          letter.textContent = character
          return letter
        })
        run.replaceChildren(...letters)
        return letters
      }
      const letters = [...split(first), ...split(final)]
      const renderers = letters.map(letter => ({
        letter, center: 0,
        blur: gsap.quickSetter(letter, 'filter'),
        opacity: gsap.quickSetter(letter, 'opacity'),
        y: gsap.quickSetter(letter, 'y', 'px'),
      }))
      const positionTrack = gsap.quickSetter(track, 'x', 'px')
      const ink = gsap.utils.interpolate('#b9d1e1', '#edf4f5')
      const state = { progress: 0, tide: 0 }
      let startX = 0
      let endX = 0
      let width = 0
      let height = 0
      let inset = 0

      function measure() {
        width = stage.clientWidth
        height = stage.clientHeight
        inset = parseFloat(getComputedStyle(stage).paddingLeft) || 0
        const baseSize = Math.min(width * .20833, height * .48)
        title.style.fontSize = `${baseSize}px`
        const fit = Math.min(1, (width - inset * 2) / final.offsetWidth)
        title.style.fontSize = `${baseSize * fit}px`
        startX = (width - first.offsetWidth) / 2 - inset
        endX = (width - final.offsetWidth) / 2 - inset - final.offsetLeft
        renderers.forEach(item => {
          item.center = item.letter.parentElement.offsetLeft + item.letter.offsetLeft + item.letter.offsetWidth / 2
        })
      }

      function render() {
        const progress = state.progress
        const x = startX + (endX - startX) * progress
        const wipe = gsap.utils.clamp(0, 1, (state.tide - .4) / .2)
        positionTrack(x)
        tide.style.clipPath = `inset(0 0 0 ${(1 - wipe) * 100}%)`
        stage.style.setProperty('--tools-title-ink', ink(wipe))
        renderers.forEach(item => {
          const center = inset + x + item.center
          const gone = gsap.utils.clamp(0, 1, (width * .06 - center) / (width * .15))
          item.blur(`blur(${gone * Math.min(56, width * .03)}px)`)
          item.opacity(1 - gone)
          item.y(-height * .13 * gone)
        })
      }

      measure()
      render()
      gsap.timeline({
        scrollTrigger: {
          id: 'tools-skills-title', trigger: voyage,
          start: 'top top', end: 'bottom bottom', scrub: .5,
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          onRefresh: render,
        },
      }).to(state, { progress: 1, duration: .65, ease: 'none', onUpdate: render }, 0)
        .to(state, { tide: 1, duration: 1, ease: 'none', onUpdate: render }, 0)
      refreshLayout()
      document.fonts.ready.then(() => { if (active && !disposed) refreshLayout() })

      return () => {
        active = false
        section.classList.remove('is-title-voyage')
        title.style.removeProperty('font-size')
        track.style.removeProperty('transform')
        tide.style.removeProperty('clip-path')
        stage.style.removeProperty('--tools-title-ink')
        first.textContent = originalFirst
        final.textContent = originalFinal
        refreshLayout()
      }
    })
  }

  return () => {
    disposed = true
    controller.abort()
    observer.disconnect()
    media.revert()
    cancelAnimationFrame(refreshFrame)
    section.classList.remove('is-tools-in-view')
    delete section.dataset.skillActive
    delete scene.dataset.skillActive
    buttons.forEach(button => {
      button.classList.remove('is-skill-selected', 'is-skill-preview')
    })
  }
}
