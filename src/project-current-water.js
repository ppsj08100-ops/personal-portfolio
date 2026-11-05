const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mix = (a, b, t) => a + (b - a) * t

function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = smooth(0, 1, x - ix), fy = smooth(0, 1, y - iy)
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), fx),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy)
}

function turbulence(x, y) {
  return noise(x, y) * .56 + noise(x * 2.03 + 8, y * 2.03) * .28
    + noise(x * 4.07, y * 4.07 + 13) * .16
}

// A small, deterministic optical texture is prepared once, then bent around the
// shared reveal curve. Its highlights follow the water rather than the viewport.
function createWaterTexture() {
  const texture = document.createElement('canvas')
  texture.width = 192
  texture.height = 1024
  const context = texture.getContext('2d')
  if (!context) return null
  const pixels = context.createImageData(texture.width, texture.height)
  for (let y = 0; y < texture.height; y++) {
    const v = y / texture.height
    const swell = turbulence(v * 11, 7)
    for (let x = 0; x < texture.width; x++) {
      const u = x / texture.width
      const d = u - .08
      const warp = turbulence(u * 6, v * 25)
      const grain = turbulence(u * 37 + warp * 4, v * 220 + warp * 3)
      const eddy = noise(u * 19 + warp * 5, v * 83)
      const lace = smooth(.58, .81, grain) * Math.exp(-Math.max(0, d) * 22)
      const rim = Math.exp(-Math.pow((d - (swell - .5) * .012) / .009, 2))
      const liquid = Math.exp(-Math.pow((d - .065) / (.09 + swell * .055), 2))
      const caustic = Math.pow(1 - Math.abs(eddy * 2 - 1), 18)
        * smooth(.09, .18, u) * (1 - smooth(.25, .75, u))
      const depth = Math.exp(-Math.max(0, d) * 5.2) * smooth(.035, .09, u)
      const sparkle = smooth(.66, .86, grain) * liquid
      const light = clamp(rim * .75 + lace * .85 + sparkle * .3 + caustic * .1 + liquid * .12)
      const alpha = (rim * (.32 + swell * .34) + lace * .62
        + liquid * .25 + depth * .13 + caustic * .07)
        * smooth(.01, .065, u) * (1 - smooth(.65, 1, u))
      const index = (y * texture.width + x) * 4
      pixels.data[index] = mix(49, 225, light)
      pixels.data[index + 1] = mix(129, 245, light)
      pixels.data[index + 2] = mix(160, 247, light)
      pixels.data[index + 3] = clamp(alpha) * 255
    }
  }
  context.putImageData(pixels, 0, 0)
  return texture
}

export function createProjectCurrentWater(context) {
  let texture

  return function paintWater({ width, height, position, envelope, edgeAt }) {
    texture ||= createWaterTexture()
    if (!texture) return
    const breadth = Math.min(104, Math.max(44, width * .065))
    const rows = Math.ceil(height / 2)
    const step = height / rows
    context.save()
    context.globalAlpha = envelope
    context.imageSmoothingEnabled = true
    // Adjacent strips meet exactly in physical pixels, avoiding alpha seams.
    const density = context.getTransform().d
    for (let row = 0; row < rows; row++) {
      const y = Math.round(row * step * density) / density
      const bottom = Math.round((row + 1) * step * density) / density
      const v = y / height
      const localWidth = breadth * (1 + .18 * Math.sin(v * 9.2 - position * 1.4)
        + .08 * Math.sin(v * 21 + 1.7))
      const x = edgeAt(v) * width
      const sourceY = v * (texture.height - 2)
      context.drawImage(texture, 0, sourceY, texture.width,
        (bottom - y) / height * (texture.height - 2),
        x - localWidth * .08, y, localWidth, bottom - y)
    }

    // Interrupted reflections catch the swell; they taper instead of becoming
    // parallel full-height outlines or drawing across the exhibition text.
    const reflections = [
      { start: .035, end: .27, offset: .15, alpha: .21 },
      { start: .32, end: .60, offset: .23, alpha: .13 },
      { start: .68, end: .94, offset: .12, alpha: .18 },
    ]
    context.lineCap = 'round'
    for (const reflection of reflections) {
      for (let i = 0; i < 36; i++) {
        const t = i / 36
        const y = mix(reflection.start, reflection.end, t)
        const nextY = mix(reflection.start, reflection.end, (i + 1) / 36)
        const offset = breadth * reflection.offset * Math.sin(Math.PI * t)
        const nextOffset = breadth * reflection.offset * Math.sin(Math.PI * (i + 1) / 36)
        context.globalAlpha = envelope * reflection.alpha * Math.pow(Math.sin(Math.PI * t), 1.5)
        context.strokeStyle = '#cbe9ec'
        context.lineWidth = .65
        context.beginPath()
        context.moveTo(edgeAt(y) * width + offset + 2, y * height)
        context.lineTo(edgeAt(nextY) * width + nextOffset + 2, nextY * height)
        context.stroke()
      }
    }

    // Fine spray stays clustered along the crest, with no outlined pearls.
    for (let i = 0; i < 180; i++) {
      const y = hash(i, 3)
      const cluster = noise(y * 19, 4)
      if (cluster < .43) continue
      const distance = Math.pow(hash(i, 7), 2) * breadth * .2
      const x = edgeAt(y) * width + distance - 1
      const radius = .25 + Math.pow(hash(i, 11), 3) * .8
      context.globalAlpha = envelope * (.12 + hash(i, 13) * .37) * cluster
      context.fillStyle = '#dceff0'
      context.beginPath()
      context.arc(x, y * height, radius, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }
}
