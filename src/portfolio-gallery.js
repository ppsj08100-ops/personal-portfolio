import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Geometry and input rates measured in the public reference's desktop carousel.
const panelWidth = 2.31
const panelHeight = panelWidth * 1.22
const labelHeight = panelWidth * .17
const referenceRadius = panelWidth * 8 / (Math.PI * 2)

function curvedPlane(width, height, depth, columns = 15, rows = 15) {
  const geometry = new THREE.PlaneGeometry(width, height, columns, rows)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) / (width / 2)
    position.setZ(i, -depth * (1 - u * u))
  }
  geometry.userData.rest = new Float32Array(position.array)
  return geometry
}

function roundedMask() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const context = canvas.getContext('2d')
  context.fillStyle = '#000'
  context.fillRect(0, 0, 512, 512)
  context.fillStyle = '#fff'
  context.beginPath()
  context.roundRect(0, 0, 512, 512, 20)
  context.fill()
  return new THREE.CanvasTexture(canvas)
}

function captionTexture(text, align, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 1440
  canvas.height = 200
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  const draw = () => {
    context.clearRect(0, 0, 1440, 200)
    context.font = '400 35px "Hero Roboto", Arial, sans-serif'
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = align
    context.fillText(text, align === 'right' ? 1440 : 0, 100)
    texture.needsUpdate = true
  }
  texture.userData.redraw = draw
  draw()
  return texture
}

function fitPanelTexture(texture, width, height, project) {
  const imageAspect = width / height
  const panelAspect = panelWidth / panelHeight
  if (imageAspect > panelAspect) {
    texture.repeat.x = panelAspect / imageAspect
    texture.offset.x = (1 - texture.repeat.x) * project.focusX
  } else {
    texture.repeat.y = imageAspect / panelAspect
    texture.offset.y = (1 - texture.repeat.y) * (1 - project.focusY)
  }
}

