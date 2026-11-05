import { createSkillsSideWave, getSkillsWaveFront } from './skills-side-wave.js'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => value * value * (3 - 2 * value)
const TAU = Math.PI * 2
const inkColour = '#e4edf4'

function surface() { return document.createElement('canvas') }

/**
 * The type stays anchored. A crest erodes its strokes into the real sea foam,
 * instead of carrying whole glyphs into one another. The caller owns the clock.
 */
export function createTidalLetterField({ stage, canvas, runs, legacySkills = false, waterMode = 'wave' }) {
  const originals = runs.filter(Boolean).map(run => [run, run.innerHTML])
  const hadCanvas = stage.classList.contains('has-tidal-wave-canvas')
  const letters = []
  const layout = { width: 1, height: 1, ratio: 1 }
  let progress = 0
  let active = true

  for (const [run] of originals) {
    const fragment = document.createDocumentFragment()
    for (const character of [...run.textContent]) {
      const element = document.createElement('span')
      element.className = legacySkills ? 'tidal-letter tools-skills__letter' : 'tidal-letter'
      element.dataset.waveLetter = character
      if (legacySkills) element.dataset.skillsLetter = character
      element.textContent = character
      fragment.append(element)
      letters.push({ element, character, x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, foam: null })
    }
    run.replaceChildren(fragment)
  }

  const ink = surface()
  ink.className = 'tidal-title__ink'
  const foreground = surface()
  foreground.className = 'tidal-title__foreground'
  for (const layer of [ink, foreground]) {
    layer.setAttribute('aria-hidden', 'true')
    stage.append(layer)
  }
  const source = surface()
  const remaining = surface()
  const foamMask = surface()
  const inkContext = ink.getContext('2d')
  const sourceContext = source.getContext('2d')
  const remainingContext = remaining.getContext('2d')
  const maskContext = foamMask.getContext('2d')
  const available = Boolean(inkContext && sourceContext && remainingContext && maskContext)
  const water = createSkillsSideWave(canvas, { foregroundCanvas: foreground, mode: waterMode })

  function setSize(layer, width, height, ratio) {
    layer.width = Math.ceil(width * ratio)
    layer.height = Math.ceil(height * ratio)
  }

  function render(nextProgress = progress) {
    if (!active || !available) return
    progress = clamp(nextProgress)
    const { width, height, ratio } = layout
    water.render(progress)

    // Draw a continuous, softly frayed waterline. Its position is sampled from
    // the illustrated crest; there are no stripes or moving text fragments.
    remainingContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    remainingContext.clearRect(0, 0, width, height)
    remainingContext.fillStyle = '#fff'
    remainingContext.shadowColor = '#fff'
    remainingContext.shadowBlur = Math.max(1.5, Math.min(5, width * .003)) * ratio
    remainingContext.beginPath()
    for (let y = -6; y <= height + 6; y += 3) {
      const v = y / height
      const lace = Math.min(4, width * .003) * (Math.sin(v * TAU * 23 + 1.4) * .6 + Math.sin(v * TAU * 47 + .7) * .4)
      const edge = getSkillsWaveFront(width, height, y, progress) + lace
      if (y === -6) remainingContext.moveTo(edge, y)
      else remainingContext.lineTo(edge, y)
    }
    remainingContext.lineTo(width + width * .5, height + 6)
    remainingContext.lineTo(width + width * .5, -6)
    remainingContext.closePath()
    remainingContext.fill()
    remainingContext.shadowBlur = 0

    inkContext.setTransform(1, 0, 0, 1, 0, 0)
    inkContext.globalCompositeOperation = 'source-over'
    inkContext.clearRect(0, 0, ink.width, ink.height)
    inkContext.drawImage(source, 0, 0)
    inkContext.globalCompositeOperation = 'destination-in'
    inkContext.drawImage(remaining, 0, 0)
    inkContext.globalCompositeOperation = 'source-over'

    // The same original strokes briefly turn into irregular illustrated foam.
    // A little expansion lets that foam join the surrounding crest, rather than
    // leaving a second solid letter or a ring of unrelated particle circles.
    maskContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    maskContext.clearRect(0, 0, width, height)
    for (const letter of letters) {
      const front = getSkillsWaveFront(width, height, letter.y, progress)
      const distance = front - letter.x
      const entry = smooth(clamp((distance + letter.width * .65) / Math.max(letter.width * .7, 1)))
      const departure = 1 - smooth(clamp((distance / width - .025) / .13))
      const foam = entry * departure
      if (letter.foam && foam > .001) {
        const drift = Math.min(10, Math.max(0, distance) * .04)
        const spread = 1 + smooth(clamp(Math.max(0, distance) / (width * .12))) * .045
        maskContext.globalAlpha = foam
        const boxWidth = letter.foam.width / ratio * spread
        const boxHeight = letter.foam.height / ratio * spread
        maskContext.drawImage(letter.foam, letter.left - letter.padding + drift - (boxWidth - letter.foam.width / ratio) / 2,
          letter.top - letter.padding - (boxHeight - letter.foam.height / ratio) / 2, boxWidth, boxHeight)
      }
      const state = front < letter.left ? 'intact' : front < letter.left + letter.width + width * .13 ? 'foaming' : 'dissolved'
      letter.element.dataset.waveState = state
      letter.element.dataset.waveHit = String(front >= letter.x)
      letter.element.dataset.waveCarry = '0.00'
      letter.element.dataset.waveFoam = foam.toFixed(4)
      if (legacySkills) {
        letter.element.dataset.skillsHit = letter.element.dataset.waveHit
        letter.element.dataset.skillsCarry = '0.00'
      }
    }
    maskContext.globalAlpha = 1
    water.paintForeground(foamMask, .94)
    stage.dataset.tidalProgress = progress.toFixed(4)
  }

  function measure() {
    if (!active || !available) return
    const rect = stage.getBoundingClientRect()
    layout.width = Math.max(stage.clientWidth, 1)
    layout.height = Math.max(stage.clientHeight, 1)
    layout.ratio = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1))
    const { width, height, ratio } = layout
    for (const layer of [ink, source, remaining, foamMask]) setSize(layer, width, height, ratio)
    sourceContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    sourceContext.fillStyle = inkColour
    sourceContext.textAlign = 'left'
    sourceContext.textBaseline = 'alphabetic'

    for (const letter of letters) {
      const { element } = letter
      const box = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const size = parseFloat(style.fontSize)
      const character = style.textTransform === 'uppercase' ? letter.character.toUpperCase() : letter.character
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      sourceContext.font = font
      const metrics = sourceContext.measureText(character)
      const ascent = metrics.fontBoundingBoxAscent ?? size * .8
      const descent = metrics.fontBoundingBoxDescent ?? size * .2
      letter.left = box.left - rect.left
      letter.top = box.top - rect.top
      letter.width = box.width
      letter.height = box.height
      letter.x = letter.left + box.width / 2
      letter.y = letter.top + box.height / 2
      const baseline = letter.top + (box.height - ascent - descent) / 2 + ascent
      sourceContext.fillText(character, letter.left, baseline)

      if (letter.foam) { letter.foam.width = 0; letter.foam.height = 0 }
      letter.foam = surface()
      letter.padding = Math.max(6, Math.min(12, size * .075))
      setSize(letter.foam, box.width + letter.padding * 2, box.height + letter.padding * 2, ratio)
      const foamContext = letter.foam.getContext('2d')
      foamContext.setTransform(ratio, 0, 0, ratio, 0, 0)
      foamContext.font = font
      foamContext.fillStyle = '#fff'
      foamContext.strokeStyle = '#fff'
      foamContext.lineWidth = Math.max(2, Math.min(7, size * .035))
      foamContext.lineJoin = 'round'
      foamContext.textBaseline = 'alphabetic'
      const foamBaseline = baseline - letter.top + letter.padding
      foamContext.fillText(character, letter.padding, foamBaseline)
      foamContext.strokeText(character, letter.padding, foamBaseline)
      element.dataset.waveAnchorX = letter.x.toFixed(2)
      element.dataset.waveAnchorY = letter.y.toFixed(2)
      if (legacySkills) {
        element.dataset.skillsAnchorX = element.dataset.waveAnchorX
        element.dataset.skillsAnchorY = element.dataset.waveAnchorY
      }
    }
    water.resize(width, height)
    render()
  }

  const ready = water.ready.then(loaded => {
    if (!active || !available) return false
    if (loaded) stage.classList.add('has-tidal-wave-canvas')
    render()
    return loaded
  })

  return {
    measure, render, ready,
    destroy() {
      if (!active) return
      active = false
      water.destroy()
      originals.forEach(([run, html]) => { run.innerHTML = html })
      if (!hadCanvas) stage.classList.remove('has-tidal-wave-canvas')
      delete stage.dataset.tidalProgress
      ink.remove()
      foreground.remove()
      for (const layer of [ink, source, remaining, foamMask]) { layer.width = 0; layer.height = 0 }
      for (const letter of letters) if (letter.foam) { letter.foam.width = 0; letter.foam.height = 0 }
    },
  }
}
