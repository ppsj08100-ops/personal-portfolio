const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }

function box(rect) {
  if (!rect || ![rect.x ?? rect.left, rect.y ?? rect.top, rect.width, rect.height].every(Number.isFinite)) return null
  return { x: rect.x ?? rect.left, y: rect.y ?? rect.top, width: rect.width, height: rect.height }
}

const vertexSource = `
  precision highp float;
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = vec2(a_position.x * .5 + .5, .5 - a_position.y * .5);
    gl_Position = vec4(a_position, 0., 1.);
  }
`
const fragmentSource = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform vec4 u_box;
  uniform vec2 u_hole;
  uniform vec2 u_detail;
  uniform float u_time;
  uniform float u_opacity;
  uniform vec4 u_card;
  uniform float u_radius;
  uniform float u_occlude;
  uniform vec4 u_contact;

  vec3 straight(vec4 color) { return color.rgb / max(color.a, .025); }
  float random(float value) { return fract(sin(value * 127.1 + 31.7) * 43758.5453); }
  vec4 over(vec4 under, vec3 color, float alpha) {
    return vec4(color * alpha + under.rgb * (1. - alpha), alpha + under.a * (1. - alpha));
  }
  vec4 touchWater(vec4 water, vec2 p) {
    float phase = u_contact.w;
    if (phase < .06 || phase > .94 || abs(p.x - u_contact.x) > u_contact.z * .58
      || abs(p.y - u_contact.y) > 105.) return water;
    float fan = smoothstep(.095, .165, phase) * (1. - smoothstep(.27, .41, phase));
    for (int i = 0; i < 2; i++) {
      float side = i == 0 ? -1. : 1.;
      vec2 origin = vec2(u_contact.x + side * u_contact.z * .35, u_contact.y);
      float span = min(38., u_contact.z * .092);
      float along = (p.x - origin.x) * side / span;
      float profile = sin(clamp(along, 0., 1.) * 3.141593);
      float rise = 26. * sin(clamp((phase - .07) / .34, 0., 1.) * 3.141593);
      float top = origin.y - rise * profile;
      float bottom = origin.y + 2. - rise * profile * .24;
      float shape = smoothstep(0., .10, along) * (1. - smoothstep(.85, 1., along))
        * smoothstep(top - .75, top + .75, p.y) * (1. - smoothstep(bottom - .75, bottom + .75, p.y));
      float cross = clamp((p.y - top) / max(2., bottom - top), 0., 1.);
      float rim = exp(-pow((p.y - top - .65) / 1.25, 2.));
      vec3 glass = mix(vec3(.37, .66, .82), vec3(.025, .16, .29), cross);
      glass += vec3(.60, .75, .81) * rim * .65;
      glass += vec3(.10, .19, .24) * sin(cross * 3.141593);
      water = over(water, glass, shape * fan * .67 * u_opacity);
    }
    for (int i = 0; i < 8; i++) {
      float f = float(i), seed = random(f + 1.);
      float launch = .14 + seed * .04;
      float t = clamp((phase - launch) / (.90 - launch), 0., 1.);
      float show = smoothstep(0., .045, t) * (1. - smoothstep(.84, 1., t));
      float side = mod(f, 2.) < .5 ? -1. : 1.;
      float scale = min(1., u_contact.z / 430.);
      float rise = (82. + seed * 31.) * scale;
      float landing = 6. + random(f + 8.) * 12.;
      float vx = side * (13. + random(f + 4.) * 15.);
      vec2 origin = vec2(u_contact.x + side * u_contact.z * .35 + (random(f + 2.) - .5) * 10., u_contact.y);
      vec2 center = origin + vec2(vx * t, -rise * t + (rise + landing) * t * t);
      vec2 direction = normalize(vec2(vx, -rise + 2. * (rise + landing) * t));
      vec2 offset = p - center;
      float radius = (1.9 + random(f + 10.) * 2.2) * max(.78, scale);
      vec2 q = vec2(dot(offset, vec2(-direction.y, direction.x)) / (radius * .73),
        dot(offset, direction) / (radius * 1.35));
      float d = dot(q, q);
      float shape = 1. - smoothstep(.72, 1.20, d);
      vec3 normal = normalize(vec3(q, sqrt(max(.015, 1. - d))));
      float diffuse = max(0., dot(normal, normalize(vec3(-.45, -.65, .72))));
      float specular = pow(diffuse, 15.);
      vec3 glass = mix(vec3(.025, .12, .23), vec3(.31, .62, .79), diffuse)
        + vec3(.78, .91, .98) * specular * .86;
      water = over(water, glass, shape * show * .88 * u_opacity);
    }
    return water;
  }
  void main() {
    vec2 p = v_uv * u_resolution;
    vec2 uv = (p - u_box.xy) / u_box.zw;
    if (min(uv.x, uv.y) < 0. || max(uv.x, uv.y) > 1.) discard;
    vec4 fixedWater = texture2D(u_image, uv);
    if (fixedWater.a < .003 && (u_contact.w < .06 || u_contact.w > .94)) discard;
    float pressure = sin(clamp((u_contact.w - .015) / .285, 0., 1.) * 3.141593);
    vec2 contactOffset = p - vec2(u_contact.x, u_contact.y + 2.);
    float well = exp(-pow(contactOffset.x / (u_contact.z * .39), 2.) - pow(contactOffset.y / 19., 2.)) * pressure;
    if (well > .001) {
      vec4 pressed = texture2D(u_image, uv + vec2(0., 3. * well / u_box.w));
      fixedWater.rgb = straight(pressed) * fixedWater.a;
    }

    // Elliptical coordinates follow the photographed water plane. The pit
    // and final twelve percent of the silhouette never advect or change alpha.
    float farDepth = max(.22, u_hole.y - .09);
    float nearDepth = max(.18, .95 - u_hole.y);
    vec2 ellipse = vec2(.49, uv.y < u_hole.y ? farDepth : nearDepth);
    vec2 q = (uv - u_hole) / ellipse;
    float r = length(q);
    float angle = atan(q.y, q.x);
    float flow = smoothstep(.11, .24, r) * (1. - smoothstep(.72, .88, r));
    float speed = mix(.235, .052, smoothstep(.16, .84, r));
    float turn = -u_time * speed * flow;
    float pull = .008 * sin(r * 14. + u_time * .34)
      + .003 * sin(angle * 3. + r * 9. + u_time * .19);
    vec2 refracted = q * (1. + pull * flow);
    float c = cos(turn), s = sin(turn);
    vec2 moved = vec2(c * refracted.x - s * refracted.y, s * refracted.x + c * refracted.y);
    vec2 movingScale = vec2(.49, moved.y < 0. ? farDepth : nearDepth);
    vec2 movingUv = clamp(u_hole + moved * movingScale, vec2(.001), vec2(.999));
    vec4 movingWater = texture2D(u_image, movingUv);
    vec3 moving = straight(movingWater);
    vec3 blurred = (
      straight(texture2D(u_image, clamp(movingUv + vec2(u_detail.x, 0.), vec2(.001), vec2(.999))))
      + straight(texture2D(u_image, clamp(movingUv - vec2(u_detail.x, 0.), vec2(.001), vec2(.999))))
      + straight(texture2D(u_image, clamp(movingUv + vec2(0., u_detail.y), vec2(.001), vec2(.999))))
      + straight(texture2D(u_image, clamp(movingUv - vec2(0., u_detail.y), vec2(.001), vec2(.999))))
    ) * .25;
    float wet = flow * smoothstep(.04, .30, movingWater.a);
    vec3 original = straight(fixedWater);
    // Keep most of the baked low-frequency depth and lighting stationary.
    // Advect the silver ripples and a restrained amount of the water body.
    vec3 color = mix(original, moving, wet * .24) + (moving - blurred) * wet * .52;
    float caustic = pow(max(0., sin(r * 30. + angle * 2.6 + u_time * .73
      + sin(angle * 3. - u_time * .18) * .75)), 14.);
    color += vec3(.17, .27, .32) * caustic * wet * .11;
    float rippleTime = clamp((u_contact.w - .12) / .56, 0., 1.);
    vec2 ripplePosition = (p - vec2(u_contact.x, u_contact.y + 11.)) / vec2(u_contact.z * .53, 19.);
    float ripple = exp(-pow((length(ripplePosition) - .20 - rippleTime * .85) / .055, 2.))
      * sin(rippleTime * 3.141593) * smoothstep(-.20, .60, ripplePosition.y);
    color += vec3(.15, .25, .31) * ripple * .35;
    float alpha = fixedWater.a * u_opacity;
    vec4 water = touchWater(vec4(clamp(color, 0., 1.) * alpha, alpha), p);
    if (u_occlude > .5) {
      vec2 d = abs(p - u_card.xy - u_card.zw * .5) - (u_card.zw * .5 - u_radius);
      float distance = length(max(d, 0.)) + min(max(d.x, d.y), 0.) - u_radius;
      water *= smoothstep(-.7, .7, distance);
    }
    gl_FragColor = water;
  }