export function initPortfolioGallery(section) {
  const gallery = section?.querySelector('.portfolio__gallery')
  if (!gallery) return () => {}
  const heading = section.querySelector('.portfolio__heading')
  const lines = [...heading.querySelectorAll('.portfolio__title-line')]
  const surface = gallery.querySelector('.portfolio__canvas')
  const list = gallery.querySelector('.portfolio__projects')
  const items = [...list.children]
  const projects = items.map(item => ({
    name: item.querySelector('figcaption span:first-child').textContent,
    year: item.querySelector('figcaption span:last-child').textContent,
    image: item.dataset.image,
    video: item.querySelector('video'),
    focusX: Number(item.dataset.focusX ?? .5),
    focusY: Number(item.dataset.focusY ?? .5),
  }))
  const angleStep = Math.PI * 2 / projects.length
  const previous = gallery.querySelector('[data-gallery-previous]')
  const next = gallery.querySelector('[data-gallery-next]')
  const pauseButton = gallery.querySelector('[data-gallery-pause]')
  const status = gallery.querySelector('[data-gallery-status]')
  const controller = new AbortController()
  const { signal } = controller
  const media = gsap.matchMedia()
  const fallbackStep = direction => list.scrollBy({ left: direction * (items[0].getBoundingClientRect().width + 20), behavior: 'smooth' })
  let step = fallbackStep
  let togglePause = () => {}
  let disposed = false
  const clamp = value => Math.min(1, Math.max(0, value))
  const easeOpen = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
  const revealListeners = new Set()
  const readReveal = () => section.classList.contains('is-unfolding')
    ? clamp(Number.parseFloat(getComputedStyle(section).getPropertyValue('--portfolio-open')) || 0)
    : 1
  let revealProgress = readReveal()
  function syncReveal(event) {
    const previous = revealProgress
    revealProgress = section.classList.contains('is-unfolding')
      ? clamp(Number.isFinite(event?.detail?.progress) ? event.detail.progress : readReveal())
      : 1
    revealListeners.forEach(listener => listener(revealProgress, previous))
  }
  section.addEventListener('portfolio:reveal', syncReveal, { signal })
  const canExplore = () => !section.classList.contains('is-unfolding') || revealProgress >= .985
  function emitPhotoEdges(points) {
    section.dispatchEvent(new CustomEvent('portfolio:photo-edges', { bubbles: true, detail: { points } }))
  }
  function emitPhotoFrame(rect, radius = 0, restRect = rect, anchorRect = rect) {
    section.dispatchEvent(new CustomEvent('portfolio:photo-frame', {
      bubbles: true,
      detail: { rect, restRect, anchorRect, radius, image: projects[0].image, focusX: projects[0].focusX, focusY: projects[0].focusY },
    }))
  }
  const visibleEdgePoint = point => Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 0 && point.x <= innerWidth && point.y >= 0 && point.y <= innerHeight
  function requestExplore() {
    if (canExplore()) return true
    section.dispatchEvent(new CustomEvent('portfolio:open-request', { bubbles: true }))
    return false
  }
  const playback = new WeakMap()
  function playVideo(video, playing) {
    if (playback.get(video) === playing && (playing || video.paused)) return
    playback.set(video, playing)
    video.muted = video.defaultMuted = true
    if (playing) video.play().catch(() => {}) // Keep the poster if autoplay is unavailable.
    else video.pause()
  }

  // Keep the display font's proportions; only shrink a line if it cannot fit.
  function fitHeading() {
    lines.forEach(line => {
      const scale = Math.min(1, heading.clientWidth / line.offsetWidth)
      line.style.transform = scale < 1 ? `scaleX(${scale})` : ''
    })
  }
  const resize = new ResizeObserver(fitHeading)
  resize.observe(heading)
  document.fonts.ready.then(() => { if (!disposed) fitHeading() })
  fitHeading()

  projects.forEach((project, i) => {
    const placeholder = items[i].querySelector('.portfolio__placeholder')
    placeholder.style.setProperty('--photo-focus', `${project.focusX * 100}% ${project.focusY * 100}%`)
    if (project.image && !placeholder.querySelector('img')) placeholder.style.backgroundImage = `url(${JSON.stringify(project.image)})`
  })

  media.add('(prefers-reduced-motion: no-preference)', () => {
    if (section.classList.contains('is-unfolding')) return
    gsap.fromTo(heading.querySelectorAll('.portfolio__word'), {
      opacity: 0, filter: 'blur(.8vw)', scale: .95,
    }, {
      opacity: 1, filter: 'blur(0px)', scale: 1,
      duration: 1.8, ease: 'power1.inOut', stagger: { amount: .4 },
      scrollTrigger: { id: 'portfolio-heading', trigger: heading, start: 'top 85%', once: true },
    })
    gsap.fromTo(gallery, { opacity: 0 }, {
      opacity: 1, delay: .5, duration: 1.6,
      scrollTrigger: { id: 'portfolio-gallery-entry', trigger: gallery, start: 'top 85%', once: true },
    })
  })

  media.add({ desktop: '(min-width: 992px)', motion: '(prefers-reduced-motion: no-preference)' }, context => {
    if (!context.conditions.desktop || !context.conditions.motion) return
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return // The same projects remain in the horizontal HTML gallery.
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    surface.append(renderer.domElement)
    gallery.classList.add('is-webgl')
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(37, 1000 / 600, .1, 1000)
    const group = new THREE.Group()
    scene.add(group)
    const radius = panelWidth * projects.length / (Math.PI * 2)
    // Keep the original large photographs at a constant distance throughout entry.
    group.position.z = radius - referenceRadius - 3
    const restingDepth = group.position.z
    const mask = roundedMask()
    const textures = [mask]
    const color = getComputedStyle(section).color
    const point = new THREE.Vector3()
    const loader = new THREE.TextureLoader()
    const videoPanels = []
    const videoEvents = new AbortController()
    let alive = true
    projects.forEach((project, index) => {
      const material = new THREE.MeshBasicMaterial({ color: '#888888', alphaMap: mask, alphaTest: .01, transparent: true, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(curvedPlane(panelWidth, panelHeight, .2), material)
      mesh.name = project.name
      const angle = index * angleStep
      mesh.position.set(radius * Math.sin(angle), 0, radius * Math.cos(angle))
      mesh.lookAt(0, 0, 0)
      mesh.userData.ringPosition = mesh.position.clone()
      mesh.userData.ringQuaternion = mesh.quaternion.clone()
      mesh.userData.index = index
      group.add(mesh)
      let showingVideo = false
      if (project.video) {
        const video = project.video
        const showVideo = () => {
          if (!alive || showingVideo) return
          const texture = new THREE.VideoTexture(video)
          texture.colorSpace = THREE.SRGBColorSpace
          fitPanelTexture(texture, video.videoWidth, video.videoHeight, project)
          textures.push(texture)
          material.map = texture
          material.color.set('#fff')
          material.needsUpdate = true
          showingVideo = true
        }
        video.addEventListener('loadeddata', showVideo, { signal: videoEvents.signal })
        if (video.readyState >= video.HAVE_CURRENT_DATA) showVideo()
        videoPanels.push({ video, index })
      }
      for (const [text, align, x] of [[project.name, 'left', .01], [project.year, 'right', -.01]]) {
        const texture = captionTexture(text, align, color)
        textures.push(texture)
        const caption = new THREE.Mesh(curvedPlane(panelWidth, labelHeight, panelWidth * .066, 8, 3), new THREE.MeshBasicMaterial({ map: texture, transparent: true }))
        caption.userData.isCaption = true
        caption.position.set(x, -panelHeight / 2 - labelHeight / 4, -.05)
        mesh.add(caption)
      }
      // A video starts with the same poster on both renderers.
      if (project.image) loader.load(project.image, texture => {
        if (!alive) { texture.dispose(); return }
        texture.colorSpace = THREE.SRGBColorSpace
        const image = texture.image
        const scale = Math.min(1, 1536 / Math.max(image.width, image.height))
        if (scale < 1) {
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(image.width * scale)
          canvas.height = Math.round(image.height * scale)
          const context = canvas.getContext('2d')
          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          texture.image = canvas
        }
        // Fit real project captures to the existing portrait panels by cropping,
        // keeping their pixels in proportion just like the HTML cover fallback.
        fitPanelTexture(texture, texture.image.width, texture.image.height, project)
        textures.push(texture)
        if (!showingVideo) {
          material.map = texture
          material.color.set('#fff')
          material.needsUpdate = true
        }
        texture.needsUpdate = true
      }, undefined, () => {})
    })
    document.fonts.ready.then(() => {
      if (alive) textures.forEach(texture => texture.userData.redraw?.())
    })
    const cursor = document.createElement('div')
    cursor.className = 'portfolio__drag-cursor'
    cursor.setAttribute('aria-hidden', 'true')
    cursor.innerHTML = '<svg viewBox="0 0 8 12"><path d="m6 1-5 5 5 5"/></svg><span>DRAG</span><svg viewBox="0 0 8 12"><path d="m2 1 5 5-5 5"/></svg>'
    document.body.append(cursor)
    const events = new AbortController()
    let dragging = false, previousX = 0, dragVelocity = 0
    let targetRotation = Math.PI, speed = .001, wave = 0, waveTime = 0
    group.rotation.y = targetRotation
    let paused = section.classList.contains('is-unfolding') && section.classList.contains('is-darkroom')
    let videoPaused = false, visible = false, frame, lastTime = 0
    pauseButton.setAttribute('aria-pressed', String(paused))
    pauseButton.setAttribute('aria-label', paused ? '사진 자동 넘김 재생' : '사진 자동 넘김 일시정지')
    let entryRotation = Math.PI, alignedRotation = Math.PI, activePointer
    let pointerX = 0, pointerY = 0, cursorX = 0, cursorY = 0
    const edgeVector = new THREE.Vector3()
    const centerVector = new THREE.Vector3()
    const anchorRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
    const anchorScale = new THREE.Vector3(1, 1, 1)
    const anchorGroupMatrix = new THREE.Matrix4()
    const anchorMeshMatrix = new THREE.Matrix4()
    const anchorWorldMatrix = new THREE.Matrix4()
    function publishPhotoFrame() {
      if (disposed) { emitPhotoFrame(null); return }
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) { emitPhotoFrame(null); return }
      group.updateMatrixWorld(true)
      camera.updateMatrixWorld()
      const mesh = group.children[0]
      const position = mesh.geometry.attributes.position
      const rest = mesh.geometry.userData.rest
      const bounds = (matrix, unwarped = false) => {
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
        for (let index = 0; index < position.count; index++) {
          if (unwarped) edgeVector.fromArray(rest, index * 3)
          else edgeVector.fromBufferAttribute(position, index)
          edgeVector.applyMatrix4(matrix).project(camera)
          const x = rect.left + (edgeVector.x * .5 + .5) * rect.width
          const y = rect.top + (.5 - edgeVector.y * .5) * rect.height
          left = Math.min(left, x); right = Math.max(right, x)
          top = Math.min(top, y); bottom = Math.max(bottom, y)
        }
        return { x: left, y: top, width: right - left, height: bottom - top }
      }
      // Layout follows a centered, still photograph. Carousel navigation and
      // drag waves must never move the entire gallery's vertical anchor.
      anchorGroupMatrix.compose(group.position, anchorRotation, group.scale)
      if (group.parent) anchorGroupMatrix.premultiply(group.parent.matrixWorld)
      anchorMeshMatrix.compose(mesh.userData.ringPosition, mesh.userData.ringQuaternion, anchorScale)
      anchorWorldMatrix.multiplyMatrices(anchorGroupMatrix, anchorMeshMatrix)
      const anchorRect = bounds(anchorWorldMatrix, true)
      centerVector.setFromMatrixPosition(mesh.matrixWorld).project(camera)
      if (centerVector.z < -1 || centerVector.z > 1) {
        emitPhotoFrame(null, 0, null, anchorRect)
        return
      }
      const frame = bounds(mesh.matrixWorld)
      const resting = mesh.matrixWorld.clone()
      resting.elements[14] += restingDepth - group.position.z
      emitPhotoFrame(frame, Math.min(frame.width, frame.height) * 20 / 512, bounds(resting), anchorRect)
    }
    function publishPhotoEdges() {
      if (disposed || canExplore()) { emitPhotoEdges([]); return }
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) { emitPhotoEdges([]); return }
      group.updateMatrixWorld(true)
      camera.updateMatrixWorld()
      const project = (mesh, index) => {
        edgeVector.fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld).project(camera)
        return { x: rect.left + (edgeVector.x * .5 + .5) * rect.width, y: rect.top + (.5 - edgeVector.y * .5) * rect.height, z: edgeVector.z }
      }
      const photos = group.children.filter(mesh => mesh.visible && mesh.material.opacity > .01 && mesh.scale.x > .4).map(mesh => {
        const columns = mesh.geometry.parameters.widthSegments + 1
        const rows = mesh.geometry.parameters.heightSegments + 1
        const corners = [0, columns - 1, (rows - 1) * columns, rows * columns - 1].map(index => project(mesh, index))
        const bounds = {
          left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
          top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)),
        }
        centerVector.setFromMatrixPosition(mesh.matrixWorld)
        const depth = centerVector.z
        centerVector.project(camera)
        return { mesh, columns, depth, bounds, z: centerVector.z }
      }).filter(({ bounds: b, z }) => z >= -1 && z <= 1
        && Math.min(b.right, innerWidth) - Math.max(b.left, 0) > 80
        && Math.min(b.bottom, innerHeight) - Math.max(b.top, 0) > 60)
        .sort((a, b) => b.depth - a.depth).slice(0, revealProgress > .55 ? 3 : 1)
      const edges = photos.map(({ mesh, columns }) => {
        const last = columns - 1
        const samples = [[.16, 0], [.36, 0], [.64, 0], [.84, 0], [0, .2], [1, .2]]
        return samples.map(([u, v]) => {
          const point = project(mesh, Math.round(v * last) * columns + Math.round(u * last))
          const center = mesh.getWorldPosition(centerVector).project(camera)
          const cx = rect.left + (center.x * .5 + .5) * rect.width
          const cy = rect.top + (.5 - center.y * .5) * rect.height
          const distance = Math.hypot(cx - point.x, cy - point.y) || 1
          return { x: point.x + (cx - point.x) / distance * 1.5, y: point.y + (cy - point.y) / distance * 1.5 }
        })
      })
      emitPhotoEdges(Array.from({ length: 6 }, (_, index) => edges.map(points => points[index])).flat().filter(visibleEdgePoint))
    }
    function holdEntryRotation() {
      if (!canExplore()) {
        group.rotation.y = THREE.MathUtils.lerp(entryRotation, alignedRotation, easeOpen((1 - revealProgress) / .3))
        targetRotation = group.rotation.y
      }
    }
    function revealPhotos() {
      holdEntryRotation()
      // Photos enter at their original full size; scroll never dollies the ring
      // or shifts flanking photographs toward the camera.
      group.position.z = restingDepth
      for (const mesh of group.children) {
        const index = mesh.userData.index
        const near = index === 0 || index === 1 || index === projects.length - 1
        mesh.position.copy(mesh.userData.ringPosition)
        mesh.quaternion.copy(mesh.userData.ringQuaternion)
        mesh.scale.setScalar(1)
        // Keep a nearby center and two flanking prints. The other photographs
        // join only when the original carousel is ready to be explored.
        mesh.material.opacity = 1
        mesh.visible = canExplore() || near
        mesh.children.forEach(child => {
          if (child.userData.isCaption) child.material.opacity = easeOpen((revealProgress - .92) / .08)
        })
      }
    }
    function syncVideos() {
      videoPanels.forEach(({ video, index }) => {
        const angle = index * angleStep + group.rotation.y
        playVideo(video, canExplore() && visible && !document.hidden && !videoPaused && Math.cos(angle) < -.65)
      })
    }
    const revealChanged = (open, previous) => {
      if (open < .985 && previous >= .985) {
        entryRotation = group.rotation.y
        alignedRotation = entryRotation + Math.atan2(Math.sin(Math.PI - entryRotation), Math.cos(Math.PI - entryRotation))
        targetRotation = entryRotation
        dragging = false
        dragVelocity = 0
        if (activePointer != null && gallery.hasPointerCapture(activePointer)) gallery.releasePointerCapture(activePointer)
        cursor.classList.remove('is-visible')
      }
      revealPhotos()
      publishPhotoFrame()
      publishPhotoEdges()
      syncVideos()
      if (visible) renderer.render(scene, camera)
    }
    revealListeners.add(revealChanged)
    revealPhotos()
    section.addEventListener('portfolio:photo-frame-request', publishPhotoFrame, { signal: events.signal })
    document.addEventListener('visibilitychange', syncVisibility, { signal: events.signal })
    window.addEventListener('scroll', syncVisibility, { passive: true, signal: events.signal })
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
    function size() {
      const width = gallery.clientWidth
      const height = surface.clientHeight || width * .6
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      revealPhotos()
      publishPhotoFrame()
      publishPhotoEdges()
      syncVisibility()
    }
    const dimensions = new ResizeObserver(size)
    dimensions.observe(gallery)
    size()
    function syncVisibility() {
      const rect = renderer.domElement.getBoundingClientRect()
      const wasVisible = visible
      // Pinning can move the canvas independently of the gallery's bounds.
      visible = rect.width > 0 && rect.height > 0 && rect.top < innerHeight + 100 && rect.bottom > -100
      if (!visible) cursor.classList.remove('is-visible')
      syncVideos()
      if (visible && !wasVisible && !document.hidden) renderer.render(scene, camera)
    }
    const visibility = new IntersectionObserver(syncVisibility, { rootMargin: '100px' })
    visibility.observe(gallery)
    function waveGeometry(delta) {
      wave += (Math.abs(dragVelocity) * .1 - wave) * (1 - Math.pow(.8, delta))
      if (wave > .00001) waveTime += .004 * delta
      group.updateMatrixWorld(true)
      for (const mesh of group.children) {
        for (const plane of [mesh, ...mesh.children]) {
          const position = plane.geometry.attributes.position
          const rest = plane.geometry.userData.rest
          for (let i = 0; i < position.count; i++) {
            const x = rest[i * 3], y = rest[i * 3 + 1]
            point.set(x, y, 0).applyMatrix4(mesh.matrixWorld)
            const falloff = Math.max(0, 1 - ((point.x + referenceRadius) / 5) ** 2)
            const displacement = wave * 2 * (Math.sin(point.x * 2 + waveTime) + Math.sin(point.x * 1.3 + point.y * .8 + waveTime * 1.2)) * falloff
            position.setY(i, y + displacement)
          }
          position.needsUpdate = true
        }
      }
    }
    function animate(time) {
      frame = requestAnimationFrame(animate)
      const delta = lastTime ? Math.min((time - lastTime) / (1000 / 60), 3) : 1
      lastTime = time
      if (!visible || document.hidden) return
      if (!canExplore()) {
        holdEntryRotation()
      } else if (!dragging) {
        if (!paused) targetRotation -= speed * delta
        dragVelocity *= Math.pow(.95, delta)
      }
      group.rotation.y += (targetRotation - group.rotation.y) * (1 - Math.pow(.9, delta))
      syncVideos()
      waveGeometry(delta)
      renderer.render(scene, camera)
      cursorX += (pointerX - cursorX) * (1 - Math.pow(.95, delta))
      cursorY += (pointerY - cursorY) * (1 - Math.pow(.95, delta))
      cursor.style.transform = `translate3d(${cursorX}px,${cursorY}px,0) translate(-50%,-50%)`
    }
    frame = requestAnimationFrame(animate)
    function enter(event) {
      pointerX = cursorX = event.clientX
      pointerY = cursorY = event.clientY
      if (canExplore() && finePointer.matches) cursor.classList.add('is-visible')
    }
    function move(event) {
      pointerX = event.clientX
      pointerY = event.clientY
      if (!dragging || !canExplore()) return
      const distance = event.clientX - previousX
      previousX = event.clientX
      dragVelocity = distance * .01
      targetRotation += distance * .002
    }
    function release(event) {
      if (dragging && event?.pointerId != null && gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId)
      dragging = false
      activePointer = undefined
      speed = .002
    }
    gallery.addEventListener('pointerenter', enter, { signal: events.signal })
    gallery.addEventListener('pointermove', move, { signal: events.signal })
    gallery.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return
      if (!requestExplore()) return
      dragging = true
      activePointer = event.pointerId
      previousX = event.clientX
      speed = 0
      gallery.setPointerCapture(event.pointerId)
      gallery.focus({ preventScroll: true })
    }, { signal: events.signal })
    gallery.addEventListener('pointerup', release, { signal: events.signal })
    gallery.addEventListener('pointercancel', release, { signal: events.signal })
    gallery.addEventListener('lostpointercapture', () => { dragging = false }, { signal: events.signal })
    gallery.addEventListener('pointerleave', event => {
      cursor.classList.remove('is-visible')
      if (!gallery.hasPointerCapture(event.pointerId)) release(event)
    }, { signal: events.signal })
    step = direction => {
      targetRotation -= direction * angleStep
      dragVelocity = 0
      paused = true
      pauseButton.setAttribute('aria-pressed', 'true')
      pauseButton.setAttribute('aria-label', '사진 자동 넘김 재생')
      const index = ((Math.round((Math.PI - targetRotation) / angleStep) % projects.length) + projects.length) % projects.length
      status.textContent = `${projects[index].name}, ${projects[index].year}`
    }
    togglePause = () => {
      paused = !paused
      videoPaused = paused
      syncVideos()
      pauseButton.setAttribute('aria-pressed', String(paused))
      pauseButton.setAttribute('aria-label', paused ? '사진 자동 넘김 재생' : '사진 자동 넘김 일시정지')
    }
    return () => {
      alive = false
      emitPhotoFrame(null)
      emitPhotoEdges([])
      revealListeners.delete(revealChanged)
      videoEvents.abort()
      videoPanels.forEach(({ video }) => playVideo(video, false))
      events.abort()
      cancelAnimationFrame(frame)
      dimensions.disconnect()
      visibility.disconnect()
      group.traverse(object => { object.geometry?.dispose(); object.material?.dispose() })
      textures.forEach(texture => texture.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      cursor.remove()
      gallery.classList.remove('is-webgl')
      pauseButton.setAttribute('aria-pressed', 'false')
      pauseButton.setAttribute('aria-label', '사진 자동 넘김 일시정지')
      step = fallbackStep
      togglePause = () => {}
    }
  })

  media.add({ compact: '(max-width: 991px)', reduce: '(prefers-reduced-motion: reduce)', screen: '(min-width: 0px)' }, context => {
    if (!context.conditions.compact && !context.conditions.reduce && gallery.classList.contains('is-webgl')) return
    const clones = []
    for (const position of ['before', 'after']) {
      const fragment = document.createDocumentFragment()
      items.forEach(item => {
        const clone = item.cloneNode(true)
        clone.setAttribute('aria-hidden', 'true')
        clone.inert = true
        fragment.append(clone)
        clones.push(clone)
      })
      if (position === 'before') list.prepend(fragment)
      else list.append(fragment)
    }
    const compactEvents = new AbortController()
    const nativeCards = [...list.children]
    const originalCardStyles = new Map(nativeCards.map(card => [card, Object.fromEntries(
      ['transform', 'opacity', 'willChange'].map(property => [property, card.style[property]]),
    )]))
    const nativeCaptions = [...list.querySelectorAll('figcaption')]
    const originalCaptionStyles = new Map(nativeCaptions.map(caption => [caption, {
      opacity: caption.style.opacity, visibility: caption.style.visibility,
    }]))
    const originalAnchor = list.style.overflowAnchor
    list.style.overflowAnchor = 'none'
    let entryScroll = null
    function restoreEntry() {
      nativeCards.forEach(card => Object.assign(card.style, originalCardStyles.get(card)))
    }
    function revealNative(open = revealProgress) {
      const complete = open >= .999 || !section.classList.contains('is-unfolding')
      nativeCaptions.forEach(caption => {
        if (complete) Object.assign(caption.style, originalCaptionStyles.get(caption))
        else {
          caption.style.visibility = open < .94 ? 'hidden' : 'visible'
          caption.style.opacity = String(easeOpen((open - .94) / .06))
        }
      })
      if (complete) { restoreEntry(); list.style.scrollSnapType = ''; return }
      list.style.scrollSnapType = 'none'
      const resting = period()
      if (entryScroll === null) entryScroll = resting
      list.scrollLeft = resting + (entryScroll - resting) * easeOpen((open - .7) / .3)
      // Keep the native photos full size too; only the section's opacity and
      // vertical handoff animate, with no compact stack or scale interpolation.
      restoreEntry()
    }
    function publishPhotoFrame() {
      if (disposed || !section.classList.contains('is-unfolding')) { emitPhotoFrame(null); return }
      const photo = items[0].querySelector('.portfolio__placeholder')
      const rect = photo.getBoundingClientRect()
      const cardRect = items[0].getBoundingClientRect()
      const style = getComputedStyle(items[0])
      const matrix = new DOMMatrix(style.transform)
      const scale = matrix.a || 1
      const origin = style.transformOrigin.split(' ').map(Number.parseFloat)
      const restRect = {
        x: cardRect.left - matrix.e - origin[0] * (1 - scale) + (rect.left - cardRect.left) / scale,
        y: cardRect.top - matrix.f - origin[1] * (1 - scale) + (rect.top - cardRect.top) / scale,
        width: rect.width / scale, height: rect.height / scale,
      }
      const radius = (Number.parseFloat(getComputedStyle(photo).borderTopLeftRadius) || 0) * rect.width / photo.offsetWidth
      emitPhotoFrame({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, radius, restRect)
    }
    function publishPhotoEdges() {
      if (disposed || canExplore()) { emitPhotoEdges([]); return }
      const photos = [...list.querySelectorAll('.portfolio__placeholder')].map(photo => photo.getBoundingClientRect())
        .filter(rect => Math.min(rect.right, innerWidth) - Math.max(rect.left, 0) > 80
          && Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0) > 60)
        .sort((a, b) => Math.abs((a.left + a.right) / 2 - innerWidth / 2) - Math.abs((b.left + b.right) / 2 - innerWidth / 2))
        .slice(0, revealProgress > .55 ? 3 : 1)
      const edges = photos.map(rect => [
        ...[.16, .36, .64, .84].map(u => ({ x: rect.left + rect.width * u, y: rect.top + 1.5 })),
        { x: rect.left + 1.5, y: rect.top + rect.height * .2 },
        { x: rect.right - 1.5, y: rect.top + rect.height * .2 },
      ])
      emitPhotoEdges(Array.from({ length: 6 }, (_, index) => edges.map(points => points[index])).flat().filter(visibleEdgePoint))
    }
    const videos = [...list.querySelectorAll('video')]
    const visibleVideos = new Set()
    let galleryVisible = false
    const syncVideos = () => videos.forEach(video => {
      const visible = canExplore() && galleryVisible && visibleVideos.has(video) && !document.hidden
      if (!visible || !context.conditions.reduce) playVideo(video, visible)
    })
    videos.forEach(video => {
      video.muted = video.defaultMuted = true
      video.controls = context.conditions.reduce
    })
    const videoVisibility = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) visibleVideos.add(target)
        else visibleVideos.delete(target)
      })
      syncVideos()
    }, { root: list, threshold: .05 })
    const galleryVisibility = new IntersectionObserver(entries => {
      galleryVisible = entries[0].isIntersecting
      syncVideos()
    })
    videos.forEach(video => videoVisibility.observe(video))
    galleryVisibility.observe(gallery)
    document.addEventListener('visibilitychange', syncVideos, { signal: compactEvents.signal })
    let gesture, scrollTween
    // Intrinsic card widths keep the looping row independent of entry motion.
    const stride = () => (Number.parseFloat(getComputedStyle(items[0]).width) || items[0].offsetWidth) + 20
    const period = () => stride() * items.length
    const reset = () => {
      scrollTween?.kill()
      list.style.scrollSnapType = canExplore() ? '' : 'none'
      list.scrollLeft = period()
      entryScroll = list.scrollLeft
      if (!canExplore()) revealNative()
      publishPhotoFrame()
      publishPhotoEdges()
    }
    const resetFrame = requestAnimationFrame(reset)
    const revealChanged = (open, previous) => {
      if (open < .985 && previous >= .985) {
        entryScroll = list.scrollLeft
        scrollTween?.kill()
        gesture = undefined
      }
      revealNative(open)
      publishPhotoFrame()
      publishPhotoEdges()
      syncVideos()
    }
    revealListeners.add(revealChanged)
    section.addEventListener('portfolio:photo-frame-request', publishPhotoFrame, { signal: compactEvents.signal })
    let timer
    const wrap = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!canExplore() || gesture?.horizontal || scrollTween?.isActive()) return
        const width = period()
        if (list.scrollLeft < width * .5) list.scrollLeft += width
        else if (list.scrollLeft > width * 1.5) list.scrollLeft -= width
      }, 160)
    }
    list.addEventListener('scroll', wrap, { passive: true })
    const compactResize = new ResizeObserver(reset)
    compactResize.observe(list)
    function settle(index) {
      scrollTween?.kill()
      list.style.scrollSnapType = 'none'
      const complete = () => { list.style.scrollSnapType = ''; wrap() }
      if (context.conditions.reduce) { list.scrollLeft = index * stride(); complete() }
      else scrollTween = gsap.to(list, { scrollLeft: index * stride(), duration: .5, ease: 'power2.out', onComplete: complete })
      const project = projects[((index % projects.length) + projects.length) % projects.length]
      status.textContent = `${project.name}, ${project.year}`
    }
    step = direction => settle(Math.round(list.scrollLeft / stride()) + direction)
    list.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      if (!requestExplore()) return
      scrollTween?.kill()
      gesture = { x: event.clientX, y: event.clientY, left: list.scrollLeft, horizontal: false }
    }, { signal: compactEvents.signal })
    list.addEventListener('pointermove', event => {
      if (!gesture) return
      const x = event.clientX - gesture.x, y = event.clientY - gesture.y
      if (!gesture.horizontal) {
        if (Math.abs(y) > Math.abs(x) && Math.abs(y) > 8) { gesture = undefined; return }
        if (Math.abs(x) < 8) return
        gesture.horizontal = true
        list.style.scrollSnapType = 'none'
        list.setPointerCapture(event.pointerId)
      }
      event.preventDefault()
      list.scrollLeft = gesture.left - x
    }, { signal: compactEvents.signal })
    const endGesture = event => {
      if (!gesture) return
      if (gesture.horizontal) {
        const distance = event.clientX - gesture.x
        const direction = Math.abs(distance) > stride() * .15 ? (distance < 0 ? 1 : -1) : 0
        settle(event.type === 'pointercancel' ? Math.round(list.scrollLeft / stride()) : Math.round(gesture.left / stride()) + direction)
      }
      gesture = undefined
      if (list.hasPointerCapture(event.pointerId)) list.releasePointerCapture(event.pointerId)
    }
    list.addEventListener('pointerup', endGesture, { signal: compactEvents.signal })
    list.addEventListener('pointercancel', endGesture, { signal: compactEvents.signal })
    return () => {
      revealListeners.delete(revealChanged)
      emitPhotoFrame(null)
      emitPhotoEdges([])
      restoreEntry()
      nativeCaptions.forEach(caption => Object.assign(caption.style, originalCaptionStyles.get(caption)))
      list.style.overflowAnchor = originalAnchor
      clearTimeout(timer)
      cancelAnimationFrame(resetFrame)
      compactEvents.abort()
      videoVisibility.disconnect()
      galleryVisibility.disconnect()
      videos.forEach(video => { playVideo(video, false); video.controls = false })
      scrollTween?.kill()
      compactResize.disconnect()
      list.removeEventListener('scroll', wrap)
      clones.forEach(clone => clone.remove())
      list.style.scrollSnapType = ''
      step = fallbackStep
    }
  })

  previous.addEventListener('click', () => { if (requestExplore()) step(-1) }, { signal })
  next.addEventListener('click', () => { if (requestExplore()) step(1) }, { signal })
  pauseButton.addEventListener('click', () => { if (requestExplore()) togglePause() }, { signal })
  gallery.addEventListener('keydown', event => {
    if (event.target.closest('button')) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      if (!requestExplore()) return
      step(event.key === 'ArrowRight' ? 1 : -1)
    } else if (event.key === ' ' && gallery.classList.contains('is-webgl')) {
      event.preventDefault()
      if (!requestExplore()) return
      togglePause()
    }
  }, { signal })
  // The renderer loads after the reveal's pin has measured the HTML fallback.
  // Re-measure its final height so the pin cannot leave an empty page below it.
  const layoutRefresh = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh() })
  return () => {
    disposed = true
    cancelAnimationFrame(layoutRefresh)
    controller.abort()
    resize.disconnect()
    media.revert()
    lines.forEach(line => { line.style.transform = '' })
  }
}
