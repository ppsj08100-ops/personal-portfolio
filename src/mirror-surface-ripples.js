const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const VERTEX = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`
const FRAGMENT = `
precision mediump float;
uniform vec2 resolution;
uniform float phase, strength, textureAspect;
uniform sampler2D water;
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 float aspect=resolution.x/resolution.y;
 vec2 p=(uv-.5)*vec2(aspect,1.);

 // Two long directional swells bend the painting as one continuous surface.
 // Their analytic slopes stay broad; the illustration supplies all highlights.
 float a=dot(p,vec2(.18,1.))*5.6-phase*.82;
 float b=dot(p,vec2(.63,.78))*10.2+phase*.48+.8;
 vec2 slope=strength*(
  .028*5.6*vec2(.18,1.)*cos(a)+
  .012*10.2*vec2(.63,.78)*cos(b)
 );
 vec3 normal=normalize(vec3(-slope,1.));

 // Preserve the painted wave proportions on portrait and landscape screens.
 vec2 crop=vec2(min(1.,aspect/textureAspect),min(1.,textureAspect/aspect));
 vec2 sampleUV=(vec2(uv.x,1.-uv.y)-.5)*crop+.5;
 sampleUV+=normal.xy*.048+vec2(phase*.0018,-phase*.0009)*strength;
 vec3 reflection=texture2D(water,clamp(sampleUV,.01,.99)).rgb;
 float edge=smoothstep(0.,.035,uv.x)*smoothstep(0.,.035,1.-uv.x)*smoothstep(0.,.07,uv.y)*smoothstep(0.,.07,1.-uv.y);
 gl_FragColor=vec4(reflection*.98,edge);
}`

// A pair of broad swells gently bends the painted water. No procedural glints,
// contour strokes, clock or ticker: the drift and its damping follow the scroll.
export function createMirrorSurfaceRipples(canvas) {
  const noop = { resize() {}, render() {}, destroy() {} }
  canvas.style.opacity = '0'
  delete canvas.dataset.surfaceReady

  let gl
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      depth: false,
      stencil: false,
    })
  } catch {
    return noop
  }
  if (!gl) return noop

  let destroyed = false
  let failed = false
  let loaded = false
  let width = 0
  let height = 0
  let ratio = 1
  let lastState
  let image
  let program
  let buffer
  let texture
  let uniforms = {}
  const shaders = []

  function releaseResources() {
    // Partial setup and a lost context both reach this cleanup path. Keep
    // disposal safe even when the browser has already reclaimed the context.
    try {
      if (texture) gl.deleteTexture(texture)
      if (buffer) gl.deleteBuffer(buffer)
      shaders.forEach(shader => gl.deleteShader(shader))
      if (program) gl.deleteProgram(program)
    } catch {
      // The underlying WebGL context may no longer accept calls.
    }
    texture = undefined
    buffer = undefined
    program = undefined
    shaders.length = 0
  }

  function detachImage() {
    if (!image) return
    image.onload = null
    image.onerror = null
  }

  function degrade() {
    failed = true
    loaded = false
    lastState = undefined
    canvas.style.opacity = '0'
    delete canvas.dataset.surfaceReady
    detachImage()
    canvas.removeEventListener('webglcontextlost', degrade)
    releaseResources()
  }

  function compile(type, source) {
    const shader = gl.createShader(type)
    if (!shader) return null
    shaders.push(shader)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
  }

  try {
    const vertex = compile(gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    program = gl.createProgram()
    if (!vertex || !fragment || !program) throw new Error('Water shader setup failed')
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water shader link failed')
    gl.useProgram(program)

    buffer = gl.createBuffer()
    if (!buffer) throw new Error('Water vertex buffer unavailable')
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    if (position < 0) throw new Error('Water vertex attribute unavailable')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    uniforms = Object.fromEntries(
      ['resolution', 'phase', 'strength', 'textureAspect', 'water']
        .map(name => [name, gl.getUniformLocation(program, name)]),
    )

    texture = gl.createTexture()
    if (!texture) throw new Error('Water texture unavailable')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Water renderer initialization failed')

    canvas.addEventListener('webglcontextlost', degrade)
    image = new Image()
    image.onload = () => {
      if (destroyed || failed || gl.isContextLost()) return
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        if (gl.getError() !== gl.NO_ERROR) throw new Error('Water texture upload failed')
        loaded = true
        canvas.dataset.surfaceReady = 'true'
        if (lastState) render(lastState)
      } catch {
        degrade()
      }
    }
    image.onerror = degrade
    image.src = '/images/approach-midnight-water.png'
  } catch {
    degrade()
  }

  function resize(nextWidth, nextHeight) {
    if (destroyed || failed) return
    try {
      if (gl.isContextLost()) return degrade()
      const nextRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      if (width === nextWidth && height === nextHeight && ratio === nextRatio) return
      width = nextWidth
      height = nextHeight
      ratio = nextRatio
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      gl.viewport(0, 0, canvas.width, canvas.height)
    } catch {
      degrade()
    }
  }

  function render(state) {
    if (destroyed || failed) return
    try {
      lastState = state
      resize(state.width, state.height)
      if (failed) return
      const p = clamp(state.progress)
      const presence = smooth((p - .02) / .22) * (1 - smooth((p - .44) / .29))
      canvas.style.opacity = String(loaded ? presence : 0)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (!loaded || presence < .0001) return
      gl.useProgram(program)
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform1f(uniforms.phase, smooth((p - .08) / .57) * 2.5)
      gl.uniform1f(uniforms.strength, 1 - smooth((p - .37) / .36))
      gl.uniform1f(uniforms.textureAspect, image.naturalWidth / image.naturalHeight)
      gl.uniform1i(uniforms.water, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    } catch {
      degrade()
    }
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    detachImage()
    lastState = undefined
    canvas.removeEventListener('webglcontextlost', degrade)
    releaseResources()
    try {
      if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      // Disposal should not interrupt the surrounding section cleanup.
    }
    canvas.width = 0
    canvas.height = 0
    canvas.style.opacity = '0'
    delete canvas.dataset.surfaceReady
  }

  return { resize, render, destroy }
}
