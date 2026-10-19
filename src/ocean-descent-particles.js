import { getDiveFoamSprites } from './dive-foam-sprites.js'

const TAU = Math.PI * 2
const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (start, end, value) => {
  const amount = clamp((value - start) / (end - start))
  return amount * amount * (3 - 2 * amount)
}
const wrap = (value, length) => ((value % length) + length) % length
const noParticles = () => ({ resize() {}, render() {}, destroy() {} })

// Stable positions let a reversed scroll retrace the same water column. Size
// and aspect remain fixed; only the camera and slow buoyancy move the particles.
function createParticles(count, near) {
  let seed = near ? 7193 : 1607
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  return Array.from({ length: count }, (_, index) => ({
    x: .2 + random() * .6,
    y: (index + random()) / count,
    radius: near ? 2.5 + random() * 3 : .6 + random() * .7,
    aspect: near ? .97 + random() * .06 : 1,
    opacity: near ? .24 + random() * .24 : .12 + random() * .19,
    speed: near ? 5 + random() * 5 : 1.1 + random() * 2.1,
    drift: (random() - .5) * (near ? 14 : 6),
    travel: near ? 1.4 + random() * .2 : .53 + random() * .14,
  }))
}

export function createDescentParticles(canvas) {
  let context
  let sprites
  try {
    context = canvas?.getContext('2d', { alpha: true })
    sprites = getDiveFoamSprites()
  } catch {
    return noParticles()
  }
  if (!context || !sprites) return noParticles()

  const bubbles = createParticles(16, true)
  const motes = createParticles(36, false)
  let width = 0
  let height = 0
  let destroyed = false

  function resize(nextWidth, nextHeight) {
    if (destroyed) return
    width = Math.max(0, Number(nextWidth) || 0)
    height = Math.max(0, Number(nextHeight) || 0)
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2)
    canvas.width = Math.ceil(width * ratio)
    canvas.height = Math.ceil(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
  }

  function render(progress, timeSeconds) {
    if (destroyed) return
    context.clearRect(0, 0, width, height)
    if (!width || !height) return

    const p = clamp(Number(progress) || 0)
    const time = Number.isFinite(timeSeconds) ? timeSeconds : 0
    const envelope = smooth(.08, .22, p) * (1 - smooth(.72, .95, p))
    if (envelope <= 0) return

    const cycle = height * 1.24
    const margin = height * .12
    const edgeFade = y => smooth(0, height * .1, y) * (1 - smooth(height * .88, height, y))
    const position = particle => ({
      x: particle.x * width + particle.drift * p,
      y: wrap(particle.y * cycle - p * particle.travel * height - time * particle.speed, cycle) - margin,
    })

    context.save()
    context.fillStyle = '#b8d4e1'
    for (const mote of motes) {
      const { x, y } = position(mote)
      const opacity = envelope * edgeFade(y) * mote.opacity
      if (opacity < .005) continue
      context.globalAlpha = opacity
      context.beginPath()
      context.arc(x, y, mote.radius, 0, TAU)
      context.fill()
    }

    for (const bubble of bubbles) {
      const { x, y } = position(bubble)
      const opacity = envelope * edgeFade(y) * bubble.opacity
      if (opacity < .005) continue
      const size = bubble.radius * 2 * (32 / 26)
      const bubbleWidth = size * bubble.aspect
      const bubbleHeight = size / bubble.aspect
      context.globalAlpha = opacity
      context.drawImage(sprites.bubble, x - bubbleWidth / 2, y - bubbleHeight / 2, bubbleWidth, bubbleHeight)
    }
    context.restore()
  }

  function destroy() {
    if (destroyed) return
    context.clearRect(0, 0, width, height)
    destroyed = true
  }

  return { resize, render, destroy }
}
