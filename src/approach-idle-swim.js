import { APPROACH_SWIM_VERTEX as VERTEX } from './approach-swim-motion.js'
import { swimFrameBounds, SWIM_ENVELOPES } from './approach-swim-bounds.js'

const FRAME_MS = 1000 / 30
const COLUMNS = 64
const ROWS = 48
const HOST_DATA = ['swimState', 'swimTime', 'swimFrame', 'swimRenderer', 'swimReady', 'swimFishCount', 'swimProgress']
const FISH_HEADS = [[.10, .33], [.50, .50], [.34, .76]]

const FRAGMENT = `
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_owners;
uniform float u_kind, u_entity, u_progress;
varying vec2 v_uv;
void main() {
  if (u_kind > .5 && u_kind < 1.5) {
    if (u_progress < 0.0) discard;
    float owner = floor(texture2D(u_owners, v_uv).r * 4.0 + .5);
    if (abs(owner - (u_entity + 1.0)) > .25) discard;
  }
  vec4 original = texture2D(u_image, v_uv);
  float saturation = u_kind > .5 && u_kind < 1.5 ? .65 : .88;
  float luminance = dot(original.rgb, vec3(.213, .715, .072));
  vec3 graded = mix(vec3(luminance), original.rgb, saturation) * .94;
  // Entrance changes position and fin movement, never the animal's colour or alpha.
  gl_FragColor = vec4(graded, original.a);
}
`

function separateFish(image) {
  const source = document.createElement('canvas')
  const width = image.naturalWidth, height = image.naturalHeight
  source.width = width
  source.height = height
  const context = source.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Component analysis unavailable')
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, width, height).data
  const count = width * height
  const labels = new Int32Array(count), queue = new Int32Array(count)
  const components = []
  let componentId = 0, tail = 0
  function core(next) {
    if (!labels[next] && pixels[next * 4 + 3] >= 16) {
      labels[next] = componentId
      queue[tail++] = next
    }
  }
  for (let start = 0; start < count; start++) {
    if (labels[start] || pixels[start * 4 + 3] < 16) continue
    componentId++
    let head = 0, minX = width, minY = height, maxX = 0, maxY = 0
    tail = 1
    labels[start] = componentId
    queue[0] = start
    while (head < tail) {
      const point = queue[head++], x = point % width, y = Math.floor(point / width)
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      if (x > 0) core(point - 1)
      if (x + 1 < width) core(point + 1)
      if (y > 0) core(point - width)
      if (y + 1 < height) core(point + width)
    }
    components.push({ id: componentId, area: tail, minX, minY, maxX, maxY })
  }
  const main = components.sort((a, b) => b.area - a.area).slice(0, 3).sort((a, b) => a.minY - b.minY)
  if (main.length !== 3 || main.some(component => component.area < 100)) throw new Error('Three separate fish were not found')
  const ids = new Map(main.map((component, index) => [component.id, index + 1]))
  const owners = new Uint8Array(count)
  tail = 0
  for (let point = 0; point < count; point++) {
    const owner = ids.get(labels[point]) || 0
    if (owner) { owners[point] = owner; queue[tail++] = point }
  }
  let currentOwner = 0
  function fringe(next) {
    if (!owners[next] && pixels[next * 4 + 3] > 0) {
      owners[next] = currentOwner
      queue[tail++] = next
    }
  }
  // Extend labels through the original antialias fringes without cutting them.
  for (let head = 0; head < tail; head++) {
    const point = queue[head], x = point % width, y = Math.floor(point / width)
    currentOwner = owners[point]
    if (x > 0) fringe(point - 1)
    if (x + 1 < width) fringe(point + 1)
    if (y > 0) fringe(point - width)
    if (y + 1 < height) fringe(point + width)
  }
  const data = new Uint8Array(count)
  const alphaBounds = main.map(() => [width, height, 0, 0])
  for (let point = 0; point < count; point++) {
    if (!pixels[point * 4 + 3]) continue
    let owner = owners[point]
    const x = point % width, y = Math.floor(point / width)
    if (!owner) {
      let closest = Infinity
      main.forEach((component, index) => {
        const dx = Math.max(component.minX - x, 0, x - component.maxX)
        const dy = Math.max(component.minY - y, 0, y - component.maxY)
        const score = dx * dx + dy * dy
          + ((x - (component.minX + component.maxX) / 2) ** 2 + (y - (component.minY + component.maxY) / 2) ** 2) * .0001
        if (score < closest) { closest = score; owner = index + 1 }
      })
    }
    data[point] = owner * 64
    const bounds = alphaBounds[owner - 1]
    bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y)
    bounds[2] = Math.max(bounds[2], x + 1); bounds[3] = Math.max(bounds[3], y + 1)
  }
  source.width = source.height = 1
  return {
    data, width, height,
    parts: alphaBounds.map(bounds => [bounds[0] / width, bounds[1] / height, bounds[2] / width, bounds[3] / height]),
  }
}

