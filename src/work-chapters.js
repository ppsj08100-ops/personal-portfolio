import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initWorkWaterAtmosphere } from './work-water-atmosphere.js'
import './work-chapters.css'

gsap.registerPlugin(ScrollTrigger)

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }

function paint(record, value, held = false, staticView = false) {
  const p = clamp(value)
  const { element, kind } = record
  const teamHeld = held && kind === 'team'
  const joined = teamHeld ? smooth(.18, .31, p) : smooth(.12, .6, p)
  const alpha = teamHeld ? smooth(.035, .12, p) * (1 - smooth(.65, .75, p)) : 1
  const copy = teamHeld ? smooth(.13, .23, p) * (1 - smooth(.48, .62, p)) : staticView ? 1 : smooth(.02, .24, p)
  const y = staticView ? 0 : teamHeld ? 12 * (1 - smooth(.13, .23, p)) - 12 * smooth(.48, .62, p) : 14 * (1 - copy)
  const tail = teamHeld ? smooth(.27, .64, p) : 1
  element.style.setProperty('--chapter-opacity', alpha.toFixed(4))
  element.style.setProperty('--chapter-copy-opacity', copy.toFixed(4))
  element.style.setProperty('--chapter-copy-y', `${y.toFixed(3)}px`)
  element.style.setProperty('--chapter-join', joined.toFixed(4))
  element.style.setProperty('--chapter-tail', tail.toFixed(4))
  element.style.setProperty('--chapter-thread-opacity', teamHeld ? String(.8 * (1 - smooth(.62, .8, p))) : '.78')
  element.style.visibility = alpha <= .001 ? 'hidden' : 'visible'
  element.setAttribute('aria-hidden', alpha <= .001 ? 'true' : 'false')
  element.dataset.workChapterProgress = p.toFixed(4)
  element.dataset.workChapterState = staticView ? 'static' : teamHeld ? p < .13 ? 'arriving' : p < .31 ? 'gathering' : p < .5 ? 'identified' : p < .75 ? 'departing' : 'complete' : p < .99 ? 'drawing' : 'identified'
}

// Team uses the existing descent clock. Personal and film are readable native
// chapter introductions, without a separate held scene for decorative animals.
export function initWorkChapters() {
  const records = [...document.querySelectorAll('[data-work-chapter]')].map(element => ({
    element, kind: element.dataset.workChapter, stage: element.querySelector('[data-personal-stage]') || element,
    svg: element.querySelector('.work-chapter__currents'),
    originalStyle: element.getAttribute('style'), originalHidden: element.getAttribute('aria-hidden'),
    originalSvgStyle: element.querySelector('.work-chapter__currents').getAttribute('style'),
    originalSvg: [...element.querySelector('.work-chapter__currents').childNodes],
  }))
  if (!records.length) return () => {}
  const media = gsap.matchMedia()
  const controller = new AbortController()
  const ocean = document.querySelector('.ocean-type.has-sail')
  const team = records.find(record => record.kind === 'team')
  const motion = matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 700px)')
  let disposed = false
  records.forEach(record => {
    if (record.kind === 'team') {
      record.svg.style.display = 'none'
    } else if (record.kind === 'personal') {
      record.svg.style.display = 'none'
      record.atmosphere = initWorkWaterAtmosphere(record.element, { opening: record.stage, depthLinked: false })
    } else if (record.kind === 'film') {
      record.svg.style.display = 'none'
      record.atmosphere = initWorkWaterAtmosphere(record.element, { opening: record.stage, depthLinked: false })
    }
    paint(record, 1, false, true)
  })
  ocean?.addEventListener('work-chapter-change', event => {
    if (!disposed && team && motion.matches) paint(team, event.detail.progress, true)
  }, { signal: controller.signal })

  media.add({ motion: '(prefers-reduced-motion: no-preference)', tall: '(min-height: 700px)' }, context => {
    if (!context.conditions.motion) {
      records.forEach(record => paint(record, 1, false, true))
      return
    }
    const triggers = []
    records.forEach(record => {
      record.element.classList.add('is-chapter-animated')
      if (record.kind === 'team' && context.conditions.tall) {
        paint(record, Number(ocean?.dataset.workChapterProgress) || 0, true)
        return
      }
      const render = self => paint(record, self.progress)
      // Read the trigger directly: a smoothed target can retain an old value
      // when matchMedia refreshes while a later chapter is still below view.
      const trigger = ScrollTrigger.create({
        id: `work-chapter-${record.kind}`, trigger: record.element, refreshPriority: -30,
        start: 'top 90%', end: 'top 18%', onUpdate: render, onRefresh: render,
      })
      triggers.push(trigger)
      render(trigger)
    })
    return () => {
      triggers.forEach(trigger => trigger.kill())
      records.forEach(record => { record.element.classList.remove('is-chapter-animated'); paint(record, 1, false, true) })
    }
  })

  document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh() })
  return () => {
    disposed = true
    controller.abort()
    media.revert()
    records.forEach(record => {
      record.atmosphere?.()
      record.svg.replaceChildren(...record.originalSvg)
      if (record.originalSvgStyle === null) record.svg.removeAttribute('style')
      else record.svg.setAttribute('style', record.originalSvgStyle)
      if (record.originalStyle === null) record.element.removeAttribute('style')
      else record.element.setAttribute('style', record.originalStyle)
      if (record.originalHidden === null) record.element.removeAttribute('aria-hidden')
      else record.element.setAttribute('aria-hidden', record.originalHidden)
      delete record.element.dataset.workChapterProgress
      delete record.element.dataset.workChapterState
      record.element.classList.remove('is-chapter-animated')
    })
  }
}
