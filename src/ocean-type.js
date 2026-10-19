import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initOceanType(section) {
  if (!section) return () => {}
  const stage = section.querySelector('.ocean-type__stage')
  const heading = section.querySelector('.ocean-type__text')
  const waves = section.querySelector('.ocean-type__waves')
  const segments = [...heading.querySelectorAll('.ocean-type__segment')]
  const originals = segments.map(segment => segment.textContent)
  const media = gsap.matchMedia()
  let destroyed = false
  let refreshLayout = () => {}

  // Short viewports and reduced motion keep the complete sentence in normal flow.
  media.add('(prefers-reduced-motion: no-preference) and (min-height: 700px)', () => {
    segments.forEach((segment, index) => {
      const fragment = document.createDocumentFragment()
      for (const token of originals[index].split(/(\s+)/)) {
        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token))
          continue
        }
        const word = document.createElement('span')
        word.className = 'ocean-type__word'
        for (const character of token) {
          const letter = document.createElement('span')
          letter.className = 'ocean-type__letter'
          letter.textContent = character
          word.append(letter)
        }
        fragment.append(word)
      }
      segment.replaceChildren(fragment)
      segment.setAttribute('aria-hidden', 'true')
    })
    section.classList.add('is-tidal')

    const letters = [...heading.querySelectorAll('.ocean-type__letter')].map(element => ({
      element, left: 0,
      y: gsap.quickSetter(element, 'y', 'px'),
      rotation: gsap.quickSetter(element, 'rotation', 'deg'),
    }))
    const translation = { x: 0 }
    const tide = { phase: 0 }
    const setX = gsap.quickSetter(heading, 'x', 'px')
    let width = 0
    let gutter = 0
    let travel = 0
    let amplitude = 0
    let wavelength = 0
    let fontSize = 0
    let frame = 0
    let disposed = false
    let observedSize = ''
    let lastCurrent = ''

    function measure() {
      width = stage.clientWidth
      gutter = parseFloat(getComputedStyle(section).getPropertyValue('--container-gutter')) || 20
      // The gutter token may be a calc()/clamp(); the label resolves it to px.
      gutter = parseFloat(getComputedStyle(section.querySelector('.ocean-type__label')).left) || gutter
      fontSize = parseFloat(getComputedStyle(heading).fontSize)
      travel = Math.max(0, heading.offsetWidth - width + gutter * 2)
      amplitude = Math.min(28, Math.max(8, fontSize * .17))
      wavelength = Math.max(420, width * 1.12)
      section.style.setProperty('--ocean-type-runway', `${Math.ceil(Math.max(stage.clientHeight * .8, travel * .78) + Math.min(stage.clientHeight * .24, 240))}px`)
      letters.forEach(letter => {
        let element = letter.element
        let left = letter.element.offsetWidth / 2
        while (element && element !== heading) {
          left += element.offsetLeft
          element = element.offsetParent
        }
        letter.left = left
      })
      observedSize = `${stage.clientWidth}:${stage.clientHeight}:${heading.offsetWidth}:${heading.offsetHeight}`
    }

    function render() {
      setX(translation.x)
      if (section.classList.contains('has-sail')) {
        const progress = travel ? gsap.utils.clamp(0, 1, (gutter - translation.x) / travel) : 0
        const current = (2 - progress * 4).toFixed(4)
        if (current !== lastCurrent) {
          lastCurrent = current
          section.style.setProperty('--wave-current-x', `${current}vw`)
        }
      }
      const k = Math.PI * 2 / wavelength
      letters.forEach(letter => {
        const x = letter.left + translation.x
        if (x < -fontSize || x > width + fontSize) return
        // One broad travelling swell and a very small secondary current form a
        // continuous baseline. Rotation follows its tangent, without random kicks.
        const phase = x * k + tide.phase
        const secondary = x * k * 1.7 + tide.phase + .65
        letter.y(Math.sin(phase) * amplitude + Math.sin(secondary) * amplitude * .12)
        const slope = Math.cos(phase) * amplitude * k + Math.cos(secondary) * amplitude * .12 * k * 1.7
        letter.rotation(gsap.utils.clamp(-5, 5, Math.atan(slope) * 180 / Math.PI))
      })
    }

    measure()
    const scroll = gsap.timeline({
      onUpdate: render,
      scrollTrigger: {
        id: 'work-tidal-type', trigger: section, refreshPriority: -10,
        start: 'top top',
        end: () => section.classList.contains('has-sail')
          ? `+=${parseFloat(section.style.getPropertyValue('--ocean-type-runway')) || 0}`
          : 'bottom bottom',
        scrub: .35,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: render,
      },
    })
    scroll.fromTo(translation, { x: () => gutter }, {
      x: () => gutter - travel, duration: 1, ease: 'none',
    }).to({}, { duration: .18 })
    render()

    const float = gsap.to(tide, {
      phase: Math.PI * 2, duration: 7.2, ease: 'none', repeat: -1,
      paused: true, onUpdate: render,
    })
    let visible = false
    function syncPlayback() {
      const playing = visible && !document.hidden
      const descending = section.classList.contains('is-descending')
      const submerged = section.classList.contains('is-submerged')
      section.classList.toggle('is-in-view', playing && !submerged)
      float.paused(!playing || descending)
    }
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      syncPlayback()
    })
    observer.observe(stage)
    document.addEventListener('visibilitychange', syncPlayback)
    section.addEventListener('depth-statechange', syncPlayback)

    // Keep the scene visible on entry and return. The voyage alone fades the
    // type window; it also owns the water transforms throughout this scene.

    refreshLayout = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!disposed) ScrollTrigger.refresh(true)
      })
    }
    const resizeObserver = new ResizeObserver(() => {
      const size = `${stage.clientWidth}:${stage.clientHeight}:${heading.offsetWidth}:${heading.offsetHeight}`
      if (size === observedSize) return
      observedSize = size
      refreshLayout()
    })
    resizeObserver.observe(stage)
    resizeObserver.observe(heading)

    return () => {
      disposed = true
      observer.disconnect()
      resizeObserver.disconnect()
      cancelAnimationFrame(frame)
      refreshLayout = () => {}
      document.removeEventListener('visibilitychange', syncPlayback)
      section.removeEventListener('depth-statechange', syncPlayback)
      section.classList.remove('is-in-view', 'is-tidal')
      section.style.removeProperty('--ocean-type-runway')
      section.style.removeProperty('--wave-current-x')
      float.kill()
      scroll.scrollTrigger?.kill()
      scroll.kill()
      segments.forEach((segment, index) => {
        segment.textContent = originals[index]
        segment.removeAttribute('aria-hidden')
      })
      gsap.set([heading, waves], { clearProps: 'transform,opacity,visibility' })
    }
  })

  document.fonts.ready.then(() => { if (!destroyed) refreshLayout() })
  return () => {
    destroyed = true
    media.revert()
  }
}