/** One padded transparent mesh animates the original illustrations independently of scroll. */
export function createApproachIdleSwim(art, { onStateChange } = {}) {
  const canvas = document.createElement('canvas')
  canvas.className = 'design-process__swim-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.swimRenderer = 'webgl'
  const records = [...(art?.querySelectorAll('[data-approach-study]') || [])].map((host, order) => ({
    host, index: Number(host.dataset.approachStudy ?? order), image: host.querySelector('img'),
    originalClass: host.classList.contains('is-swimming'),
    originalData: HOST_DATA.map(key => [key, host.dataset[key]]),
    texture: null, ownerTexture: null, ownerData: null, parts: null,
    decoded: false, ready: false, loading: false, failed: false, box: null, cropBounds: null, frameBounds: null,
  })).filter(record => record.image)
  const controller = new AbortController()
  const { signal } = controller
  let gl, program, vertexBuffer, indexBuffer
  const shaders = []
  let uniforms = {}, indexCount = 0
  let disposed = false, failed = false, lost = false, enabled = true, running = false
  let activeIndex = -1, paintedIndex = -1, frame = 0, lastTick = 0, lastPaint = 0
  let elapsed = 0, paintedFrames = 0, needsDraw = true, initialized = false
  let notificationQueued = false, lastNotification = ''
  let entranceProgress = 1
  const fishPoses = FISH_HEADS.map(() => ({ x: 0, y: 0, turn: 0, progress: 1 }))

  const activeRecord = () => records.find(record => record.index === activeIndex)
  const ready = () => !disposed && !failed && records.length > 0 && records.every(record => record.ready)
  function sourceVisible(record) {
    return record && record.host.style.visibility !== 'hidden'
      && (record.host.style.opacity === '' || Number(record.host.style.opacity) > .001)
  }
  function canRun() {
    const record = activeRecord()
    return !disposed && !failed && enabled && running && record?.ready && record.box?.width > 0 && sourceVisible(record)
  }
  function state() {
    if (!enabled) return 'disabled'
    if (failed) return 'fallback'
    const record = activeRecord()
    if (!record) return 'inactive'
    if (record.failed) return 'fallback'
    if (!record.ready || paintedIndex !== activeIndex) return 'loading'
    return canRun() ? 'running' : 'paused'
  }
  function notify() {
    if (disposed || notificationQueued || typeof onStateChange !== 'function') return
    notificationQueued = true
    Promise.resolve().then(() => {
      notificationQueued = false
      if (disposed) return
      const snapshot = { ready: ready(), state: state(), active: activeIndex, renderer: failed ? 'image' : 'webgl' }
      const signature = JSON.stringify(snapshot)
      if (signature === lastNotification) return
      lastNotification = signature
      onStateChange(snapshot)
    })
  }
  function publish() {
    if (disposed) return
    const currentState = state()
    Object.assign(canvas.dataset, {
      swimState: currentState, swimReady: String(ready()), swimStudy: String(activeIndex),
      swimTime: elapsed.toFixed(4), swimFrame: String(paintedFrames),
      swimProgress: entranceProgress.toFixed(4), swimFishCount: String(activeRecord()?.parts?.length || 0),
    })
    for (const record of records) {
      record.host.dataset.swimReady = String(record.ready && !failed)
      record.host.dataset.swimRenderer = record.ready && !failed ? 'webgl' : 'image'
      record.host.dataset.swimFishCount = String(record.parts?.length || 0)
      record.host.dataset.swimProgress = entranceProgress.toFixed(4)
      record.host.dataset.swimState = !enabled ? 'disabled' : failed || record.failed ? 'fallback'
        : record.index === activeIndex ? currentState : 'inactive'
      if (record.index === activeIndex) {
        record.host.dataset.swimTime = elapsed.toFixed(4)
        record.host.dataset.swimFrame = String(paintedFrames)
      }
    }
    notify()
  }
  function stopFrame() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    lastTick = 0
    lastPaint = 0
  }
  function revealOriginals() {
    records.forEach(record => record.host.classList.remove('is-swimming'))
    canvas.remove()
    paintedIndex = -1
  }
  function fallback() {
    failed = true
    stopFrame()
    revealOriginals()
    canvas.dataset.swimRenderer = 'image'
    publish()
  }

  function initialize() {
    if (initialized || failed || disposed) return Boolean(gl && program)
    initialized = true
    try {
      gl = canvas.getContext('webgl', {
        alpha: true, premultipliedAlpha: true, antialias: true, depth: false,
        stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: true,
      })
      if (!gl) throw new Error('WebGL unavailable')
      function compile(type, source) {
        const shader = gl.createShader(type)
        if (!shader) throw new Error('Shader unavailable')
        shaders.push(shader)
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed')
        return shader
      }
      program = gl.createProgram()
      if (!program) throw new Error('Program unavailable')
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
      let fragment = FRAGMENT
      if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision > 0) fragment = fragment.replace('mediump', 'highp')
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed')
      const vertices = [], indices = []
      for (let y = 0; y <= ROWS; y++) for (let x = 0; x <= COLUMNS; x++) vertices.push(x / COLUMNS, y / ROWS)
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLUMNS; x++) {
        const index = y * (COLUMNS + 1) + x
        indices.push(index, index + 1, index + COLUMNS + 1, index + 1, index + COLUMNS + 2, index + COLUMNS + 1)
      }
      indexCount = indices.length
      vertexBuffer = gl.createBuffer()
      indexBuffer = gl.createBuffer()
      if (!vertexBuffer || !indexBuffer) throw new Error('Mesh unavailable')
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
      uniforms = Object.fromEntries(['size', 'canvas', 'origin', 'time', 'kind', 'image', 'owners', 'entity', 'turn', 'offset', 'head', 'progress']
        .map(name => [name, gl.getUniformLocation(program, `u_${name}`)]))
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.CULL_FACE)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0, 0, 0, 0)
      return true
    } catch {
      fallback()
      return false
    }
  }

  function upload(record) {
    if (disposed || failed || !enabled || !running || !record.decoded || record.ready) return
    if (!initialize()) return
    try {
      const texture = gl.createTexture()
      if (!texture) throw new Error('Texture unavailable')
      record.texture = texture
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, record.image)
      if (record.index === 1) {
        const owners = record.ownerData
        if (!owners) throw new Error('Fish component map unavailable')
        record.ownerTexture = gl.createTexture()
        if (!record.ownerTexture) throw new Error('Fish component texture unavailable')
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, record.ownerTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, owners.width, owners.height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, owners.data)
      }
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Image upload failed')
      record.ownerData = null
      record.ready = true
      record.failed = false
    } catch {
      record.failed = true
      if (record.texture && !lost) gl.deleteTexture(record.texture)
      if (record.ownerTexture && !lost) gl.deleteTexture(record.ownerTexture)
      record.texture = null
      record.ownerTexture = null
    }
  }
  async function load(record) {
    if (disposed || failed || record.loading || record.decoded) return
    record.loading = true
    try {
      if (typeof record.image.decode === 'function') await record.image.decode()
      if (disposed || failed) return
      if (!record.image.complete || !record.image.naturalWidth) throw new Error('Image unavailable')
      record.decoded = true
      record.failed = false
      if (record.index === 1 && !record.parts) {
        record.ownerData = separateFish(record.image)
        record.parts = record.ownerData.parts
      }
      upload(record)
    } catch {
      if (!disposed) record.failed = true
    } finally {
      record.loading = false
      if (!disposed) refresh()
    }
  }

  function place(record) {
    const box = record.box
    if (!box) return
    const bounds = swimFrameBounds(record, fishPoses, entranceProgress, window.devicePixelRatio)
    record.frameBounds = bounds
    canvas.className = `${record.image.className} design-process__swim-canvas`
    Object.assign(canvas.style, {
      left: `${box.imageLeft + bounds.originX}px`, top: `${box.imageTop + bounds.originY}px`,
      width: `${bounds.width}px`, height: `${bounds.height}px`,
    })
    if (canvas.width !== bounds.bufferWidth || canvas.height !== bounds.bufferHeight) {
      canvas.width = bounds.bufferWidth
      canvas.height = bounds.bufferHeight
      needsDraw = true
    }
    Object.assign(canvas.dataset, {
      swimDpr: bounds.ratio.toFixed(4), swimBufferWidth: String(canvas.width), swimBufferHeight: String(canvas.height),
      swimMesh: `${COLUMNS}x${ROWS}`, swimPadding: String(SWIM_ENVELOPES[record.index] + 4),
      swimEnvelope: String(SWIM_ENVELOPES[record.index]), swimCropX: bounds.originX.toFixed(3),
      swimCropY: bounds.originY.toFixed(3), swimPixels: String(canvas.width * canvas.height),
    })
  }
  function paint() {
    const record = activeRecord()
    if (disposed || failed || !enabled || !record?.ready || !record.box?.width) return false
    try {
      place(record)
      const box = record.box
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      const uv = gl.getAttribLocation(program, 'a_uv')
      gl.enableVertexAttribArray(uv)
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.uniform2f(uniforms.size, box.imageWidth, box.imageHeight)
      gl.uniform2f(uniforms.canvas, record.frameBounds.width, record.frameBounds.height)
      gl.uniform2f(uniforms.origin, record.frameBounds.originX, record.frameBounds.originY)
      gl.uniform1f(uniforms.time, elapsed)
      gl.uniform1f(uniforms.kind, record.index)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, record.texture)
      gl.uniform1i(uniforms.image, 0)
      if (record.ownerTexture) {
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, record.ownerTexture)
      }
      gl.uniform1i(uniforms.owners, record.ownerTexture ? 1 : 0)
      const passes = record.index === 1 ? 3 : 1
      const drawOrder = record.index === 1
        ? [0, 1, 2].sort((a, b) => fishPoses[a].progress - fishPoses[b].progress) : [0]
      for (const entity of drawOrder) {
        const pose = record.index === 1 ? fishPoses[entity] : { x: 0, y: 0, turn: 0, progress: entranceProgress }
        const head = record.index === 1 ? FISH_HEADS[entity] : record.index === 0 ? [.90, .20] : [.61, .30]
        gl.uniform1f(uniforms.entity, record.index === 1 ? entity : -1)
        gl.uniform1f(uniforms.turn, pose.turn * Math.PI / 180)
        gl.uniform1f(uniforms.progress, pose.progress)
        gl.uniform2f(uniforms.offset, pose.x, pose.y)
        gl.uniform2f(uniforms.head, head[0], head[1])
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0)
      }
      if (gl.isContextLost()) throw new Error('Context lost')
      if (canvas.parentElement !== record.host) record.host.append(canvas)
      records.forEach(source => { if (source !== record) source.host.classList.remove('is-swimming') })
      record.host.classList.add('is-swimming')
      paintedIndex = record.index
      paintedFrames++
      needsDraw = false
      canvas.dataset.swimTime = elapsed.toFixed(4)
      canvas.dataset.swimFrame = String(paintedFrames)
      canvas.dataset.swimProgress = entranceProgress.toFixed(4)
      canvas.dataset.swimDrawPasses = String(passes)
      canvas.dataset.swimFishOrder = drawOrder.join(',')
      canvas.dataset.swimFishCount = String(record.parts?.length || 0)
      canvas.dataset.swimFishPoses = JSON.stringify(fishPoses.map(pose => ({
        x: +pose.x.toFixed(3), y: +pose.y.toFixed(3), turn: +pose.turn.toFixed(3), progress: +pose.progress.toFixed(4),
      })))
      if (record.parts) canvas.dataset.swimFishBounds = JSON.stringify(record.parts)
      record.host.dataset.swimTime = elapsed.toFixed(4)
      record.host.dataset.swimFrame = String(paintedFrames)
      return true
    } catch {
      fallback()
      return false
    }
  }
  function tick(now) {
    frame = 0
    if (!canRun()) { reconcile(); return }
    if (lastTick) elapsed += Math.min(.08, (now - lastTick) / 1000)
    lastTick = now
    if (!lastPaint || now - lastPaint >= FRAME_MS - .5) {
      paint()
      lastPaint = lastPaint ? Math.max(lastPaint + FRAME_MS, now - FRAME_MS * .5) : now
    }
    if (canRun()) frame = requestAnimationFrame(tick)
    else reconcile()
  }
  function reconcile() {
    if (disposed) return
    if (!enabled || failed) {
      stopFrame()
      revealOriginals()
    } else {
      const record = activeRecord()
      if (record?.ready && (paintedIndex !== activeIndex || needsDraw && !canRun())) paint()
      if (canRun()) {
        if (!frame) frame = requestAnimationFrame(tick)
      } else stopFrame()
    }
    publish()
  }
  function refresh() {
    if (disposed) return
    // All DOM geometry reads stay here; scroll/idle updates use these cached boxes.
    for (const record of records) {
      const imageWidth = record.image.offsetWidth, imageHeight = record.image.offsetHeight
      record.cropBounds = null
      record.box = imageWidth > 0 && imageHeight > 0 ? {
        imageLeft: record.image.offsetLeft, imageTop: record.image.offsetTop,
        imageWidth, imageHeight, width: imageWidth, height: imageHeight,
      } : null
    }
    needsDraw = true
    reconcile()
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    lost = true
    fallback()
  }, { signal })
  records.forEach(record => {
    record.image.addEventListener('load', () => { record.decoded = false; load(record) }, { signal })
    record.image.addEventListener('error', () => {
      record.failed = true
      record.ready = false
      if (record.index === activeIndex) {
        record.host.classList.remove('is-swimming')
        canvas.remove()
        paintedIndex = -1
      }
      reconcile()
    }, { signal })
    load(record)
  })
  refresh()
  return {
    setEntrance(value = {}) {
      if (disposed) return
      const numeric = input => Number.isFinite(Number(input)) ? Number(input) : 0
      const progressOf = input => Math.max(-1, Math.min(1, numeric(input)))
      let changed = false
      if (value.progress !== undefined) {
        const next = progressOf(value.progress)
        changed = next !== entranceProgress
        if (next < entranceProgress) records.forEach(record => { record.cropBounds = null })
        entranceProgress = next
      }
      if (Array.isArray(value.fish)) value.fish.slice(0, 3).forEach((pose, index) => {
        const next = {
          x: numeric(pose.x), y: numeric(pose.y), turn: numeric(pose.turn),
          progress: pose.progress === undefined ? entranceProgress : progressOf(pose.progress),
        }
        if (Object.keys(next).some(key => next[key] !== fishPoses[index][key])) changed = true
        fishPoses[index] = next
      })
      if (!changed) return
      needsDraw = true
      // The existing draw clock consumes the latest entrance state; GSAP can
      // update this at 60Hz without bypassing the 24fps rendering budget.
      if (canRun() && !frame) frame = requestAnimationFrame(tick)
    },
    setActive(index) {
      if (disposed) return
      const value = Number(index)
      const next = records.some(record => record.index === value) ? value : -1
      if (activeIndex !== next) {
        activeRecord()?.host.classList.remove('is-swimming')
        canvas.remove()
        activeIndex = next
        if (activeRecord()) activeRecord().cropBounds = null
        paintedIndex = -1
        needsDraw = true
      }
      reconcile()
    },
    setRunning(value) {
      if (disposed) return
      running = Boolean(value)
      if (running && enabled) records.forEach(record => { if (record.decoded) upload(record); else load(record) })
      reconcile()
    },
    setEnabled(value) {
      if (disposed) return
      enabled = Boolean(value)
      if (enabled) records.forEach(record => { if (record.decoded) upload(record); else load(record) })
      reconcile()
    },
    refresh,
    get ready() { return ready() },
    destroy() {
      if (disposed) return
      disposed = true
      controller.abort()
      stopFrame()
      canvas.remove()
      for (const record of records) {
        record.host.classList.toggle('is-swimming', record.originalClass)
        for (const [key, value] of record.originalData) {
          if (value === undefined) delete record.host.dataset[key]
          else record.host.dataset[key] = value
        }
      }
      if (gl && !lost) {
        records.forEach(record => {
          if (record.texture) gl.deleteTexture(record.texture)
          if (record.ownerTexture) gl.deleteTexture(record.ownerTexture)
        })
        if (vertexBuffer) gl.deleteBuffer(vertexBuffer)
        if (indexBuffer) gl.deleteBuffer(indexBuffer)
        if (program) gl.deleteProgram(program)
        shaders.forEach(shader => gl.deleteShader(shader))
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
      records.forEach(record => { record.texture = null; record.ownerTexture = null; record.ownerData = null })
      gl = null
    },
  }
}
