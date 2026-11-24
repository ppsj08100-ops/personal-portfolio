import { getWreckOcclusion } from './insight-wreck-occlusion.js'

const VERTEX = `
  attribute vec2 a_uv;
  uniform vec2 u_viewport;
  uniform vec2 u_center;
  uniform vec2 u_size;
  uniform vec2 u_artOrigin;
  uniform vec2 u_artSize;
  uniform mat3 u_projection;
  uniform float u_time;
  uniform float u_kind;
  uniform float u_hinge;
  uniform float u_direction;
  uniform float u_angle;
  uniform float u_phase;
  uniform float u_speed;
  uniform float u_sway;
  varying MASK_UV_PRECISION vec2 v_uv;
  varying MASK_UV_PRECISION vec2 v_artUv;
  void main() {
    v_uv = a_uv;
    vec2 p = (a_uv - .5) * u_size;
    if (u_kind < .5) {
      // The seated torso and pelvis stay attached to the rail. Only the tail bends.
      float tail = smoothstep(u_hinge, 1.0, a_uv.y);
      float wave = u_time * 1.05 - tail * 2.2;
      p.x += sin(wave) * pow(tail, 1.8) * u_size.x * .055;
      p.y += cos(wave + .6) * pow(tail, 2.5) * u_size.y * .006;
    } else if (u_kind < 1.5) {
      float junction = u_hinge > 0.0 ? u_hinge : .4;
      float tail = 1.0 - smoothstep(.06, junction, a_uv.x);
      p.y += sin(u_time * u_speed - tail * 4.2 + u_phase) * tail * tail * u_size.y * u_sway;
    } else {
      float pulse = sin(u_time * u_speed + u_phase);
      float bell = 1.0 - smoothstep(u_hinge - .06, u_hinge + .06, a_uv.y);
      p.x *= 1.0 + pulse * bell * .025;
      p.y += pulse * bell * smoothstep(0.0, u_hinge, a_uv.y) * u_size.y * .005;
      float tendrils = smoothstep(u_hinge, 1.0, a_uv.y);
      float current = u_time * .72 - tendrils * 3.2 + u_phase;
      p.x += sin(current) * tendrils * tendrils * u_size.x * u_sway;
      p.y += cos(current + .7) * tendrils * tendrils * u_size.y * .007;
    }
    p.x *= u_direction;
    float c = cos(u_angle), s = sin(u_angle);
    p = mat2(c, s, -s, c) * p + u_center;
    v_artUv = (p - u_artOrigin) / u_artSize;
    vec3 projected = u_projection * vec3(p, 1.0);
    gl_Position = vec4(projected.x / u_viewport.x * 2.0 - projected.z,
                       projected.z - projected.y / u_viewport.y * 2.0,
                       0.0, projected.z);
  }
`
const FRAGMENT = `
  precision MASK_UV_PRECISION float;
  uniform sampler2D u_image;
  uniform sampler2D u_occlusion;
  uniform float u_opacity;
  uniform float u_behindWreck;
  varying MASK_UV_PRECISION vec2 v_uv;
  varying MASK_UV_PRECISION vec2 v_artUv;
  void main() {
    float visibility = mix(1.0, texture2D(u_occlusion, v_artUv).r, u_behindWreck);
    gl_FragColor = texture2D(u_image, v_uv) * u_opacity * visibility;
  }
`

