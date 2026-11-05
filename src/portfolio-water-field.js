const INF = 1e12
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

// Lower envelope of the squared-distance parabolas, in linear time.
function distanceLine(input, output, length, sites, boundaries) {
  let last = 0
  sites[0] = 0
  boundaries[0] = -Infinity
  boundaries[1] = Infinity
  for (let q = 1; q < length; q++) {
    let previous = sites[last]
    let crossing = ((input[q] + q * q) - (input[previous] + previous * previous)) / (2 * (q - previous))
    while (crossing <= boundaries[last]) {
      previous = sites[--last]
      crossing = ((input[q] + q * q) - (input[previous] + previous * previous)) / (2 * (q - previous))
    }
    sites[++last] = q
    boundaries[last] = crossing
    boundaries[last + 1] = Infinity
  }
  last = 0
  for (let q = 0; q < length; q++) {
    while (boundaries[last + 1] < q) last++
    const delta = q - sites[last]
    output[q] = delta * delta + input[sites[last]]
  }
}

function distanceField(field, width, height) {
  const length = Math.max(width, height)
  const input = new Float64Array(length)
  const output = new Float64Array(length)
  const sites = new Int32Array(length)
  const boundaries = new Float64Array(length + 1)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) input[y] = field[y * width + x]
    distanceLine(input, output, height, sites, boundaries)
    for (let y = 0; y < height; y++) field[y * width + x] = output[y]
  }
  for (let y = 0; y < height; y++) {
    const start = y * width
    for (let x = 0; x < width; x++) input[x] = field[start + x]
    distanceLine(input, output, width, sites, boundaries)
    for (let x = 0; x < width; x++) field[start + x] = output[x]
  }
}

function transformedText(character, style, first) {
  if (style.textTransform === 'uppercase') return character.toLocaleUpperCase()
  if (style.textTransform === 'lowercase') return character.toLocaleLowerCase()
  if (style.textTransform === 'capitalize' && first) return character.toLocaleUpperCase()
  return character
}

/**
 * Rasterize the actual word layout into a CSS-pixel signed distance field.
 *
 * R = clamp(128 + signedDistanceInCssPixels * 4, 0, 255), positive inside.
 * G preserves the original glyph coverage; B = 0, A = 255. Upload as linear
 * RGBA/UNSIGNED_BYTE with CLAMP_TO_EDGE, without a color-space conversion.
 * All returned word/point coordinates are relative to the padded title line.
 * Call after document.fonts.ready and rebuild on font/layout size changes.
 */
