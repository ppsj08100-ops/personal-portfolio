import './work-team-fish.css'

const SPECIES = [
  { name: 'butterfly', src: '/images/work-team-fish-butterfly-v1.png', width: 1536, height: 1024, size: .90, tailStart: .70, speed: 2.7, sway: .062, opacity: .86 },
  { name: 'tang', src: '/images/work-team-fish-tang-v1.png', width: 1536, height: 1024, size: .85, tailStart: .70, speed: 2.1, sway: .045, opacity: .91 },
  { name: 'anthias', src: '/images/work-team-fish-anthias-v1.png', width: 1774, height: 887, size: 1.10, tailStart: .62, speed: 2.5, sway: .052, opacity: .82 },
  { name: 'idol', src: '/images/work-team-fish-idol-v1.png', width: 1536, height: 1024, size: .93, tailStart: .67, speed: 2.9, sway: .060, opacity: .80 },
]
const FRAME_MS = 40
const STRIPS = 32
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}

// One school, one clock. Scroll owns the journey; time only flexes the tails.
export function initWorkTeamFish(element) {
  if (!element) return { render() {}, destroy() {} }

  const layer = document.createElement('div')
  layer.className = 'work-team-school'
  layer.dataset.teamSchool = ''
  layer.dataset.teamSchoolDirection = 'left-down'
  layer.dataset.teamSchoolReady = '0'
  layer.setAttribute('aria-hidden', 'true')
  const fish = SPECIES.map((species, index) => {
    const image = document.createElement('img')
    image.className = 'work-team-school__fish'
    image.dataset.teamFish = String(index + 1)
    image.dataset.teamFishSpecies = species.name
    image.dataset.teamFishFacing = '-1'
    image.dataset.teamFishLoad = 'loading'
    image.dataset.teamFishRenderer = 'image'
    image.alt = ''
    image.draggable = false
    image.decoding = 'async'
    layer.append(image)
    return image
  })
  const canvas = document.createElement('canvas')
  canvas.className = 'work-team-school__canvas'
  canvas.dataset.teamSchoolCanvas = ''
  canvas.setAttribute('aria-hidden', 'true')
  layer.append(canvas)
  element.append(layer)

  const context = canvas.getContext('2d', { alpha: true })
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const { signal } = controller
  const textures = SPECIES.map(species => {
    const texture = document.createElement('canvas')
    texture.width = Math.min(480, species.width)
    texture.height = Math.round(texture.width * species.height / species.width)
    return { canvas: texture, context: texture.getContext('2d'), ready: false }
  })
  const copy = element.querySelector('.work-chapter__copy')
  const route = element.querySelector('.work-route')

  let disposed = false
  let ready = false
  let onScreen = false
  let width = 0
  let height = 0
  let dpr = 1
  let progress = .4
  let held = false
  let staticView = true
  let alpha = 1
  let poses = []
  let raf = 0
  let timer = 0
  let previousFrame = 0
  let elapsed = 0
  let frames = 0
  let running = false

  function compose() {
    if (!width || !height) return
    const still = staticView || reduced.matches || !held
    const p = still ? .4 : progress
    const joined = smooth(.14, .29, p)
    const exit = smooth(.56, .74, p)
    const forward = smooth(.29, .52, p)
    const mobile = width < 768
    const compact = height < 650
    const schoolWidth = mobile ? Math.min(270, width * .78) : Math.min(550, width * .39)
    const baseSize = mobile ? Math.max(52, Math.min(72, width * .173)) : Math.max(100, Math.min(140, width * .079))
    const sizes = SPECIES.map(species => {
      const aspect = species.width / species.height
      const fishWidth = Math.min(baseSize * species.size, (mobile || compact ? 44 : 72) * aspect)
      return { width: fishWidth, height: fishWidth / aspect }
    })
    const maxFishHeight = Math.max(...sizes.map(size => size.height))
    const row = maxFishHeight * (compact ? .6 : 1) + (mobile ? 6 : 9)
    const slots = [
      { x: -.32, y: -.52, loose: .045, angle: -.016 },
      { x: .08, y: -.32, loose: .025, angle: .012 },
      { x: -.10, y: .56, loose: .055, angle: -.009 },
      { x: .33, y: .48, loose: .020, angle: .008 },
    ]
    const rootBox = element.getBoundingClientRect()
    const copyY = Number.parseFloat(element.style.getPropertyValue('--chapter-copy-y')) || 0
    const captionBottom = copy ? copy.getBoundingClientRect().bottom - rootBox.top - copyY : height * .55
    const routeTop = route ? route.getBoundingClientRect().top - rootBox.top - copyY : height * .84
    const upperExtent = Math.min(...slots.map((slot, index) => slot.y * row - sizes[index].height / 2))
    const lowerExtent = Math.max(...slots.map((slot, index) => slot.y * row + sizes[index].height / 2))
    const margin = compact ? 12 : 23
    const topLimit = captionBottom + margin - upperExtent
    const bottomLimit = routeTop - margin - lowerExtent
    const safeDescent = Math.min(forward * height * .018, Math.max(0, bottomLimit - topLimit) * .55)
    const desiredY = height * (.695 + (forward - .4674) * .04 - (1 - joined) * .026)
    const centerY = Math.min(Math.max(desiredY, topLimit + safeDescent), Math.max(topLimit + safeDescent, bottomLimit)) + exit * height * .125
    // The dolphin has already led the way to the lower left. Its four small
    // followers arrive behind it from the right and continue the same descent.
    const centerX = width * (.60 + (1 - joined) * .13 - forward * .12 - exit * .70)
    const pitch = -.10 - forward * .065 - exit * .08
    alpha = still ? 1 : smooth(.11, .22, p) * (1 - smooth(.59, .735, p))
    poses = slots.map((slot, index) => ({
      x: centerX + slot.x * schoolWidth + (1 - joined) * width * slot.loose,
      y: centerY + slot.y * row,
      width: sizes[index].width, height: sizes[index].height,
      angle: pitch + slot.angle, opacity: SPECIES[index].opacity, facing: -1,
    }))
    poses.forEach((pose, index) => {
      const image = fish[index]
      image.style.left = `${pose.x.toFixed(3)}px`
      image.style.top = `${pose.y.toFixed(3)}px`
      image.style.width = `${pose.width.toFixed(3)}px`
      image.style.height = `${pose.height.toFixed(3)}px`
      image.style.transform = `translate(-50%, -50%) rotate(${pose.angle}rad)`
      image.style.setProperty('--team-fish-opacity', String(pose.opacity))
    })
    layer.style.opacity = alpha.toFixed(4)
    layer.dataset.teamSchoolProgress = progress.toFixed(4)
    // These values never include the tail clock, making reverse scroll exact.
    layer.dataset.teamSchoolPoses = JSON.stringify(poses.map((pose, index) => ({
      species: SPECIES[index].name,
      ...Object.fromEntries(Object.entries(pose).map(([key, value]) => [key, Number(value.toFixed(3))])),
    })))
    layer.dataset.teamSchoolComposition = still ? 'settled' : p < .29 ? 'joining' : p < .56 ? 'schooling' : 'leaving'
  }

  function draw(time, animate) {
    if (!ready || !context || !width || !height) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    poses.forEach((pose, index) => {
      if (!textures[index].ready) return
      const texture = textures[index].canvas
      const species = SPECIES[index]
      context.save()
      context.translate(pose.x, pose.y)
      context.rotate(pose.angle)
      context.globalAlpha = pose.opacity
      const slice = texture.width / STRIPS
      // All four new profiles face left. Each left-hand head stays rigid;
      // only that species' rear body and right-hand tail receive a wave.
      for (let strip = 0; strip < STRIPS; strip += 1) {
        const u = (strip + .5) / STRIPS
        const tail = smooth(species.tailStart, .98, u)
        const phase = time * species.speed + index * .9 - u * 4.5
        const bend = animate ? Math.sin(phase) * tail * tail * pose.height * species.sway : 0
        const stripX = strip / STRIPS * pose.width - pose.width / 2
        context.drawImage(texture, strip * slice, 0, slice + .4, texture.height,
          stripX, -pose.height / 2 + bend, pose.width / STRIPS + .3, pose.height)
      }
      context.restore()
    })
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    if (timer) clearTimeout(timer)
    raf = 0
    timer = 0
    previousFrame = 0
    running = false
    layer.dataset.teamSchoolClock = 'stopped'
  }

  function frame(now) {
    raf = 0
    if (!running || disposed) return
    if (previousFrame) elapsed += Math.min((now - previousFrame) / 1000, .1)
    previousFrame = now
    draw(elapsed, true)
    frames += 1
    layer.dataset.teamSchoolTime = elapsed.toFixed(3)
    layer.dataset.teamSchoolFrames = String(frames)
    timer = setTimeout(() => {
      timer = 0
      if (running) raf = requestAnimationFrame(frame)
    }, FRAME_MS)
  }

  function sync() {
    if (disposed) return
    const parentAlpha = Number.parseFloat(element.style.getPropertyValue('--chapter-opacity') || '1')
    const inert = !!element.closest('[inert]')
    const menuOpen = document.body.classList.contains('has-menu-open') || !!document.querySelector('dialog[open]')
    const still = staticView || reduced.matches || !held || !ready
    const reason = !onScreen ? 'offscreen' : alpha < .003 || parentAlpha < .003 ? 'transparent'
      : document.hidden ? 'document-hidden' : menuOpen ? 'menu-open' : inert ? 'inert'
        : reduced.matches ? 'reduced-motion' : staticView ? 'static-view' : !held ? 'native-view'
          : !ready ? 'artwork-fallback' : 'visible'
    const active = reason === 'visible'
    layer.dataset.teamSchoolState = still ? 'static' : active ? 'running' : 'paused'
    layer.dataset.teamSchoolReason = reason
    if (active) {
      if (!running) {
        running = true
        layer.dataset.teamSchoolClock = 'active'
        raf = requestAnimationFrame(frame)
      }
    } else {
      stop()
      draw(elapsed, !still)
    }
  }

  function measure() {
    if (disposed) return
    width = element.clientWidth
    height = element.clientHeight
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    compose()
    draw(elapsed, running)
    sync()
  }

  function refresh() {
    compose()
    draw(elapsed, running)
    sync()
  }

  const intersection = new IntersectionObserver(entries => {
    onScreen = entries[0]?.isIntersecting === true
    sync()
  }, { threshold: 0 })
  intersection.observe(element)
  const resize = new ResizeObserver(measure)
  resize.observe(element)
  if (copy) resize.observe(copy)
  if (route) resize.observe(route)
  const availability = new MutationObserver(sync)
  availability.observe(document.body, { attributes: true, attributeFilter: ['class', 'inert'] })
  for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
    availability.observe(ancestor, { attributes: true, attributeFilter: ['inert'] })
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    availability.observe(dialog, { attributes: true, attributeFilter: ['open'] })
  })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', refresh, { signal })
  fish.forEach((image, index) => {
    image.addEventListener('load', () => {
      if (disposed) return
      const texture = textures[index]
      image.dataset.teamFishLoad = 'loaded'
      if (context && texture.context) {
        texture.context.imageSmoothingEnabled = true
        texture.context.imageSmoothingQuality = 'high'
        texture.context.drawImage(image, 0, 0, texture.canvas.width, texture.canvas.height)
        texture.ready = true
        image.classList.add('has-team-fish-texture')
        image.dataset.teamFishRenderer = 'canvas'
      }
      ready = textures.some(item => item.ready)
      layer.classList.toggle('has-team-fish-canvas', ready)
      layer.dataset.teamSchoolReady = String(textures.filter(item => item.ready).length)
      measure()
    }, { once: true, signal })
    image.addEventListener('error', () => {
      if (disposed) return
      image.dataset.teamFishLoad = 'error'
      image.dataset.teamFishRenderer = 'unavailable'
      image.hidden = true
      sync()
    }, { once: true, signal })
    image.src = SPECIES[index].src
  })
  document.fonts?.ready.then(() => { if (!disposed) measure() })
  measure()

  return {
    render(value, options = {}) {
      if (disposed) return
      progress = clamp(value)
      held = options.held === true
      staticView = options.staticView === true
      refresh()
    },
    destroy() {
      if (disposed) return
      disposed = true
      stop()
      controller.abort()
      intersection.disconnect()
      resize.disconnect()
      availability.disconnect()
      layer.remove()
      textures.forEach(texture => { texture.canvas.width = 0; texture.canvas.height = 0 })
      canvas.width = 0
      canvas.height = 0
    },
  }
}
