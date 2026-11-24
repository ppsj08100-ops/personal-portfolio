import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const clamp = gsap.utils.clamp(0, 1)

/** A scroll-driven reflection passes over the tool glass without painting water. */
export function initSkillsWaterlight(section) {
  if (!section) return () => {}
  const scene = section.querySelector('[data-skills-reef]')
  const glasses = [...(scene?.querySelectorAll('[data-skill-node] .skill-drop__water') || [])]
  if (!scene || !glasses.length) return () => {}

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
    const originalReflections = glasses.map(glass => ({
      glass,
      value: glass.style.getPropertyValue('--skill-light'),
      priority: glass.style.getPropertyPriority('--skill-light'),
    }))
    const state = { progress: 0 }
    const layout = { width: 1, height: 1, anchors: [] }
    let active = true

    function measure() {
      if (!active) return
      const bounds = scene.getBoundingClientRect()
      layout.width = Math.max(bounds.width, 1)
      layout.height = Math.max(bounds.height, 1)
      layout.anchors = glasses.map(glass => {
        const button = glass.closest('[data-skill-node]')
        const anchor = scene.querySelector(`[data-skill-anchor="${button.dataset.skill}"]`)
        const rect = glass.getBoundingClientRect()
        const target = anchor?.getBoundingClientRect()
        return {
          glass,
          x: (target ? target.left : rect.left + rect.width / 2) - bounds.left,
          y: (target ? target.top - (button.offsetHeight - glass.offsetHeight) / 2 : rect.top + rect.height / 2) - bounds.top,
        }
      })
      render()
    }

    function render() {
      if (!active) return
      const progress = clamp(state.progress)
      // The reflection travels across the glass without adding a backdrop plane.
      const centerX = (-.15 + progress * 1.3) * layout.width

      const bounds = scene.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const visibleCenterY = Math.max(0, Math.min(layout.height, viewportHeight * .48 - bounds.top))
      const horizontalReach = layout.width * .43
      const verticalReach = Math.max(viewportHeight * .8, layout.height * .38)

      layout.anchors.forEach(({ glass, x, y }) => {
        const across = (x - centerX) / horizontalReach
        const depth = (y - visibleCenterY) / verticalReach
        const reflection = Math.exp(-across * across * 1.45)
          * (.62 + .38 * Math.exp(-depth * depth))
        glass.style.setProperty('--skill-light', reflection.toFixed(3))
      })
    }

    measure()
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: 'skills-waterlight',
        trigger: scene,
        start: 'top 85%',
        end: 'bottom 20%',
        scrub: .75,
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
      originalReflections.forEach(({ glass, value, priority }) => {
        if (value) glass.style.setProperty('--skill-light', value, priority)
        else glass.style.removeProperty('--skill-light')
      })
    }
  })

  return () => {
    disposed = true
    media.revert()
    cancelAnimationFrame(refreshFrame)
  }
}