export function createWaterLetterField(words, {
  padding = 24,
  maxWidth = 1536,
  scale: requestedScale = 1.5,
  maxPixels = 1250000,
  maxPoints = 512,
  reference,
} = {}) {
  const elements = Array.from(words || []).filter(word => word?.isConnected && word.textContent?.trim())
  if (!elements.length) return null
  const document = elements[0].ownerDocument
  const view = document.defaultView
  const anchor = reference || elements[0].closest('.portfolio__title-line') || elements[0].parentElement
  if (!anchor || !view) return null
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  padding = clamp(Number(padding) || 24, 0, 128)
  maxWidth = clamp(Math.floor(Number(maxWidth) || 1536), 64, 4096)
  maxPixels = clamp(Number(maxPixels) || 1250000, 4096, 4000000)
  maxPoints = clamp(Math.floor(Number(maxPoints) || 512), 0, 2048)
  const probes = elements.map(word => {
    const probe = document.createElement('span')
    probe.setAttribute('aria-hidden', 'true')
    probe.dataset.waterBaseline = ''
    probe.style.cssText = 'display:inline-block;vertical-align:baseline;width:0;height:0;padding:0;margin:0;border:0;font-size:0;line-height:0;overflow:hidden;visibility:hidden;pointer-events:none'
    word.append(probe)
    return probe
  })

  try {
    const title = anchor.getBoundingClientRect()
    if (title.width <= 0 || title.height <= 0) return null
    const naturalWidth = title.width + padding * 2
    const naturalHeight = title.height + padding * 2
    const scale = Math.min(
      clamp(Number(requestedScale) || 1.5, .25, 3),
      maxWidth / naturalWidth,
      Math.sqrt(maxPixels / (naturalWidth * naturalHeight)),
    )
    const width = Math.min(maxWidth, Math.max(1, Math.ceil(naturalWidth * scale)))
    const height = Math.max(1, Math.ceil(naturalHeight * scale))
    const cssWidth = width / scale
    const cssHeight = height / scale
    const origin = { x: title.left - padding, y: title.top - padding }
    canvas.width = width
    canvas.height = height
    context.fillStyle = '#fff'
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
    const layout = elements.map((word, owner) => {
      const rect = word.getBoundingClientRect()
      const style = view.getComputedStyle(word)
      const sx = rect.width / (Number.parseFloat(style.width) || rect.width)
      const sy = rect.height / (Number.parseFloat(style.height) || rect.height)
      const baseline = probes[owner].getBoundingClientRect().top - origin.y
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      if ('fontKerning' in context) context.fontKerning = style.fontKerning
      if ('fontStretch' in context) context.fontStretch = style.fontStretch
      if ('fontVariantCaps' in context) context.fontVariantCaps = style.fontVariantCaps
      if ('letterSpacing' in context) context.letterSpacing = '0px'
      if ('wordSpacing' in context) context.wordSpacing = '0px'
      const walker = document.createTreeWalker(word, view.NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      let textNode
      let first = true
      while ((textNode = walker.nextNode())) {
        let offset = 0
        for (const character of textNode.data) {
          const end = offset + character.length
          range.setStart(textNode, offset)
          range.setEnd(textNode, end)
          const glyph = range.getBoundingClientRect()
          if (glyph.width > 0 && !/[\r\n]/.test(character)) {
            // DOM ranges preserve CSS tracking, kerning and nested character
            // spacing; the probe supplies the native alphabetic baseline.
            context.setTransform(scale * sx, 0, 0, scale * sy,
              (glyph.left - origin.x) * scale, baseline * scale)
            context.fillText(transformedText(character, style, first), 0, 0)
          }
          if (character.trim()) first = false
          offset = end
        }
      }
      return {
        x: rect.left - origin.x, y: rect.top - origin.y,
        width: rect.width, height: rect.height, baseline,
        text: word.textContent, fontSize: Number.parseFloat(style.fontSize) * sy,
      }
    })
    context.resetTransform()
    const pixels = context.getImageData(0, 0, width, height).data
    const count = width * height
    const toInside = new Float32Array(count)
    const toOutside = new Float32Array(count)
    const candidates = []
    let ink = 0
    for (let index = 0; index < count; index++) {
      const alpha = pixels[index * 4 + 3]
      const inside = alpha >= 128
      toInside[index] = inside ? 0 : INF
      toOutside[index] = inside ? INF : 0
      if (alpha > 96) { ink++; if (maxPoints) candidates.push(index) }
    }
    if (!ink) return null
    distanceField(toInside, width, height)
    distanceField(toOutside, width, height)
    const data = new Uint8Array(count * 4)
    for (let index = 0; index < count; index++) {
      const alpha = pixels[index * 4 + 3]
      const distance = alpha > 0 && alpha < 255
        ? alpha / 255 - .5
        : alpha >= 128 ? Math.sqrt(toOutside[index]) - .5 : .5 - Math.sqrt(toInside[index])
      data[index * 4] = clamp(Math.round(128 + distance / scale * 4), 0, 255)
      data[index * 4 + 1] = alpha
      data[index * 4 + 3] = 255
    }
    const points = []
    const sampled = Math.min(maxPoints, candidates.length)
    for (let index = 0; index < sampled; index++) {
      const pixel = candidates[Math.min(candidates.length - 1, Math.floor((index + .5) * candidates.length / sampled))]
      const x = (pixel % width + .5) / scale
      const y = (Math.floor(pixel / width) + .5) / scale
      const owner = Math.max(0, layout.findIndex(word => x >= word.x && x <= word.x + word.width && y >= word.y && y <= word.y + word.height))
      points.push({ x, y, owner })
    }
    return {
      data, width, height, cssWidth, cssHeight, padding, scale,
      words: layout, points, offsetX: -padding, offsetY: -padding, origin,
      rect: { x: origin.x, y: origin.y, width: cssWidth, height: cssHeight },
      referenceRect: { x: title.left, y: title.top, width: title.width, height: title.height },
      encoding: { zero: 128, unitsPerCssPixel: 4, positiveInside: true, range: 32 },
    }
  } finally {
    probes.forEach(probe => probe.remove())
  }
}
