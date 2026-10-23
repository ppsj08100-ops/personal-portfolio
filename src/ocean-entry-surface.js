const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t) }
const range = (value, from, to) => smooth((value - from) / (to - from))
const VERTEX = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`
const FRAGMENT = `
precision highp float;
uniform sampler2D painting, moonlit;
uniform vec2 resolution, pointer;
uniform float textureAspect, phase, impulse, progress, moonReady;
void main(){
  vec2 screen=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
  float aspect=resolution.x/resolution.y;
  vec2 crop=vec2(min(1.,aspect/textureAspect),min(1.,textureAspect/aspect));
  float pitch=smoothstep(.015,.25,progress);
  float zoom=mix(1.,1.76,pitch);
  float initialX=mix(.34,.5,smoothstep(.65,1.05,aspect));
  vec2 center=mix(vec2(initialX,.5),vec2(.27+.14*crop.x/zoom,.735),pitch);
  vec2 halfCrop=crop/zoom*.5;
  center=clamp(center,halfCrop,1.-halfCrop);
  vec2 uv=(screen-.5)*crop/zoom+center;

  // Perspective makes the distant sea almost still. The sky and the painted
  // horizon remain exact; only the water below them carries the long swells.
  float depth=smoothstep(.432,.98,uv.y);
  float sea=smoothstep(.432,.58,uv.y);
  vec2 p=vec2((uv.x-.5)*textureAspect,uv.y);
  float swell=sin(p.y*14.+p.x*1.8-phase*.72);
  float crossing=sin(p.y*21.-p.x*3.1+phase*.49+.9);
  float drift=sin(p.y*12.+p.x*2.4-phase*.53+1.2);
  vec2 flow=vec2(.0031*drift,.0072*swell+.0026*crossing);
  flow*=sea*mix(.12,1.,depth);

  // A broad, brief pressure follows the hand, without drawing cursor rings.
  vec2 distance=(screen-pointer)*vec2(aspect,1.);
  float touch=exp(-dot(distance,distance)*7.)*impulse*sea*depth;
  flow+=vec2(.0014*sin(phase*.7),-.0038)*touch;
  vec3 distant=texture2D(painting,clamp(uv+flow,0.,1.)).rgb;

  // Looking down replaces the foreshortened horizon with the same painted sea
  // seen from above. Its broken moon path sits just left of the camera centre.
  vec2 moonCrop=crop*.68;
  vec2 moonUV=(screen-.5)*moonCrop+vec2(.5+.14*moonCrop.x,.43);
  float lens=sin(smoothstep(.31,.50,progress)*3.14159265);
  vec2 refraction=vec2(sin(screen.y*6.+phase*.4),cos(screen.x*5.-phase*.5))*.009*lens;
  vec2 moonFlow=vec2(.0028*drift,.0055*swell+.002*crossing);
  vec3 close=texture2D(moonlit,clamp(moonUV+moonFlow+refraction,0.,1.)).rgb;
  float overhead=smoothstep(.225,.30,progress)*moonReady;
  vec3 color=mix(distant,close,overhead);
  vec2 lightDistance=(screen-vec2(.36,.22))*vec2(aspect,1.);
  float light=exp(-dot(lightDistance,lightDistance)*1.8)*lens;
  color=mix(color,vec3(.39,.55,.66),light*.11);
  gl_FragColor=vec4(color,1.);
}`

// This canvas only animates the painted water. The descent keeps ownership of
// the scene's camera transform, opacity and the transition to the next chapter.
export function createOceanEntrySurface(scene) {
  const source = scene?.querySelector('img')
  if (!source) return () => {}
  const moon = new Image()
  moon.className = 'ocean-entry__moon-surface'
  moon.alt = ''
  moon.width = 1672
  moon.height = 941
  moon.decoding = 'async'
  moon.draggable = false
  source.after(moon)
  const canvas = document.createElement('canvas')
  canvas.className = 'ocean-entry__surface'
  canvas.setAttribute('aria-hidden', 'true')
  moon.after(canvas)

  let gl
  try {
    gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'low-power',
    })
  } catch { /* The original painting remains available without WebGL. */ }
  // The image pair below remains a complete camera fallback without a GPU.
  if (!gl) canvas.remove()

  const section = scene.closest('.ocean-type')
  const opening = scene.closest('.ocean-type__opening')
  const shaders = []
  let program, texture, moonTexture, buffer
  let uniforms = {}
  let disposed = false
  let failed = false
  let loaded = false
  let moonLoaded = false
  let progress = Number(section.dataset.descentProgress) || 0
  let visible = false
  let frame = 0
  let previousTime = 0
  let elapsed = 0
  let scrollPhase = 0
  let scrollTarget = 0
  let scrollDirty = true
  let width = 0
  let height = 0
  let pressure = 0
  let pressureTarget = 0
  let pointer = [.5, .7]
  let pointerTarget = [.5, .7]

  function release() {
    if (!gl) return
    if (texture) gl.deleteTexture(texture)
    if (moonTexture) gl.deleteTexture(moonTexture)
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    shaders.forEach(shader => gl.deleteShader(shader))
    texture = moonTexture = buffer = program = undefined
    shaders.length = 0
  }

  function fallback() {
    failed = true
    cancelAnimationFrame(frame)
    frame = 0
    canvas.style.opacity = '0'
    delete canvas.dataset.surfaceReady
    release()
  }

  function compile(type, code) {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Surface shader unavailable')
    shaders.push(shader)
    gl.shaderSource(shader, code)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Surface shader compilation failed')
    return shader
  }

  function resize() {
    if (disposed) return
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    width = scene.clientWidth
    height = scene.clientHeight
    if (gl && !failed) {
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    fallbackCamera()
    scrollDirty = true
    wake()
  }

  function canRun() {
    return !disposed && gl && !failed && loaded && visible && !document.hidden
      && opening.style.visibility !== 'hidden'
  }

  function wake() {
    if (!frame && canRun()) {
      previousTime = 0
      frame = requestAnimationFrame(tick)
    }
  }

  function tick(now) {
    frame = 0
    if (!canRun()) { previousTime = 0; return }
    // Thirty draws per second are ample for a slow swell, including on phones.
    if (previousTime && now - previousTime < 32) {
      frame = requestAnimationFrame(tick)
      return
    }
    const dt = previousTime ? Math.min((now - previousTime) / 1000, .07) : 1 / 30
    previousTime = now
    elapsed += dt
    if (scrollDirty) {
      scrollDirty = false
      scrollTarget = clamp(-section.getBoundingClientRect().top / Math.max(height, 1), -1, 3) * .7
    }
    const ease = 1 - Math.exp(-dt * 3.2)
    scrollPhase += (scrollTarget - scrollPhase) * ease
    pointer = pointer.map((value, i) => value + (pointerTarget[i] - value) * ease)
    pressure += (pressureTarget - pressure) * (1 - Math.exp(-dt * 4))
    pressureTarget *= Math.exp(-dt * 2.3)
    gl.useProgram(program)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform2f(uniforms.pointer, ...pointer)
    gl.uniform1f(uniforms.textureAspect, source.naturalWidth / source.naturalHeight)
    gl.uniform1f(uniforms.phase, elapsed + scrollPhase)
    gl.uniform1f(uniforms.impulse, pressure)
    gl.uniform1f(uniforms.progress, progress)
    gl.uniform1f(uniforms.moonReady, moonLoaded ? 1 : 0)
    gl.uniform1i(uniforms.painting, 0)
    gl.uniform1i(uniforms.moonlit, 1)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    canvas.style.opacity = '1'
    canvas.dataset.surfaceReady = 'true'
    frame = requestAnimationFrame(tick)
  }

  function upload() {
    if (disposed || !gl || failed || loaded || !source.naturalWidth) return
    try {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Surface texture upload failed')
      loaded = true
      resize()
    } catch { fallback() }
  }

  function uploadMoon() {
    if (disposed || !gl || failed || moonLoaded || !moon.naturalWidth) return
    try {
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, moonTexture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, moon)
      gl.activeTexture(gl.TEXTURE0)
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Moon surface upload failed')
      moonLoaded = true
      wake()
    } catch { fallback() }
  }

  function onMoonLoad() { fallbackCamera(); uploadMoon() }
  function onMoonError() { moon.style.display = 'none'; moonLoaded = false }

  function fallbackCamera() {
    if (!width || !height) return
    const aspect = width / height
    const textureAspect = (source.naturalWidth || 1672) / (source.naturalHeight || 941)
    const crop = [Math.min(1, aspect / textureAspect), Math.min(1, textureAspect / aspect)]
    const pitch = range(progress, .015, .25)
    const zoom = 1 + .76 * pitch
    const initialX = .34 + .16 * range(aspect, .65, 1.05)
    const center = [initialX + (.27 + .14 * crop[0] / zoom - initialX) * pitch, .5 + .235 * pitch]
      .map((value, i) => clamp(value, crop[i] / zoom * .5, 1 - crop[i] / zoom * .5))
    const baseX = clamp(initialX, crop[0] * .5, 1 - crop[0] * .5)
    const positionX = crop[0] < .9999 ? (baseX - crop[0] * .5) / (1 - crop[0]) : .5
    source.style.objectPosition = `${(positionX * 100).toFixed(3)}% 50%`
    source.style.transform = `translate3d(${((baseX - center[0]) / crop[0] * zoom * width).toFixed(3)}px,${((.5 - center[1]) / crop[1] * zoom * height).toFixed(3)}px,0) scale(${zoom.toFixed(4)})`
    moon.style.opacity = range(progress, .225, .30).toFixed(4)
    moon.style.transform = `translate3d(${(-width * .14).toFixed(3)}px,${(.07 / crop[1] / .68 * height).toFixed(3)}px,0) scale(${(1 / .68).toFixed(4)})`
    scene.dataset.cameraPitch = pitch.toFixed(4)
  }

  function onCamera(event) {
    progress = clamp(Number(event.detail?.progress) || 0, 0, 1)
    fallbackCamera()
    wake()
  }

  function onPointer(event) {
    if (!visible || event.pointerType === 'touch') return
    const rect = scene.getBoundingClientRect()
    const next = [clamp((event.clientX - rect.left) / rect.width, 0, 1), clamp((event.clientY - rect.top) / rect.height, 0, 1)]
    pressureTarget = Math.min(1, pressureTarget + Math.hypot(next[0] - pointerTarget[0], next[1] - pointerTarget[1]) * 3)
    pointerTarget = next
    wake()
  }

  function onScroll() { scrollDirty = true; wake() }
  function onVisibility() {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0 }
    else wake()
  }
  function onContextLost(event) { event.preventDefault(); fallback() }

  try {
    if (!gl) throw new Error('WebGL unavailable')
    const vertex = compile(gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    program = gl.createProgram()
    if (!program) throw new Error('Surface program unavailable')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Surface program link failed')
    gl.useProgram(program)
    buffer = gl.createBuffer()
    texture = gl.createTexture()
    moonTexture = gl.createTexture()
    if (!buffer || !texture || !moonTexture) throw new Error('Surface resources unavailable')
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    uniforms = Object.fromEntries(['painting', 'moonlit', 'resolution', 'pointer', 'textureAspect', 'phase', 'impulse', 'progress', 'moonReady'].map(name => [name, gl.getUniformLocation(program, name)]))
    ;[texture, moonTexture].forEach((map, index) => {
      gl.activeTexture(gl.TEXTURE0 + index)
      gl.bindTexture(gl.TEXTURE_2D, map)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([2, 11, 26, 255]))
    })
    gl.activeTexture(gl.TEXTURE0)
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Surface initialization failed')
  } catch { fallback() }

  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    if (!visible) { cancelAnimationFrame(frame); frame = 0; previousTime = 0 }
    else wake()
  })
  intersection.observe(opening)
  const dimensions = new ResizeObserver(resize)
  dimensions.observe(scene)
  // The descent scrubs visibility after the native scroll event. Observe that
  // handoff so a single reverse jump also wakes the sea, without another input.
  const presence = new MutationObserver(() => {
    if (opening.style.visibility === 'hidden') {
      cancelAnimationFrame(frame)
      frame = 0
      previousTime = 0
    } else wake()
  })
  presence.observe(opening, { attributes: true, attributeFilter: ['style'] })
  source.addEventListener('load', upload)
  source.addEventListener('error', fallback)
  moon.addEventListener('load', onMoonLoad)
  moon.addEventListener('error', onMoonError)
  section.addEventListener('ocean-entry-camera', onCamera)
  canvas.addEventListener('webglcontextlost', onContextLost)
  opening.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  if (source.complete) upload()
  moon.src = '/images/works-moonlit-overhead.png'

  return () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    intersection.disconnect()
    dimensions.disconnect()
    presence.disconnect()
    source.removeEventListener('load', upload)
    source.removeEventListener('error', fallback)
    moon.removeEventListener('load', onMoonLoad)
    moon.removeEventListener('error', onMoonError)
    section.removeEventListener('ocean-entry-camera', onCamera)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    opening.removeEventListener('pointermove', onPointer)
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('visibilitychange', onVisibility)
    release()
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    source.style.removeProperty('object-position')
    source.style.removeProperty('transform')
    delete scene.dataset.cameraPitch
    moon.remove()
    canvas.remove()
  }
}
