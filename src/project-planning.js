import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './project-planning-canvases.css'

gsap.registerPlugin(ScrollTrigger)

export function initProjectPlanning(section) {
  if (!section) return () => {}
  const template = section.querySelector('#diptyque-canvas-document')
  const documents = [...template.content.querySelectorAll('[data-lean-document]')]
  const preview = section.querySelector('[data-lean-preview]')
  const full = section.querySelector('[data-lean-full]')
  const dialog = section.querySelector('dialog')
  const opener = section.querySelector('[data-lean-open]')
  const sourceLink = section.querySelector('[data-lean-source]')
  const originalLink = section.querySelector('[data-lean-original]')
  const choices = [...section.querySelectorAll('[data-lean-select]')]
  const zoomButtons = [...section.querySelectorAll('[data-lean-zoom]')]
  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  let active = '1'
  let zoomMode = 'fit'
  let resizeFrame = 0
  const previewImage = documents[0].cloneNode(true)
  const fullImage = documents[0].cloneNode(true)
  preview.replaceChildren(previewImage)
  full.replaceChildren(fullImage)

  function fitDialog() {
    if (!dialog.open) return
    const chromeHeight = dialog.scrollHeight - full.offsetHeight
    const available = Math.max(160, innerHeight - chromeHeight - 64)
    const scale = zoomMode === 'fit' ? Math.min(1, full.clientWidth / 2200, available / 1650) : 1
    full.style.setProperty('--lean-image-width', `${2200 * scale}px`)
    full.style.height = `${Math.min(available, 1650 * scale)}px`
  }
  function queueFit() {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; fitDialog() })
  }
  function zoom(mode, focus = false) {
    zoomMode = mode
    dialog.dataset.leanZoom = mode
    zoomButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.leanZoom === mode)))
    full.tabIndex = mode === 'original' ? 0 : -1
    fitDialog()
    full.scrollTo({ left: 0, top: 0, behavior: 'instant' })
    if (focus && mode === 'original') full.focus({ preventScroll: true })
  }
  function select(key) {
    const document = documents.find(image => image.dataset.leanDocument === key)
    if (!document) return
    active = key
    for (const image of [previewImage, fullImage]) {
      image.src = document.getAttribute('src')
      image.alt = document.alt
      image.dataset.leanDocument = key
      image.dataset.leanLabel = document.dataset.leanLabel
      image.dataset.leanNode = document.dataset.leanNode
    }
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.leanSelect === key)))
    dialog.querySelector('h2').textContent = document.dataset.leanLabel
    originalLink.href = document.getAttribute('src')
    originalLink.setAttribute('aria-label', `${document.dataset.leanLabel} 원본 이미지 열기 (새 탭)`)
    const figmaUrl = new URL(sourceLink.href)
    figmaUrl.searchParams.set('node-id', document.dataset.leanNode.replace(':', '-'))
    sourceLink.href = figmaUrl.href
    sourceLink.setAttribute('aria-label', `${document.dataset.leanLabel} Figma 원본 보기 (새 탭)`)
    opener.setAttribute('aria-label', `${document.dataset.leanLabel} 린캔버스 크게 보기`)
    full.setAttribute('aria-label', `${document.dataset.leanLabel} — 원본 크기에서 방향키 또는 스크롤로 이동`)
    section.dataset.leanActive = active
    fitDialog()
    full.scrollTo({ left: 0, top: 0, behavior: 'instant' })
  }
  choices.forEach(button => {
    button.addEventListener('click', () => select(button.dataset.leanSelect), { signal })
    button.addEventListener('keydown', event => {
      const group = [...button.closest('[data-lean-group]').querySelectorAll('[data-lean-select]')]
      const index = group.indexOf(button)
      const next = { ArrowRight: (index + 1) % group.length, ArrowLeft: (index - 1 + group.length) % group.length, Home: 0, End: group.length - 1 }[event.key]
      if (next === undefined) return
      event.preventDefault()
      select(group[next].dataset.leanSelect)
      group[next].focus()
    }, { signal })
  })

  opener.hidden = false
  opener.addEventListener('click', () => {
    dialog.showModal()
    dialog.scrollTop = 0
    zoom('fit')
  }, { signal })
  section.querySelector('[data-lean-close]').addEventListener('click', () => dialog.close(), { signal })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  }, { signal })
  zoomButtons.forEach(button => button.addEventListener('click', () => zoom(button.dataset.leanZoom, true), { signal }))
  fullImage.addEventListener('load', queueFit, { signal })
  const dimensions = new ResizeObserver(queueFit)
  dimensions.observe(full)
  window.addEventListener('resize', queueFit, { signal })
  select(active)

  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(section.querySelectorAll('[data-planning-reveal]'),
      { y: 28, opacity: .15 },
      { y: 0, opacity: 1, stagger: .045, ease: 'none', scrollTrigger: { id: 'diptyque-planning-reveal', trigger: section, start: 'top 88%', end: 'top 18%', scrub: .4 } })
  })
  return () => {
    if (dialog.open) dialog.close()
    controller.abort()
    cancelAnimationFrame(resizeFrame)
    dimensions.disconnect()
    media.revert()
    preview.replaceChildren()
    full.replaceChildren()
    full.removeAttribute('style')
    full.removeAttribute('tabindex')
    delete dialog.dataset.leanZoom
    delete section.dataset.leanActive
    opener.hidden = true
  }
}
