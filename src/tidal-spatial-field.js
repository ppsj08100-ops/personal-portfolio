import { createSkillsSideWave } from './skills-side-wave.js'
import './tidal-spatial-field.css'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => value * value * (3 - 2 * value)
const surface = () => document.createElement('canvas')
const MAX_GLYPHS = 24

// One continuous texture is refracted, so strokes never become separate strips
// or overlapping glyphs. The scroll controller remains the only animation clock.
function createInkRenderer(source) {
  const canvas = surface()
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false })
  if (!gl) return createFlatInkRenderer(source)
  const shaders = []
  let program, buffer, texture
  try {
    const compile = (type, code) => {
      const shader = gl.createShader(type)
      shaders.push(shader)
      gl.shaderSource(shader, code)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Current shader unavailable')
      return shader
    }
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, `
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
        gl_Position = vec4(position, 0., 1.);
      }
    `))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D ink;
      uniform vec2 size;
      uniform vec2 travel;
      uniform float scale;
      uniform float passage;
      uniform float progress;
      uniform float focus;
      uniform float glyphCount;
      uniform vec4 glyphs[24];
      uniform vec2 inkBounds;
      vec4 sampleInk(vec2 p) {
        if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) return vec4(0.);
        return texture2D(ink, p);
      }
      float spacedInk(vec2 p) {
        if (p.y < inkBounds.x || p.y > inkBounds.y) return 0.;
        float alpha = 0.;
        for (int i = 0; i < 24; i++) {
          if (float(i) >= glyphCount) break;
          vec2 at = p - vec2(glyphs[i].z, 0.);
          if (at.x >= glyphs[i].x && at.x <= glyphs[i].y) {
            vec2 softness = vec2(focus, focus * .35) / size;
            float stroke = sampleInk(at).a * .6
              + sampleInk(at + softness).a * .2
              + sampleInk(at - softness).a * .2;
            alpha = max(alpha, stroke);
          }
        }
        return alpha;
      }
      void main() {
        vec2 pivot = vec2(.5, .46) * size;
        vec2 local = (uv * size - pivot - travel) / scale;
        local.x += local.y * passage * .018;
        vec2 at = (local + pivot) / size;
        float centre = mix(1.28, -.42, smoothstep(.04, .96, progress));
        float bend = .035 * cos(uv.y * 4.2 + progress * 1.8);
        float distance = (uv.x - centre - bend) / .23;
        float lens = exp(-distance * distance * 2.);
        // A broad, slow lens bends by a few pixels, never a sharp waterline.
        at += lens * vec2(5. * sin(uv.y * 5. + progress * 2.4), 2.5 * cos(uv.y * 3.4 + progress)) / size;
        float alpha = spacedInk(at);
        vec3 colour = mix(vec3(.8941, .9294, .9569), vec3(.70, .82, .93), lens * .12);
        gl_FragColor = vec4(colour, alpha);
      }
    `))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Current program unavailable')
    gl.useProgram(program)
    buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const uniforms = Object.fromEntries(['ink', 'size', 'travel', 'scale', 'passage', 'progress', 'focus', 'glyphCount', 'inkBounds'].map(key => [key, gl.getUniformLocation(program, key)]))
    uniforms.glyphs = gl.getUniformLocation(program, 'glyphs[0]')
    gl.uniform1i(uniforms.ink, 0)
    return {
      canvas, kind: 'refracted', textureLimit: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      resize(width, height, ratio) {
        canvas.width = Math.ceil(width * ratio)
        canvas.height = Math.ceil(height * ratio)
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
        gl.uniform2f(uniforms.size, width, height)
      },
      render(state) {
        gl.uniform2f(uniforms.travel, state.x, state.y)
        gl.uniform1f(uniforms.scale, state.scale)
        gl.uniform1f(uniforms.passage, state.passage)
        gl.uniform1f(uniforms.progress, state.progress)
        gl.uniform1f(uniforms.focus, state.focus)
        gl.uniform1f(uniforms.glyphCount, state.count)
        gl.uniform4fv(uniforms.glyphs, state.glyphs)
        gl.uniform2f(uniforms.inkBounds, state.bounds[0], state.bounds[1])
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      },
      destroy() {
        gl.deleteTexture(texture)
        gl.deleteBuffer(buffer)
        gl.deleteProgram(program)
        shaders.forEach(shader => gl.deleteShader(shader))
        canvas.width = 0
        canvas.height = 0
      },
    }
  } catch {
    if (texture) gl.deleteTexture(texture)
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    shaders.forEach(shader => gl.deleteShader(shader))
    return createFlatInkRenderer(source)
  }
}

// Older graphics drivers still get the complete sideways passage, without a
// second hidden title or any erasing/fragment animation.
function createFlatInkRenderer(source) {
  const canvas = surface()
  const context = canvas.getContext('2d')
  let width = 1, height = 1, ratio = 1
  return {
    canvas, kind: 'flat',
    resize(nextWidth, nextHeight, nextRatio) {
      width = nextWidth; height = nextHeight; ratio = nextRatio
      canvas.width = Math.ceil(width * ratio)
      canvas.height = Math.ceil(height * ratio)
    },
    render(state) {
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.translate(width * .5 + state.x, height * .46 + state.y)
      context.scale(state.scale, state.scale)
      context.transform(1, 0, -state.passage * .018, 1, 0, 0)
      context.filter = `blur(${state.focus * .5}px)`
      for (let index = 0; index < state.count; index++) {
        const left = state.glyphs[index * 4] * width
        const span = (state.glyphs[index * 4 + 1] - state.glyphs[index * 4]) * width
        const offset = state.glyphs[index * 4 + 2] * width
        context.drawImage(source, left * ratio, 0, span * ratio, source.height,
          left - width * .5 + offset, -height * .46, span, height)
      }
      context.filter = 'none'
    },
    destroy() { canvas.width = 0; canvas.height = 0 },
  }
}

/** A sideways camera passage through three depths of submerged water. */
export function createTidalSpatialField({ stage, canvas, runs }) {
  const originals = runs.filter(Boolean).map(run => [run, run.innerHTML])
  const letters = []
  const layout = { width: 1, height: 1, ratio: 1, right: 1, top: 0, bottom: 1 }
  const glyphs = new Float32Array(MAX_GLYPHS * 4)
  let counters = []
  const hadCanvas = stage.classList.contains('has-tidal-wave-canvas')
  const hadSpatial = stage.classList.contains('is-spatial-current')
  let progress = 0, active = true, measured = false
  for (const [run] of originals) {
    const fragment = document.createDocumentFragment()
    for (const character of [...run.textContent]) {
      const element = document.createElement('span')
      element.className = 'tidal-letter'
      element.textContent = character
      fragment.append(element)
      letters.push({ element, character })
    }
    run.replaceChildren(fragment)
  }
  const source = surface()
  const sourceContext = source.getContext('2d')
  let renderer = createInkRenderer(source)
  const foreground = surface()
  foreground.className = 'tidal-title__foreground tidal-title__near-current'
  foreground.setAttribute('aria-hidden', 'true')
  const nearContext = foreground.getContext('2d')
  const behind = surface()
  behind.className = 'tidal-title__back-current'
  behind.setAttribute('aria-hidden', 'true')
  const behindContext = behind.getContext('2d')
  const textureImage = stage.querySelector('[data-skills-wave-texture]')
  const water = createSkillsSideWave(canvas, { mode: 'current' })
  const controller = new AbortController()
  const { signal } = controller

  function mountInk() {
    renderer.canvas.className = 'tidal-title__ink'
    renderer.canvas.setAttribute('aria-hidden', 'true')
    stage.append(renderer.canvas)
  }
  mountInk()
  stage.append(behind)
  stage.append(foreground)
  stage.classList.add('is-spatial-current')

  function restoreGraphics(event) {
    event.preventDefault()
    if (!active || renderer.kind !== 'refracted') return
    const previous = renderer
    renderer = createFlatInkRenderer(source)
    previous.canvas.remove()
    previous.destroy()
    mountInk()
    renderer.resize(layout.width, layout.height, layout.ratio)
    render()
  }
  renderer.canvas.addEventListener('webglcontextlost', restoreGraphics, { signal })

  function paintNearCurrent() {
    if (!nearContext) return
    const { width, height, ratio } = layout
    nearContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    nearContext.clearRect(0, 0, width, height)
    // Overscan keeps the texture's rectangular edges outside the viewport.
    if (textureImage?.complete && textureImage.naturalWidth) {
      nearContext.globalAlpha = .12
      nearContext.drawImage(textureImage, textureImage.naturalWidth * .72, 0,
        textureImage.naturalWidth * .28, textureImage.naturalHeight,
        -width * (.35 + progress * .38), 0, width * 1.8, height)
      nearContext.globalAlpha = 1
    }
    const centre = width * (1.28 - 1.7 * smooth(clamp((progress - .04) / .92)))
    nearContext.save()
    nearContext.translate(centre, height * .46)
    nearContext.scale(.65, 1)
    const veil = nearContext.createRadialGradient(0, 0, 0, 0, 0, Math.max(width * .3, height * .7))
    veil.addColorStop(0, '#5c8cbd0e')
    veil.addColorStop(.45, '#184c9808')
    veil.addColorStop(1, '#184c9800')
    nearContext.fillStyle = veil
    nearContext.fillRect(-width * 3, -height, width * 6, height * 3)
    nearContext.restore()
    // A few fine suspended specks make the near/far travel perceivable without
    // adding a surface, shoreline, bubbles or another decorative object.
    for (let index = 0; index < 22; index++) {
      const seed = Math.sin(index * 127.1 + 17) * 43758.5453
      const fraction = seed - Math.floor(seed)
      const depth = index % 3 === 0 ? 1 : .35
      const x = ((fraction * 1.4 - progress * .82 * depth + 1.4) % 1.4 - .2) * width
      const y = (.10 + ((index * .173) % .8)) * height - progress * height * .018 * depth
      nearContext.globalAlpha = depth * .18
      nearContext.fillStyle = '#9dbfdf'
      nearContext.beginPath()
      nearContext.ellipse(x, y, .65 + depth * .8, .4 + depth * .3, -.10, 0, Math.PI * 2)
      nearContext.fill()
    }
    nearContext.globalAlpha = 1
  }

  function paintCounterBubbles(state) {
    const { width, height, ratio } = layout
    if (behindContext) {
      behindContext.setTransform(ratio, 0, 0, ratio, 0, 0)
      behindContext.clearRect(0, 0, width, height)
    }
    let visible = 0
    for (const counter of counters) {
      const { letter, index, x: holeX, y: holeY } = counter
      for (let bubble = 0; bubble < 2; bubble++) {
        const start = .06 + .15 * (holeX / width) + bubble * .08
        const phase = (progress - start) / .42
        if (phase <= 0 || phase >= 1) continue
        const near = smooth(clamp((phase - .36) / .32))
        const radius = Math.max(1.05, letter.size * .011) * (.72 + near * .62) * (bubble ? .76 : 1)
        const localX = holeX + (phase - .5) * letter.size * .10 + glyphs[index * 4 + 2] * width
        const localY = holeY + (.5 - phase) * letter.size * .96
        const dy = localY - height * .46
        const x = width * .5 + state.x + state.scale * (localX - width * .5 - state.passage * .018 * dy)
        const y = height * .46 + state.y + state.scale * dy
        if (x < -radius || x > width + radius || y < -radius || y > height + radius) continue
        const context = phase < .5 ? behindContext : nearContext
        if (!context) continue
        visible++
        context.save()
        context.globalAlpha = Math.sin(phase * Math.PI) * (.30 + near * .28)
        context.filter = near > .7 ? 'blur(.25px)' : 'none'
        context.lineWidth = .55 + near * .15
        context.strokeStyle = '#a9c7e0'
        context.fillStyle = '#8eabc70c'
        context.beginPath()
        context.ellipse(x, y, radius, radius * 1.06, -.08, 0, Math.PI * 2)
        context.fill()
        context.stroke()
        context.strokeStyle = '#deebf5'
        context.beginPath()
        context.arc(x, y - radius * .05, radius * .72, Math.PI * 1.02, Math.PI * 1.5)
        context.stroke()
        context.restore()
      }
    }
    stage.dataset.spatialBubbles = String(visible)
  }

  function render(nextProgress = progress) {
    if (!active || !measured || !sourceContext) return
    progress = clamp(nextProgress)
    const passage = smooth(clamp((progress - .10) / .86))
    const x = -(layout.right + layout.width * .09) * passage
    const scale = 1 + .045 * passage
    const y = -layout.height * .022 * passage
    const lensX = layout.width * (1.28 - 1.7 * smooth(clamp((progress - .04) / .92)))
    let gapResponse = 0
    for (let index = 0; index < Math.min(letters.length, MAX_GLYPHS); index++) {
      const letter = letters[index]
      const screenX = layout.width * .5 + x + (letter.centre - layout.width * .5) * scale
      const distance = (screenX - lensX) / (layout.width * .19)
      const offset = distance * Math.exp(-distance * distance * 2) * Math.min(7, letter.size * .043)
      glyphs[index * 4 + 2] = offset / layout.width
      gapResponse = Math.max(gapResponse, Math.abs(offset))
    }
    const state = { progress, passage, x, y, scale,
      focus: Math.sin(progress * Math.PI) ** 2 * .65,
      count: Math.min(letters.length, MAX_GLYPHS), glyphs,
      bounds: [(layout.top - 8) / layout.height, (layout.bottom + 8) / layout.height] }
    water.render(progress)
    renderer.render(state)
    paintNearCurrent()
    paintCounterBubbles(state)
    stage.dataset.tidalProgress = progress.toFixed(4)
    stage.dataset.spatialX = x.toFixed(2)
    stage.dataset.spatialRenderer = renderer.kind
    stage.dataset.spatialGap = gapResponse.toFixed(3)
    stage.dataset.spatialFocus = state.focus.toFixed(3)
  }

  function measure() {
    if (!active || !sourceContext) return
    const rect = stage.getBoundingClientRect()
    layout.width = Math.max(stage.clientWidth, 1)
    layout.height = Math.max(stage.clientHeight, 1)
    layout.ratio = Math.min(1.5, Math.max(1, devicePixelRatio || 1),
      ((renderer.textureLimit || Infinity) - 1) / Math.max(layout.width, layout.height))
    layout.right = 0
    layout.top = layout.height
    layout.bottom = 0
    const { width, height, ratio } = layout
    source.width = foreground.width = behind.width = Math.ceil(width * ratio)
    source.height = foreground.height = behind.height = Math.ceil(height * ratio)
    sourceContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    sourceContext.fillStyle = '#e4edf4'
    sourceContext.textAlign = 'left'
    sourceContext.textBaseline = 'alphabetic'
    for (const letter of letters) {
      const { element, character } = letter
      const box = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const size = parseFloat(style.fontSize)
      sourceContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const glyph = style.textTransform === 'uppercase' ? character.toUpperCase() : character
      const metrics = sourceContext.measureText(glyph)
      const ascent = metrics.fontBoundingBoxAscent ?? size * .8
      const descent = metrics.fontBoundingBoxDescent ?? size * .2
      const left = box.left - rect.left
      const top = box.top - rect.top
      const baseline = top + (box.height - ascent - descent) / 2 + ascent
      sourceContext.fillText(glyph, left, baseline)
      Object.assign(letter, { size, centre: left + box.width / 2,
        inkLeft: left - (metrics.actualBoundingBoxLeft ?? 0),
        inkRight: left + (metrics.actualBoundingBoxRight ?? box.width),
        inkTop: baseline - (metrics.actualBoundingBoxAscent ?? ascent),
        inkBottom: baseline + (metrics.actualBoundingBoxDescent ?? descent) })
      layout.right = Math.max(layout.right, left + box.width)
      layout.top = Math.min(layout.top, letter.inkTop)
      layout.bottom = Math.max(layout.bottom, letter.inkBottom)
    }
    glyphs.fill(0)
    for (let index = 0; index < Math.min(letters.length, MAX_GLYPHS); index++) {
      const letter = letters[index]
      glyphs[index * 4] = index === 0 ? 0 : clamp((letters[index - 1].inkRight + letter.inkLeft) * .5 / width)
      glyphs[index * 4 + 1] = index === letters.length - 1 ? 1 : clamp((letter.inkRight + letters[index + 1].inkLeft) * .5 / width)
    }
    // Small bubbles rise through genuine counters, changing from the back
    // plane to the front while inside their openings. The outline stays whole.
    counters = letters.map((letter, index) => ({ letter, index }))
      .filter(({ letter }) => /[OBRADP]/i.test(letter.character)).slice(0, 3)
      .map(({ letter, index }) => {
        const upper = /[BRP]/i.test(letter.character)
        const fraction = /A/i.test(letter.character) ? .62 : upper ? .30 : .50
        return { letter, index,
          x: letter.inkLeft + (letter.inkRight - letter.inkLeft) * (upper ? .45 : .5),
          y: letter.inkTop + (letter.inkBottom - letter.inkTop) * fraction }
      })
    renderer.resize(width, height, ratio)
    water.resize(width, height)
    measured = true
    render()
  }

  const ready = water.ready.then(loaded => {
    if (!active || !sourceContext) return false
    if (loaded) stage.classList.add('has-tidal-wave-canvas')
    render()
    return loaded
  })
  return {
    measure, render, ready,
    destroy() {
      if (!active) return
      active = false
      controller.abort()
      water.destroy()
      originals.forEach(([run, html]) => { run.innerHTML = html })
      if (!hadCanvas) stage.classList.remove('has-tidal-wave-canvas')
      if (!hadSpatial) stage.classList.remove('is-spatial-current')
      for (const key of ['tidalProgress', 'spatialX', 'spatialRenderer', 'spatialGap', 'spatialFocus', 'spatialBubbles']) delete stage.dataset[key]
      renderer.canvas.remove()
      renderer.destroy()
      foreground.remove()
      behind.remove()
      source.width = source.height = foreground.width = foreground.height = behind.width = behind.height = 0
    },
  }
}
