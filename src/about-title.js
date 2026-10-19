import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initAboutTitle(section) {
  if (!section) return () => {}
  const voyage = section.querySelector('[data-about-voyage]')
  const stage = section.querySelector('[data-about-stage]')
  const heading = section.querySelector('.about-title__heading')
  const track = section.querySelector('[data-about-track]')
  const first = section.querySelector('[data-about-first]')
  const final = section.querySelector('[data-about-final]')
  const tide = section.querySelector('[data-about-tide]')
  if (!voyage || !stage || !heading || !track || !first || !final || !tide) return () => {}

  const media = gsap.matchMedia()
  let disposed = false
  let refreshFrame = 0
  function refreshLayout() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!disposed) ScrollTrigger.refresh()
    })
  }

  media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-voyage')
    let active = true
    const originalFirst = first.textContent
    const originalFinal = final.textContent
    function split(run) {
      const letters = Array.from(run.textContent, character => {
        const letter = document.createElement('span')
        letter.className = 'about-title__char'
        letter.textContent = character
        return letter
      })
      run.replaceChildren(...letters)
      return letters
    }
    const letters = [...split(first), ...split(final)].map(letter => ({
      letter, center: 0,
      blur: gsap.quickSetter(letter, 'filter'),
      opacity: gsap.quickSetter(letter, 'opacity'),
      y: gsap.quickSetter(letter, 'y', 'px'),
    }))
    const positionTrack = gsap.quickSetter(track, 'x', 'px')
    const ink = gsap.utils.interpolate('#d9e8ef', '#c2dce9')
    const state = { slide: 0, tide: 0 }
    let startX = 0
    let endX = 0
    let width = 0
    let height = 0
    let inset = 0

    function measure() {
      width = stage.clientWidth
      height = stage.clientHeight
      inset = parseFloat(getComputedStyle(stage).paddingLeft) || 0
      const size = Math.min(width * .20833, height * .48)
      heading.style.fontSize = `${size}px`
      final.style.fontSize = `${size}px`
      // Keep ABOUT monumental while fitting the complete italic line at rest.
      final.style.fontSize = `${size * Math.min(1, (width - inset * 2) / final.offsetWidth)}px`
      startX = (width - first.offsetWidth) / 2 - inset
      endX = (width - final.offsetWidth) / 2 - inset - final.offsetLeft
      letters.forEach(item => {
        item.center = item.letter.parentElement.offsetLeft + item.letter.offsetLeft + item.letter.offsetWidth / 2
      })
    }

    function render() {
      const x = startX + (endX - startX) * state.slide
      const wipe = gsap.utils.clamp(0, 1, (state.tide - .4) / .2)
      positionTrack(x)
      tide.style.clipPath = `inset(0 0 0 ${(1 - wipe) * 100}%)`
      stage.style.setProperty('--about-ink', ink(wipe))
      letters.forEach(item => {
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
        id: 'about-title', trigger: voyage,
        start: 'top top', end: 'bottom bottom', scrub: .5,
        invalidateOnRefresh: true, onRefreshInit: measure, onRefresh: render,
      },
    }).to(state, { slide: 1, duration: .78, ease: 'none', onUpdate: render }, 0)
      .to(state, { tide: 1, duration: 1, ease: 'none', onUpdate: render }, 0)
    refreshLayout()
    document.fonts.ready.then(() => { if (active && !disposed) refreshLayout() })

    return () => {
      active = false
      section.classList.remove('is-voyage')
      heading.style.removeProperty('font-size')
      final.style.removeProperty('font-size')
      track.style.removeProperty('transform')
      tide.style.removeProperty('clip-path')
      stage.style.removeProperty('--about-ink')
      first.textContent = originalFirst
      final.textContent = originalFinal
      refreshLayout()
    }
  })

  return () => {
    disposed = true
    media.revert()
    cancelAnimationFrame(refreshFrame)
  }
}
