import './work-dive-bubbles.css'

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }
const seed = index => { const value = Math.sin(index * 127.1 + 73.7) * 43758.5453; return value - Math.floor(value) }

/** A pocket of displaced water opens where the dolphin dives into the work. */
export function initWorkDiveBubbles(section) {
  const stage = section?.querySelector('.ocean-type__stage')
  if (!stage) return { destroy() {} }
  const canvas = document.createElement('canvas')
  canvas.className = 'work-dive-bubbles'
  canvas.setAttribute('aria-hidden', 'true')
  const context = canvas.getContext('2d')
  if (!context) return { destroy() {} }
  stage.append(canvas)
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  const particles = Array.from({ length: 64 }, (_, index) => ({
    spread: seed(index + 1) * 2 - 1,
    delay: seed(index + 81) * .16,
    speed: .55 + seed(index + 161) * .65,
    radius: 1.5 + seed(index + 241) ** 2 * 10,
    depth: .3 + seed(index + 321) * .7,
    turn: seed(index + 401) * 2 - 1,
  }))
  let width = 0, height = 0, disposed = false, visible = false, pose = null

  function render() {
    if (disposed || !width || !height) return
    context.clearRect(0, 0, width, height)
    const diving = clamp(pose?.diving), depth = clamp(pose?.depth)
    const active = visible && !document.hidden && !reduced.matches && !menu?.open
      && !document.body.classList.contains('has-menu-open')
    const envelope = smooth(.16, .34, diving) * (1 - smooth(.70, 1, diving)) * (1 - smooth(.78, .99, depth))
    canvas.dataset.progress = diving.toFixed(4)
    canvas.dataset.opacity = active ? envelope.toFixed(4) : '0'
    if (!active || envelope < .001) { canvas.dataset.particles = '0'; return }

    const phone = width < 768
    const span = Math.min(width * (phone ? .56 : .28), height * .48)
    const x = clamp(pose.impactX ?? .28) * width
    const y = clamp(pose.impactY ?? .84) * height
    canvas.dataset.originX = (x / width).toFixed(4)
    canvas.dataset.originY = (y / height).toFixed(4)

    // The pressure cloud stays local: a soft core, then larger airy rings above.
    context.save()
    context.translate(x, y - span * .12 * diving)
    context.scale(1, .62)
    const cloud = context.createRadialGradient(0, 0, 0, 0, 0, span * .52)
    cloud.addColorStop(0, `rgba(190,229,247,${.14 * envelope})`)
    cloud.addColorStop(.35, `rgba(111,185,224,${.09 * envelope})`)
    cloud.addColorStop(1, 'rgba(72,153,211,0)')
    context.fillStyle = cloud
    context.fillRect(-span, -span, span * 2, span * 2)
    context.restore()

    let count = 0
    const available = phone ? 42 : particles.length
    for (let index = 0; index < available; index++) {
      const particle = particles[index]
      const age = (diving - .15 - particle.delay) / (.72 - particle.delay)
      if (age <= 0 || age >= 1) continue
      const rise = 1 - (1 - age) ** 1.35
      const alpha = envelope * smooth(0, .10, age) * (1 - smooth(.58, 1, age))
      const px = x + particle.spread * span * (.07 + .66 * rise) + particle.turn * span * .12 * rise ** 2
      const py = y - span * (.05 + rise * particle.speed) + Math.abs(particle.spread) * span * .16 * rise
      const radius = particle.radius * (phone ? .75 : 1) * (.55 + .85 * rise)
      const brightness = alpha * (.35 + particle.depth * .6)
      context.beginPath()
      context.arc(px, py, radius, 0, Math.PI * 2)
      context.fillStyle = `rgba(147,207,235,${brightness * .08})`
      context.fill()
      context.lineWidth = Math.max(.65, radius * .065)
      context.strokeStyle = `rgba(184,225,246,${brightness * .6})`
      context.stroke()
      context.beginPath()
      context.arc(px - radius * .12, py - radius * .10, radius * .66, Math.PI * 1.12, Math.PI * 1.55)
      context.strokeStyle = `rgba(230,247,255,${brightness * .9})`
      context.stroke()
      // Pinpoint foam between the clear bubbles gives the plunge some weight.
      if (index % 2 === 0) {
        context.beginPath()
        context.arc(px + particle.turn * radius * 2, py + radius * 2.3, .7 + particle.depth, 0, Math.PI * 2)
        context.fillStyle = `rgba(202,235,250,${brightness * .72})`
        context.fill()
      }
      count++
    }
    canvas.dataset.particles = String(count)
  }
  function resize() {
    width = stage.clientWidth; height = stage.clientHeight
    const ratio = Math.min(devicePixelRatio || 1, 1.5)
    canvas.width = Math.max(1, Math.round(width * ratio))
    canvas.height = Math.max(1, Math.round(height * ratio))
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    render()
  }
  section.addEventListener('work-dolphin-pose', event => { pose = event.detail; render() }, { signal })
  document.addEventListener('visibilitychange', render, { signal })
  reduced.addEventListener('change', render, { signal })
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    render()
  })
  observer.observe(stage)
  const sizes = new ResizeObserver(resize)
  sizes.observe(stage)
  const mutation = new MutationObserver(render)
  mutation.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  if (menu) mutation.observe(menu, { attributes: true, attributeFilter: ['open'] })
  resize()
  return { destroy() {
    disposed = true
    controller.abort()
    observer.disconnect()
    sizes.disconnect()
    mutation.disconnect()
    canvas.remove()
  } }
}
