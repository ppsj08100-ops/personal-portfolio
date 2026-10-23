// The current bends only the painted coral fronds. Rocks, shells, the seabed,
// tool bubbles, and text stay in their original coordinate system.
const vertexSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = vec2(a_position.x, 1.0 - a_position.y);
    gl_Position = vec4(a_position * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform sampler2D u_art;
  uniform float u_part;
  uniform float u_time;
  varying vec2 v_uv;

  float oval(vec2 point, vec2 center, vec2 radius) {
    return 1.0 - smoothstep(0.68, 1.0, length((point - center) / radius));
  }

  float frond(vec2 point, vec2 center, vec2 radius, float rootTop, float rootBottom) {
    return oval(point, center, radius) * (1.0 - smoothstep(rootTop, rootBottom, point.y));
  }

  float anchoredRock(vec2 point, vec2 center, vec2 radius) {
    return 1.0 - smoothstep(0.9, 1.08, length((point - center) / radius));
  }

  void main() {
    // The same full-atlas UV and clock are used in all three crops. The
    // current therefore has no seam when the crops form a single reef.
    vec2 uv = vec2((u_part + v_uv.x) / 3.0, v_uv.y);
    float coral = 0.0;
    coral = max(coral, frond(uv, vec2(0.272, 0.185), vec2(0.132, 0.205), 0.265, 0.365));
    coral = max(coral, frond(uv, vec2(0.397, 0.385), vec2(0.102, 0.175), 0.465, 0.560) * 0.8);
    coral = max(coral, frond(uv, vec2(0.833, 0.580), vec2(0.194, 0.264), 0.720, 0.845));
    coral = max(coral, frond(uv, vec2(0.154, 0.430), vec2(0.058, 0.171), 0.480, 0.590) * 0.8);
    coral = max(coral, frond(uv, vec2(0.107, 0.553), vec2(0.068, 0.142), 0.620, 0.705) * 0.6);
    coral = max(coral, frond(uv, vec2(0.490, 0.585), vec2(0.079, 0.152), 0.650, 0.745) * 0.7);
    coral = max(coral, frond(uv, vec2(0.602, 0.721), vec2(0.089, 0.130), 0.775, 0.850) * 0.55);
    coral = max(coral, frond(uv, vec2(0.144, 0.762), vec2(0.092, 0.164), 0.825, 0.905) * 0.5);
    coral = max(coral, frond(uv, vec2(0.329, 0.671), vec2(0.082, 0.154), 0.745, 0.825) * 0.5);
    coral = max(coral, frond(uv, vec2(0.442, 0.789), vec2(0.078, 0.118), 0.835, 0.905) * 0.45);
    coral = max(coral, frond(uv, vec2(0.713, 0.748), vec2(0.082, 0.156), 0.810, 0.900) * 0.65);
    coral = max(coral, frond(uv, vec2(0.857, 0.803), vec2(0.091, 0.129), 0.845, 0.925) * 0.55);

    // Fixed boulder silhouettes cut holes out of the soft coral mask. These
    // are spatial masks, never a contrast or alpha threshold on fine lines.
    float rocks = 0.0;
    rocks = max(rocks, anchoredRock(uv, vec2(0.256, 0.360), vec2(0.046, 0.057)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.277, 0.435), vec2(0.077, 0.095)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.172, 0.522), vec2(0.075, 0.080)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.182, 0.650), vec2(0.105, 0.090)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.302, 0.686), vec2(0.084, 0.088)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.370, 0.619), vec2(0.073, 0.070)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.459, 0.693), vec2(0.075, 0.064)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.508, 0.776), vec2(0.076, 0.064)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.574, 0.858), vec2(0.086, 0.071)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.647, 0.837), vec2(0.067, 0.065)));
    rocks = max(rocks, anchoredRock(uv, vec2(0.704, 0.863), vec2(0.067, 0.060)));
    float weight = coral * (1.0 - rocks) * (1.0 - smoothstep(0.875, 0.925, uv.y));

    // Two slow, non-repeating-in-lockstep currents bend the tips, rather
    // than translating the illustration or making it wobble as one object.
    float flow = sin(u_time * 0.47 + uv.x * 4.8 + uv.y * 1.9)
      + 0.28 * sin(u_time * 0.29 - uv.y * 6.0 + uv.x * 2.4);
    vec2 current = vec2(flow * 0.0032, cos(u_time * 0.33 + uv.x * 3.0) * 0.00042) * weight;
    vec2 sampleUv = uv - current;
    if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) {
      gl_FragColor = vec4(0.0);
    } else {
      gl_FragColor = texture2D(u_art, sampleUv);
    }
  }
