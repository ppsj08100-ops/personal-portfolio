import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const clamp = gsap.utils.clamp(0, 1)
const smooth = value => value * value * (3 - 2 * value)

/** Carry the intact title sideways without distorting its glyphs. */
export function initSkillsCurrentTitle(section) {
  if (!section) return () => {}
  const voyage = section.querySelector('[data-skills-voyage]')
  const stage = section.querySelector('[data-skills-stage]')
  const track = section.querySelector('[data-skills-track]')
  const first = section.querySelector('[data-skills-first]')
  const final = section.querySelector('[data-skills-final]')
  const cue = section.querySelector('[data-skills-cue]')
  if (!voyage || !stage || !track || !first || !final) return () => {}

  const media = gsap.matchMedia()
  let disposed = false
  let refreshFrame = 0

  function requestRefresh() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!disposed) ScrollTrigger.refresh()
    })
  }

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const controller = new AbortController()
    const { signal } = controller
    const originalStyles = [track, cue].filter(Boolean)
      .map(element => [element, element.getAttribute('style')])
    const originalProperties = [
      [section, '--skills-current-progress'],
    ].map(([element, name]) => ({
      element,
      name,
      value: element.style.getPropertyValue(name),
      priority: element.style.getPropertyPriority(name),
    }))
    const hadCurrentClass = section.classList.contains('is-skills-current')
    const state = { progress: 0 }
    const layout = { startX: 0, endX: 0 }
    function setTrackX(value) {
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 1)
      const x = Math.round(value * pixelRatio) / pixelRatio
      track.style.transform = `translateX(${x}px)`
    }
    const setCueOpacity = cue && gsap.quickSetter(cue, 'opacity')
    let active = true

    section.classList.add('is-skills-current')

    function measure() {
      if (!active) return
      setTrackX(0)
      track.style.removeProperty('column-gap')
      const width = Math.max(stage.clientWidth, 1)
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      // Give the preceding run enough room to clear the edge when tools rests
      // in the center, including narrow screens and glyph overhangs.
      track.style.columnGap = `${Math.ceil(Math.max(gap, (width - final.offsetWidth) / 2 + 16))}px`
      const stageRect = stage.getBoundingClientRect()
      const firstRect = first.getBoundingClientRect()
      const finalRect = final.getBoundingClientRect()
      layout.startX = (width - firstRect.width) / 2 - (firstRect.left - stageRect.left)
      layout.endX = (width - finalRect.width) / 2 - (finalRect.left - stageRect.left)
      render()
    }

    function render() {
      if (!active) return
      const progress = clamp(state.progress)
      // Move both intact runs on one horizontal track, ending with tools centered
      // so the title stays visible as its full-height section scrolls away.
      const x = layout.startX + (layout.endX - layout.startX) * smooth(progress)
      setTrackX(x)
      section.style.setProperty('--skills-current-progress', progress.toFixed(4))
      setCueOpacity?.(1 - smooth(clamp(progress / .18)))
    }

    measure()
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: 'skills-current-title',
        trigger: voyage,
        start: 'top top',
        end: () => `+=${Math.max(1, voyage.clientHeight - stage.clientHeight)}`,
        scrub: .65,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: render,
      },
    }).fromTo(state, { progress: 0 }, {
      progress: 1,
      duration: 1,
      ease: 'none',
      immediateRender: false,
      onUpdate: render,
    })

    window.addEventListener('resize', requestRefresh, { signal, passive: true })
    document.fonts?.addEventListener('loadingdone', requestRefresh, { signal })
    document.fonts?.ready.then(() => {
      if (active && !disposed) requestRefresh()
    })
    requestRefresh()

    return () => {
      active = false
      controller.abort()
      timeline.scrollTrigger?.kill()
      timeline.kill()
      originalStyles.forEach(([element, style]) => {
        if (style === null) element.removeAttribute('style')
        else element.setAttribute('style', style)
      })
      originalProperties.forEach(({ element, name, value, priority }) => {
        if (value) element.style.setProperty(name, value, priority)
        else element.style.removeProperty(name)
      })
      if (!hadCurrentClass) section.classList.remove('is-skills-current')
      if (!disposed) requestRefresh()
    }
  })

  return () => {
    disposed = true
    media.revert()
    cancelAnimationFrame(refreshFrame)
  }
}