`

function webglRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false })
  if (!gl) return null
  const shaders = []
  let program, buffer, texture
  const destroy = () => {
    if (texture) gl.deleteTexture(texture)
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    shaders.forEach(shader => gl.deleteShader(shader))
  }
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type)
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Water flow unavailable')
      return shader
    }
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water flow unavailable')
    gl.useProgram(program)
    buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniforms = Object.fromEntries(['image', 'resolution', 'box', 'hole', 'detail', 'time', 'opacity', 'card', 'radius', 'occlude', 'contact']
      .map(key => [key, gl.getUniformLocation(program, `u_${key}`)]))
    texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    return {
      gl, destroy,
      clear() { gl.clear(gl.COLOR_BUFFER_BIT) },
      resize() { gl.viewport(0, 0, canvas.width, canvas.height) },
      upload(image, document) {
        const limit = Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE))
        const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight))
        let source = image
        if (scale < 1) {
          source = document.createElement('canvas')
          source.width = Math.round(image.naturalWidth * scale)
          source.height = Math.round(image.naturalHeight * scale)
          source.getContext('2d').drawImage(image, 0, 0, source.width, source.height)
        }
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      },
      draw({ width, height, rect, hole, time, opacity, card, radius, contact }) {
        gl.useProgram(program)
        gl.uniform1i(uniforms.image, 0)
        gl.uniform2f(uniforms.resolution, width, height)
        gl.uniform4f(uniforms.box, rect.x, rect.y, rect.width, rect.height)
        gl.uniform2f(uniforms.hole, hole.x, hole.y)
        gl.uniform2f(uniforms.detail, 4 / rect.width, 4 / rect.height)
        gl.uniform1f(uniforms.time, time)
        gl.uniform1f(uniforms.opacity, opacity)
        gl.uniform4f(uniforms.card, card?.x || 0, card?.y || 0, card?.width || 0, card?.height || 0)
        gl.uniform1f(uniforms.radius, radius)
        gl.uniform1f(uniforms.occlude, card && card.y + card.height > 0 ? 1 : 0)
        gl.uniform4f(uniforms.contact, contact.x, contact.y, contact.width, contact.impact)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      },
    }
  } catch {
    destroy()
    return null
  }
}

export function createPortfolioWaterVortex(section) {
  const empty = { update() {}, measure() {}, destroy() {} }
  if (!section) return empty
  const document = section.ownerDocument
  const view = document.defaultView
  if (!view) return empty
  let canvas = document.createElement('canvas')
  let renderer = webglRenderer(canvas)
  let context = null
  if (!renderer) {
    canvas = document.createElement('canvas')
    context = canvas.getContext('2d')
    if (!context) return empty
  }
  canvas.className = 'portfolio__water-vortex'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.hidden = true
  canvas.dataset.ready = 'false'
  canvas.dataset.active = 'false'
  canvas.dataset.renderer = renderer ? 'webgl' : 'static'
  document.body.append(canvas)
  const events = new AbortController()
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)')
  const image = new view.Image()
  image.decoding = 'async'
  image.fetchPriority = 'low'
  const state = { voyage: 0, impact: 0, entry: 0, landingRect: null, occluderRect: null, hole: { x: .5, y: .5 } }
  let width = 0, height = 0, frame = 0, elapsed = 0, previous = 0
  let ready = false, disposed = false, url = '', radius = 24
  const opacity = () => smooth((state.voyage - .80) / .08) * (1 - smooth((state.entry - .02) / .08))

  function measure() {
    if (disposed) return
    width = view.innerWidth
    height = view.innerHeight
    const ratio = Math.min(view.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    if (renderer) renderer.resize()
    else context.setTransform(ratio, 0, 0, ratio, 0, 0)
    const card = document.querySelector('.capability-step:first-child .capability-card')
    if (card) radius = Number.parseFloat(view.getComputedStyle(card).borderTopLeftRadius) || 24
  }
  function placement() {
    const landing = state.landingRect
    const w = Math.min(width * .94, landing.width * 1.90)
    const h = Math.min(w * .52, height * .48)
    const cx = landing.x + landing.width / 2
    const cy = Math.min(landing.y + landing.height + 5, height - h * .42)
    return { x: cx - w / 2, y: cy - h / 2, width: w, height: h }
  }
  function visible() {
    if (disposed || !ready || document.hidden || !state.landingRect || opacity() < .001) return false
    const rect = placement()
    return rect.x + rect.width > 0 && rect.x < width && rect.y + rect.height > 0 && rect.y < height
  }
  function clear() {
    if (renderer) renderer.clear()
    else context.clearRect(0, 0, width, height)
  }
  function draw(now) {
    frame = 0
    clear()
    if (!visible()) { previous = 0; canvas.hidden = true; canvas.dataset.active = 'false'; return }
    if (renderer && !reduced.matches && previous) elapsed += Math.min((now - previous) / 1000, .05)
    previous = now
    const rect = placement()
    const card = state.occluderRect
    const time = reduced.matches ? 0 : elapsed
    canvas.hidden = false
    canvas.dataset.active = 'true'
    canvas.dataset.time = time.toFixed(3)
    canvas.dataset.center = `${(rect.x + rect.width * state.hole.x).toFixed(2)},${(rect.y + rect.height * state.hole.y).toFixed(2)}`
    canvas.dataset.radius = `${(rect.width / 2).toFixed(2)},${(rect.height / 2).toFixed(2)}`
    canvas.dataset.opacity = opacity().toFixed(3)
    const landing = state.landingRect
    const contact = { x: landing.x + landing.width / 2, y: landing.y + landing.height + 11,
      width: landing.width, impact: state.impact }
    canvas.dataset.impact = state.impact.toFixed(4)
    canvas.dataset.contact = `${contact.x.toFixed(2)},${contact.y.toFixed(2)}`
    canvas.dataset.pressure = Math.sin(clamp((state.impact - .015) / .285) * Math.PI).toFixed(3)
    if (renderer) renderer.draw({ width, height, rect, hole: state.hole, time, opacity: opacity(), card, radius, contact })
    else {
      context.save()
      context.globalAlpha = opacity()
      context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
      context.restore()
      if (card && card.y + card.height > 0) {
        context.save()
        context.globalCompositeOperation = 'destination-out'
        context.beginPath()
        context.roundRect(card.x, card.y, card.width, card.height, radius)
        context.fill()
        context.restore()
      }
    }
    if (renderer && !reduced.matches) frame = view.requestAnimationFrame(draw)
  }
  function schedule() {
    if (disposed) return
    if (visible()) {
      if (!frame) frame = view.requestAnimationFrame(draw)
    } else {
      if (frame) view.cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      clear()
      canvas.hidden = true
      canvas.dataset.active = 'false'
    }
  }
  function update(values = {}) {
    if (disposed) return
    for (const key of ['voyage', 'impact', 'entry']) if (key in values) state[key] = clamp(values[key])
    for (const key of ['landingRect', 'occluderRect']) if (key in values) state[key] = box(values[key])
    if (values.hole && Number.isFinite(values.hole.x) && Number.isFinite(values.hole.y)) {
      state.hole = { x: clamp(values.hole.x), y: clamp(values.hole.y) }
    }
    if (typeof values.image === 'string' && values.image && values.image !== url) {
      url = values.image
      ready = false
      canvas.dataset.ready = 'false'
      image.src = url
    }
    canvas.dataset.phase = state.entry >= .10 ? 'complete' : state.entry > .02 ? 'leaving'
      : state.impact > .001 ? 'card-departing' : state.voyage >= .80 ? 'vortex' : 'idle'
    schedule()
  }
  image.addEventListener('load', () => {
    if (disposed) return
    ready = image.naturalWidth > 0 && image.naturalHeight > 0
    if (ready && renderer) renderer.upload(image, document)
    canvas.dataset.ready = String(ready)
    schedule()
  }, { signal: events.signal })
  image.addEventListener('error', () => {
    ready = false
    canvas.dataset.ready = 'error'
    schedule()
  }, { signal: events.signal })
  const resized = () => { measure(); schedule() }
  view.addEventListener('resize', resized, { signal: events.signal })
  document.addEventListener('visibilitychange', schedule, { signal: events.signal })
  reduced.addEventListener('change', () => { previous = 0; schedule() }, { signal: events.signal })
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    if (disposed) return
    if (frame) view.cancelAnimationFrame(frame)
    frame = 0
    const fallback = document.createElement('canvas')
    const paint = fallback.getContext('2d')
    if (!paint) { ready = false; schedule(); return }
    fallback.className = canvas.className
    fallback.setAttribute('aria-hidden', 'true')
    Object.assign(fallback.dataset, canvas.dataset, { renderer: 'static' })
    canvas.replaceWith(fallback)
    canvas = fallback
    renderer?.destroy()
    renderer = null
    context = paint
    previous = 0
    measure()
    schedule()
  }, { signal: events.signal })
  measure()
  return {
    update, measure,
    destroy() {
      if (disposed) return
      disposed = true
      events.abort()
      if (frame) view.cancelAnimationFrame(frame)
      frame = 0
      renderer?.destroy()
      canvas.remove()
    },
  }
}
