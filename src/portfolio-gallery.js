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
    // Keep the visible back of the ring at the approved distance as photos grow.
    group.position.z = radius - referenceRadius - 3
    const mask = roundedMask()
    const textures = [mask]
    const color = getComputedStyle(section).color
    const point = new THREE.Vector3()
    const loader = new THREE.TextureLoader()
    let alive = true
    projects.forEach((project, index) => {
      const material = new THREE.MeshBasicMaterial({ color: '#888888', alphaMap: mask, transparent: true, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(curvedPlane(panelWidth, panelHeight, .2), material)
      mesh.name = project.name
      const angle = index * angleStep
      mesh.position.set(radius * Math.sin(angle), 0, radius * Math.cos(angle))
      mesh.lookAt(0, 0, 0)
      group.add(mesh)
      for (const [text, align, x] of [[project.name, 'left', .01], [project.year, 'right', -.01]]) {
        const texture = captionTexture(text, align, color)
        textures.push(texture)
        const caption = new THREE.Mesh(curvedPlane(panelWidth, labelHeight, panelWidth * .066, 8, 3), new THREE.MeshBasicMaterial({ map: texture, transparent: true }))
        caption.position.set(x, -panelHeight / 2 - labelHeight / 4, -.05)
        mesh.add(caption)
      }
      // Replace only data-image in the HTML to use a photo on both renderers.
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
        const imageAspect = texture.image.width / texture.image.height
        const panelAspect = panelWidth / panelHeight
        if (imageAspect > panelAspect) {
          texture.repeat.x = panelAspect / imageAspect
          texture.offset.x = (1 - texture.repeat.x) * project.focusX
        } else {
          texture.repeat.y = imageAspect / panelAspect
          texture.offset.y = (1 - texture.repeat.y) * (1 - project.focusY)
        }
        textures.push(texture)
        material.map = texture
        material.color.set('#fff')
        material.needsUpdate = true
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
    let paused = false, visible = false, frame, lastTime = 0
    let pointerX = 0, pointerY = 0, cursorX = 0, cursorY = 0
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
    function size() {
      renderer.setSize(gallery.clientWidth, gallery.clientWidth * .6)
      camera.aspect = 1000 / 600
      camera.updateProjectionMatrix()
    }
    const dimensions = new ResizeObserver(size)
    dimensions.observe(gallery)
    size()
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      if (!visible) cursor.classList.remove('is-visible')
    }, { rootMargin: '100px' })
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
      if (!dragging) {
        if (!paused) targetRotation -= speed * delta
        dragVelocity *= Math.pow(.95, delta)
      }
      group.rotation.y += (targetRotation - group.rotation.y) * (1 - Math.pow(.9, delta))
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
      if (finePointer.matches) cursor.classList.add('is-visible')
    }
    function move(event) {
      pointerX = event.clientX
      pointerY = event.clientY
      if (!dragging) return
      const distance = event.clientX - previousX
      previousX = event.clientX
      dragVelocity = distance * .01
      targetRotation += distance * .002
    }
    function release(event) {
      if (dragging && event?.pointerId != null && gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId)
      dragging = false
      speed = .002
    }
    gallery.addEventListener('pointerenter', enter, { signal: events.signal })
    gallery.addEventListener('pointermove', move, { signal: events.signal })
    gallery.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return
      dragging = true
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
      pauseButton.setAttribute('aria-pressed', String(paused))
      pauseButton.setAttribute('aria-label', paused ? '사진 자동 넘김 재생' : '사진 자동 넘김 일시정지')
    }
    return () => {
      alive = false
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
    let gesture, scrollTween
    const stride = () => items[0].getBoundingClientRect().width + 20
    const period = () => stride() * items.length
    const reset = () => { scrollTween?.kill(); list.style.scrollSnapType = ''; list.scrollLeft = period() }
    const resetFrame = requestAnimationFrame(reset)
    let timer
    const wrap = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (gesture?.horizontal || scrollTween?.isActive()) return
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
      clearTimeout(timer)
      cancelAnimationFrame(resetFrame)
      compactEvents.abort()
      scrollTween?.kill()
      compactResize.disconnect()
      list.removeEventListener('scroll', wrap)
      clones.forEach(clone => clone.remove())
      list.style.scrollSnapType = ''
      step = fallbackStep
    }
  })

  previous.addEventListener('click', () => step(-1), { signal })
  next.addEventListener('click', () => step(1), { signal })
  pauseButton.addEventListener('click', () => togglePause(), { signal })
  gallery.addEventListener('keydown', event => {
    if (event.target.closest('button')) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      step(event.key === 'ArrowRight' ? 1 : -1)
    } else if (event.key === ' ' && gallery.classList.contains('is-webgl')) {
      event.preventDefault()
      togglePause()
    }
  }, { signal })
  return () => {
    disposed = true
    controller.abort()
    resize.disconnect()
    media.revert()
    lines.forEach(line => { line.style.transform = '' })
  }
}