// A continuous textured mesh keeps the original line drawing intact at the hip.
export function createMarineMotion(layer, images, getPoses) {
  const canvas = document.createElement('canvas')
  canvas.className = 'insight-section__marine-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  const gl = canvas.getContext('webgl', {
    alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false,
  })
  if (!gl) return null
  const shaders = [], buffers = [], textures = []
  const occlusionTextures = new Map()
  let program, sizeObserver, projectionObserver
  let disposed = false, active = false, frame = 0, lastTime = 0, elapsed = 0
  let width = 0, height = 0, artworkWidth = 1672, artworkHeight = 941
  let outputWidth = 0, outputHeight = 0
  let cameraTransform = '', cameraMatrix = null
  let observedCamera = null
  const projection = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])

  function destroy() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    sizeObserver?.disconnect()
    projectionObserver?.disconnect()
    canvas.removeEventListener('webglcontextlost', onContextLost)
    layer.classList.remove('has-marine-canvas')
    canvas.remove()
    textures.forEach(texture => gl.deleteTexture(texture))
    occlusionTextures.forEach(texture => gl.deleteTexture(texture))
    buffers.forEach(buffer => gl.deleteBuffer(buffer))
    shaders.forEach(shader => gl.deleteShader(shader))
    if (program) gl.deleteProgram(program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  function onContextLost(event) { event.preventDefault(); destroy() }
  canvas.addEventListener('webglcontextlost', onContextLost)

  try {
    // Fine ropes need subpixel mask coordinates, including on narrow screens.
    const maskPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision
      ? 'highp' : 'mediump'
    function compile(type, source) {
      const shader = gl.createShader(type)
      shaders.push(shader)
      gl.shaderSource(shader, source.replaceAll('MASK_UV_PRECISION', maskPrecision))
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Marine shader could not compile')
      return shader
    }
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Marine shader could not link')
    gl.useProgram(program)
    const maxTexture = 2 ** Math.floor(Math.log2(Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE))))
    const maxBuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
    const columns = 32, rows = 64, vertices = [], indices = []
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) vertices.push(x / columns, y / rows)
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const i = y * (columns + 1) + x
      indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1)
    }
    const vertexBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer()
    buffers.push(vertexBuffer, indexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    const uv = gl.getAttribLocation(program, 'a_uv')
    gl.enableVertexAttribArray(uv)
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0)
    const uniforms = Object.fromEntries([
      'viewport', 'center', 'size', 'artOrigin', 'artSize', 'projection', 'time', 'kind', 'hinge', 'direction', 'angle', 'phase', 'speed', 'sway', 'opacity', 'image', 'occlusion', 'behindWreck',
    ].map(key => [key, gl.getUniformLocation(program, `u_${key}`)]))
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    images.forEach(image => {
      // Mipmaps keep the fine engraved strokes calm when the sprites are small.
      const source = document.createElement('canvas')
      source.width = Math.min(maxTexture, 2 ** Math.ceil(Math.log2(Math.max(1, image.naturalWidth))))
      source.height = Math.min(maxTexture, 2 ** Math.ceil(Math.log2(Math.max(1, image.naturalHeight))))
      const context = source.getContext('2d')
      if (!context) throw new Error('Marine texture could not be prepared')
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, 0, source.width, source.height)
      const texture = gl.createTexture()
      textures.push(texture)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      gl.generateMipmap(gl.TEXTURE_2D)
      source.width = source.height = 1
    })

    function occlusionTexture() {
      const mobile = artworkWidth < artworkHeight
      if (occlusionTextures.has(mobile)) return occlusionTextures.get(mobile)
      const { width, height, paths } = getWreckOcclusion(mobile)
      const source = document.createElement('canvas')
      source.width = width; source.height = height
      const context = source.getContext('2d')
      if (!context) throw new Error('Wreck depth mask could not be prepared')
      context.fillStyle = '#fff'
      context.fillRect(0, 0, width, height)
      context.lineCap = 'round'; context.lineJoin = 'round'
      paths.forEach(shape => {
        const path = new Path2D(shape.d)
        if (shape.fill !== 'none') {
          context.fillStyle = shape.fill ?? '#000'
          context.fill(path)
        }
        if (shape.stroke && shape.stroke !== 'none') {
          context.strokeStyle = shape.stroke
          context.lineWidth = shape.strokeWidth ?? 1
          context.stroke(path)
        }
      })
      const texture = gl.createTexture()
      occlusionTextures.set(mobile, texture)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      return texture
    }
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    layer.append(canvas)

    function syncSurface() {
      if (disposed) return false
      const camera = layer.closest('.approach-helm-zoom__camera')
      const screen = camera?.parentElement
      const projected = Boolean(camera && screen)
      if (camera !== observedCamera) {
        projectionObserver?.disconnect()
        observedCamera = camera
        if (camera) {
          // Flush camera changes before paint even if this renderer's own RAF
          // ran before GSAP. No animation time advances in this redraw.
          projectionObserver ||= new MutationObserver(() => {
            if (!disposed && active && !document.hidden) draw()
          })
          projectionObserver.observe(camera, { attributes: true, attributeFilter: ['style'] })
        }
      }
      const host = projected ? screen : layer
      if (canvas.parentNode !== host) host.append(canvas)
      if (projected) {
        canvas.style.zIndex = '1'
        canvas.style.opacity = camera.style.opacity || '1'
      } else {
        canvas.style.removeProperty('z-index')
        canvas.style.removeProperty('opacity')
      }

      // Source pixels remain in the illustration's untransformed CSS space.
      // Fractional cover dimensions must survive the camera's magnification.
      const style = getComputedStyle(layer)
      const sourceWidth = style.width.endsWith('px') ? parseFloat(style.width) : layer.clientWidth
      const sourceHeight = style.height.endsWith('px') ? parseFloat(style.height) : layer.clientHeight
      if (!(sourceWidth > 0 && sourceHeight > 0) || !host.clientWidth || !host.clientHeight) return false
      width = sourceWidth
      height = sourceHeight
      outputWidth = projected ? screen.clientWidth : width
      outputHeight = projected ? screen.clientHeight : height

      if (projected) {
        const transform = camera.style.transform || 'none'
        if (!cameraMatrix || cameraTransform !== transform) {
          cameraTransform = transform
          cameraMatrix = transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform)
        }
        const worldStyle = getComputedStyle(layer.parentElement)
        const left = parseFloat(worldStyle.left) || 0
        const top = parseFloat(worldStyle.top) || 0
        const m = cameraMatrix
        // Column-major mat3: camera * translation(world cover offset).
        projection.set([
          m.m11, m.m12, m.m14,
          m.m21, m.m22, m.m24,
          m.m41 + m.m11 * left + m.m21 * top,
          m.m42 + m.m12 * left + m.m22 * top,
          m.m44 + m.m14 * left + m.m24 * top,
        ])
      } else {
        projection.set([1, 0, 0, 0, 1, 0, 0, 0, 1])
        cameraTransform = ''
        cameraMatrix = null
      }

      // A screen-sized buffer keeps enlarged sprites sharp without allocating
      // a giant canvas for the zoomed world. Never resize an unchanged buffer.
      const ratio = Math.min(devicePixelRatio || 1, 2.5,
        Math.sqrt(8_000_000 / (outputWidth * outputHeight)),
        maxBuffer / outputWidth, maxBuffer / outputHeight,
        maxViewport[0] / outputWidth, maxViewport[1] / outputHeight)
      const pixelWidth = Math.max(1, Math.min(maxBuffer, maxViewport[0], Math.round(outputWidth * ratio)))
      const pixelHeight = Math.max(1, Math.min(maxBuffer, maxViewport[1], Math.round(outputHeight * ratio)))
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        if (canvas.width !== pixelWidth) canvas.width = pixelWidth
        if (canvas.height !== pixelHeight) canvas.height = pixelHeight
        gl.viewport(0, 0, pixelWidth, pixelHeight)
      }
      return true
    }

    function draw() {
      if (disposed || !syncSurface()) return
      const scale = Math.max(width / artworkWidth, height / artworkHeight)
      const offsetX = (width - artworkWidth * scale) / 2
      const offsetY = (height - artworkHeight * scale) / 2
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uniforms.viewport, outputWidth, outputHeight)
      gl.uniformMatrix3fv(uniforms.projection, false, projection)
      gl.uniform1f(uniforms.time, elapsed)
      gl.uniform1i(uniforms.image, 0)
      gl.uniform1i(uniforms.occlusion, 1)
      gl.uniform2f(uniforms.artOrigin, offsetX, offsetY)
      gl.uniform2f(uniforms.artSize, artworkWidth * scale, artworkHeight * scale)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, occlusionTexture())
      gl.activeTexture(gl.TEXTURE0)
      getPoses(elapsed).forEach(pose => {
        gl.bindTexture(gl.TEXTURE_2D, textures[pose.texture ?? pose.kind])
        gl.uniform2f(uniforms.center, pose.x * scale + offsetX, pose.y * scale + offsetY)
        gl.uniform2f(uniforms.size, pose.width * scale, pose.height * scale)
        for (const key of ['kind', 'hinge', 'direction', 'angle', 'phase', 'opacity']) {
          gl.uniform1f(uniforms[key], pose[key])
        }
        gl.uniform1f(uniforms.speed, pose.speed ?? 2.9)
        gl.uniform1f(uniforms.sway, pose.sway ?? .075)
        gl.uniform1f(uniforms.behindWreck, pose.behindWreck ? 1 : 0)
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
      })
      layer.classList.add('has-marine-canvas')
    }
    function resize() {
      if (disposed) return
      draw()
    }
    function tick(now) {
      frame = 0
      if (disposed || !active) return
      if (lastTime) elapsed += Math.min(.06, (now - lastTime) / 1000)
      lastTime = now
      draw()
      frame = requestAnimationFrame(tick)
    }
    sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(layer)
    resize()
    return {
      setArtwork(w, h) { artworkWidth = w; artworkHeight = h; draw() },
      setActive(value) {
        if (disposed) return
        if (active === value) {
          if (!active && canvas.parentNode !== layer) syncSurface()
          return
        }
        active = value
        lastTime = 0
        if (active) { draw(); frame = requestAnimationFrame(tick) }
        else { cancelAnimationFrame(frame); frame = 0; syncSurface() }
      },
      destroy,
    }
  } catch {
    destroy()
    return null
  }
}
