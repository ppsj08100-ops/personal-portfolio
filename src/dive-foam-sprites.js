let cachedSprites

function bubbleContour(context) {
  // Slight asymmetry follows the painted water instead of a geometric ring.
  context.beginPath()
  context.moveTo(15.4, 3)
  context.bezierCurveTo(22.87, 2.4, 28.8, 8.33, 29, 15.6)
  context.bezierCurveTo(29.4, 23.13, 23.67, 28.93, 16.27, 29)
  context.bezierCurveTo(8.73, 29.4, 2.87, 23.53, 3, 16.2)
  context.bezierCurveTo(2.73, 9, 8.07, 3.4, 15.4, 3)
  context.closePath()
}

function createBubbleSprite(resting = false) {
  const canvas = document.createElement('canvas')
  const scale = resting ? 4 : 3
  canvas.width = 32 * scale
  canvas.height = 32 * scale
  let context
  try {
    context = canvas.getContext('2d')
  } catch {
    return null
  }
  if (!context) return null
  context.scale(scale, scale)
  context.globalCompositeOperation = 'source-over'

  const interior = context.createRadialGradient(13.47, 12.87, .67, 16, 16, 13.33)
  interior.addColorStop(0, 'rgba(205, 224, 232, .025)')
  interior.addColorStop(.48, 'rgba(167, 198, 213, .02)')
  interior.addColorStop(.77, 'rgba(181, 210, 220, .035)')
  interior.addColorStop(.94, 'rgba(196, 218, 226, .075)')
  interior.addColorStop(1, 'rgba(164, 196, 211, .035)')
  bubbleContour(context)
  context.fillStyle = interior
  context.fill()

  // The fine rim is shaded with the surrounding blue, with no outer halo.
  const rim = context.createLinearGradient(6.67, 4, 25.33, 29.33)
  rim.addColorStop(0, resting ? 'rgba(225, 241, 249, .48)' : 'rgba(225, 241, 249, .7)')
  rim.addColorStop(.32, resting ? 'rgba(175, 205, 221, .24)' : 'rgba(175, 205, 221, .3)')
  rim.addColorStop(.67, resting ? 'rgba(149, 184, 207, .18)' : 'rgba(149, 184, 207, .2)')
  rim.addColorStop(1, resting ? 'rgba(216, 236, 246, .34)' : 'rgba(216, 236, 246, .48)')
  // Small resting bubbles need a softer, wider rim so subpixel movement
  // does not turn their highlights into flickering pinpoints.
  context.lineWidth = resting ? 1.2 : .6
  context.strokeStyle = rim
  context.stroke()

  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(6.8, 10.6)
  context.bezierCurveTo(7.93, 7.6, 10.53, 5.6, 12.93, 5.4)
  context.lineWidth = resting ? 1 : .7
  context.strokeStyle = resting ? 'rgba(241, 250, 255, .7)' : 'rgba(241, 250, 255, .95)'
  context.stroke()

  if (!resting) {
    context.beginPath()
    context.moveTo(14.53, 5.13)
    context.quadraticCurveTo(15, 5.07, 15.4, 5.13)
    context.lineWidth = .5
    context.strokeStyle = 'rgba(241, 250, 255, .78)'
    context.stroke()
  }

  // A faint inner lower crescent suggests refraction through moving water.
  context.beginPath()
  context.moveTo(17.13, 26.93)
  context.bezierCurveTo(20.87, 26.67, 23.93, 24.67, 25.33, 21.6)
  context.lineWidth = resting ? .8 : .43
  context.strokeStyle = resting ? 'rgba(196, 225, 240, .22)' : 'rgba(196, 225, 240, .32)'
  context.stroke()
  return canvas
}

export function getDiveFoamSprites() {
  if (cachedSprites !== undefined) return cachedSprites
  if (typeof document === 'undefined') return null
  const bubble = createBubbleSprite()
  const restingBubble = createBubbleSprite(true)
  cachedSprites = bubble ? { bubble, restingBubble: restingBubble || bubble } : null
  return cachedSprites
}
