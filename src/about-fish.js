import { gsap } from 'gsap'
import { createFishSwimmer } from './about-fish-swim.js'

const clamp = gsap.utils.clamp(0, 1)
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }

// Follow the card deck's existing scroll clock; no additional pin or animation loop.
export function initAboutFish(section) {
  const stage = section.querySelector('.capability-cards__stage')
  const layer = section.querySelector('.about-fish-layer')
  const nodes = [...section.querySelectorAll('[data-about-fish]')]
  if (!stage || !layer || nodes.length !== 2) return { measure() {}, render() {}, destroy() {} }
  section.classList.add('is-fish-swimming')
  gsap.set(nodes, { xPercent: -50, yPercent: -50, opacity: 0 })
  const fish = nodes.map((node, index) => ({
    index, node, width: 0, height: 0,
    x: gsap.quickSetter(node, 'x', 'px'),
    y: gsap.quickSetter(node, 'y', 'px'),
    angle: gsap.quickSetter(node, 'rotation', 'deg'),
    opacity: gsap.quickSetter(node, 'opacity'),
  }))
  let width = 0
  let height = 0
  let progress = 0
  let poses = []
  let swimmer = null
  let disposed = false
  let booting = false
  let inView = false
  const controller = new AbortController()

  function syncVisibility() { swimmer?.setVisible(inView && !document.hidden) }
  async function boot() {
    if (booting || disposed || swimmer) return
    booting = true
    const images = nodes.map(node => node.querySelector('img'))
    try {
      images.forEach(image => { image.loading = 'eager' })
      await Promise.all(images.map(image => image.decode()))
      if (disposed) return
      swimmer = createFishSwimmer(layer, images)
      swimmer?.update(poses)
      swimmer?.resize(width, height)
      syncVisibility()
    } catch { /* Keep the original image sprites if decoding or GPU setup fails. */ }
  }
  const observer = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting)
    if (inView) boot()
    syncVisibility()
  }, { rootMargin: '120px' })
  observer.observe(section)
  document.addEventListener('visibilitychange', syncVisibility, { signal: controller.signal })

  function render(value = progress) {
    progress = clamp(value)
    const narrow = width < 768
    const compact = width < 992
    const visibility = smooth((progress - .005) / .055) * (1 - smooth((progress - .79) / .13))
    poses = fish.map(item => {
      const right = item.index === 1
      const u = clamp((progress - (right ? .035 : 0)) / .91)
      const phase = u * Math.PI * 2.3 + (right ? .7 : -.2)
      const amplitude = width * (narrow ? .035 : compact ? .03 : .055)
      const side = right ? -1 : 1
      const baseX = width * (right ? (narrow ? .86 : compact ? .91 : .82) : (narrow ? .14 : compact ? .09 : .18))
      const startY = height * (right ? (narrow ? .66 : .27) : (narrow ? .09 : .14))
      const travel = height * (right && narrow ? .17 : .64)
      const x = baseX + side * amplitude * Math.sin(phase)
      const y = startY + travel * u
      const dx = side * amplitude * Math.PI * 2.3 * Math.cos(phase)
      const tangent = Math.atan2(travel, dx) * 180 / Math.PI
      const turn = gsap.utils.clamp(-34, 34, tangent - 90)
      item.x(x)
      item.y(y)
      // Dorsal-view sprites already point down; bank into each turn of the S.
      item.angle(turn)
      const opacity = visibility * (right ? .95 : .89)
      item.opacity(opacity)
      return { x, y, angle: turn, width: item.width, height: item.height, opacity }
    })
    swimmer?.update(poses)
  }

  function measure() {
    width = stage.clientWidth
    height = stage.clientHeight
    fish.forEach(item => { item.width = item.node.offsetWidth; item.height = item.node.offsetHeight })
    render()
    swimmer?.resize(width, height)
  }
  measure()

  return {
    measure,
    render,
    destroy() {
      disposed = true
      controller.abort()
      observer.disconnect()
      swimmer?.destroy()
      section.classList.remove('is-fish-swimming')
      gsap.set(nodes, { clearProps: 'transform,opacity' })
    },
  }
}