`;

function shader(gl, type, source) {
  const compiled = gl.createShader(type);
  if (!compiled) throw new Error('Coral shader unavailable');
  gl.shaderSource(compiled, source);
  gl.compileShader(compiled);
  if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) {
    gl.deleteShader(compiled);
    throw new Error('Coral shader compilation failed');
  }
  return compiled;
}

function painter(image, art, part) {
  const canvas = document.createElement('canvas');
  canvas.className = 'skill-reef__coral-current';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, powerPreference: 'low-power',
  });
  if (!gl) return null;

  let vertex;
  let fragment;
  let program;
  let buffer;
  let texture;
  try {
    vertex = shader(gl, gl.VERTEX_SHADER, vertexSource);
    fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('Coral program unavailable');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Coral program linking failed');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, 'u_art'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_part'), part);
  } catch {
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }

  const timeUniform = gl.getUniformLocation(program, 'u_time');
  let available = true;
  let ready = false;
  const lost = (event) => {
    event.preventDefault();
    available = false;
    ready = false;
    art.classList.remove('is-coral-current-ready');
    canvas.hidden = true;
  };
  canvas.addEventListener('webglcontextlost', lost);
  art.append(canvas);

  return {
    image,
    art,
    canvas,
    visible: false,
    measure() {
      const width = art.clientWidth;
      const height = width * 3 * image.naturalHeight / image.naturalWidth;
      const resolution = Math.min(window.devicePixelRatio || 1, 1.5);
      const targetWidth = Math.max(1, Math.round(width * resolution));
      const targetHeight = Math.max(1, Math.round(height * resolution));
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ready = false;
      }
      canvas.style.height = `${height}px`;
      canvas.style.filter = getComputedStyle(image).filter;
    },
    draw(time) {
      if (!available) return false;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      ready = true;
      return true;
    },
    reveal(visible) {
      canvas.hidden = !visible || !available || !ready;
      art.classList.toggle('is-coral-current-ready', visible && available && ready);
    },
    destroy() {
      art.classList.remove('is-coral-current-ready');
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.remove();
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}

export function initSkillsCoralCurrent(scene) {
  if (!scene) return () => {};
  const images = [...scene.querySelectorAll('.skill-reef__art > img')];
  if (!images.length) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const previousState = scene.getAttribute('data-coral-current');
  const painters = [];
  const pendingLoads = [];
  const arts = images.map((image) => image.parentElement);
  const visibleArts = new Map(arts.map((art) => {
    const rect = art.getBoundingClientRect();
    return [art, rect.bottom > -160 && rect.top < window.innerHeight + 160
      && rect.right > 0 && rect.left < window.innerWidth];
  }));
  let disposed = false;
  let inView = false;
  let request = 0;
  let lastDraw = 0;
  let lastTick = 0;
  let elapsed = 0;
  const canRun = () => !disposed && inView && !document.hidden && !reduced.matches
    && painters.some((item) => item.visible);

  function draw(time) {
    request = 0;
    if (!canRun()) return;
    if (!lastTick) lastTick = time;
    elapsed += Math.min((time - lastTick) / 1000, 0.1);
    lastTick = time;
    if (time - lastDraw >= 1000 / 30) {
      painters.forEach((item) => {
        if (item.visible) item.draw(elapsed);
      });
      lastDraw = time;
    }
    request = requestAnimationFrame(draw);
  }

  function sync() {
    if (disposed) return;
    // An entering crop is painted at the shared clock before it replaces its
    // original image. Distant crops remain static instead of consuming GPU.
    const running = canRun();
    if (running) painters.forEach((item) => {
      if (item.visible) item.draw(elapsed);
    });
    painters.forEach((item) => item.reveal(!reduced.matches));
    if (running) {
      scene.dataset.coralCurrent = 'active';
      if (!request) {
        lastTick = 0;
        request = requestAnimationFrame(draw);
      }
    } else {
      if (request) cancelAnimationFrame(request);
      request = 0;
      lastTick = 0;
      scene.dataset.coralCurrent = reduced.matches ? 'reduced' : painters.length ? 'paused' : 'fallback';
    }
  }

  function prepare(image, index) {
    if (disposed || image.dataset.coralCurrentPrepared || !image.naturalWidth) return;
    image.dataset.coralCurrentPrepared = 'true';
    const art = image.parentElement;
    const part = Number.parseFloat(getComputedStyle(art).getPropertyValue('--reef-part'));
    const item = painter(image, art, Number.isFinite(part) ? part : index);
    if (!item) return;
    item.visible = visibleArts.get(art) || false;
    painters.push(item);
    item.measure();
    sync();
  }

  images.forEach((image, index) => {
    if (image.complete && image.naturalWidth) prepare(image, index);
    else {
      const loaded = () => prepare(image, index);
      image.addEventListener('load', loaded, { once: true });
      pendingLoads.push([image, loaded]);
    }
  });

  const observer = new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    sync();
  }, { rootMargin: '160px 0px' });
  observer.observe(scene);

  const artObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visibleArts.set(entry.target, entry.isIntersecting);
      painters.forEach((item) => {
        if (item.art === entry.target) item.visible = entry.isIntersecting;
      });
    });
    sync();
  }, { rootMargin: '160px 0px' });
  arts.forEach((art) => artObserver.observe(art));

  const resize = new ResizeObserver(() => {
    painters.forEach((item) => {
      item.measure();
    });
    sync();
  });
  images.forEach((image) => resize.observe(image.parentElement));
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();

  return () => {
    disposed = true;
    if (request) cancelAnimationFrame(request);
    observer.disconnect();
    artObserver.disconnect();
    resize.disconnect();
    reduced.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    pendingLoads.forEach(([image, loaded]) => image.removeEventListener('load', loaded));
    painters.forEach((item) => item.destroy());
    images.forEach((image) => delete image.dataset.coralCurrentPrepared);
    if (previousState === null) scene.removeAttribute('data-coral-current');
    else scene.setAttribute('data-coral-current', previousState);
  };
}
