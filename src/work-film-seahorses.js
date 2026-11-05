import './work-film-seahorses.css'

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}

/** Two engraved residents float quietly below the short-form introduction. */
export function initWorkFilmSeahorses(element) {
  if (!element) return { render() {}, destroy() {} }
  const stage = element.querySelector('[data-film-stage]') || element
  const layer = document.createElement('div')
  layer.className = 'work-film-seahorses'
  layer.dataset.filmSeahorses = ''
  layer.dataset.filmSeahorsesClockMode = 'css'
  layer.setAttribute('aria-hidden', 'true')
  const horses = ['left', 'right'].map(side => {
    const holder = document.createElement('span')
    holder.className = `work-film-seahorses__holder work-film-seahorses__holder--${side}`
    const image = new Image()
    image.className = `work-film-seahorses__image work-film-seahorses__image--${side}`
    image.dataset.filmSeahorse = side
    image.dataset.filmSeahorseLoad = 'loading'
    image.alt = ''
    image.draggable = false
    image.decoding = 'async'
    image.loading = 'lazy'
    image.width = 1024
    image.height = 1536
    holder.append(image)
    layer.append(holder)
    return { holder, image, side, aspect: 2 / 3, loaded: false, intersecting: false }
  })
  stage.append(layer)

  const copy = element.querySelector('.work-chapter__copy')
  const route = element.querySelector('.work-route')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const { signal } = controller
  let disposed = false
  let progress = 1
  let staticView = true
  let reveal = 1

  function sync() {
    if (disposed) return
    const loaded = horses.filter(horse => horse.loaded).length
    const visible = horses.some(horse => horse.intersecting && horse.loaded)
    const parentAlpha = Number.parseFloat(element.style.getPropertyValue('--chapter-opacity') || '1')
    const dialogOpen = document.body.classList.contains('has-menu-open') || !!document.querySelector('dialog[open]')
    const still = reduced.matches || staticView
    const reason = !loaded ? 'image-unavailable' : !visible ? 'offscreen' : document.hidden ? 'document-hidden'
      : dialogOpen ? 'dialog-open' : stage.closest('[inert], [hidden]') ? 'inert'
        : still ? reduced.matches ? 'reduced-motion' : 'static-view'
          : reveal < .003 || parentAlpha < .003 ? 'transparent' : 'visible'
    const running = reason === 'visible'
    layer.style.setProperty('--seahorse-play-state', running ? 'running' : 'paused')
    layer.dataset.filmSeahorsesState = still ? 'static' : running ? 'running' : 'paused'
    layer.dataset.filmSeahorsesReason = reason
    layer.dataset.filmSeahorsesClock = running ? 'active' : 'stopped'
    layer.dataset.filmSeahorsesReady = String(loaded)
    layer.classList.toggle('is-static', still)
  }

  function measure() {
    if (disposed) return
    const width = stage.clientWidth, height = stage.clientHeight
    if (!width || !height) return
    const mobile = width < 768
    const short = height < 650
    const box = stage.getBoundingClientRect()
    const copyY = Number.parseFloat(element.style.getPropertyValue('--chapter-copy-y')) || 0
    const captionBottom = copy ? copy.getBoundingClientRect().bottom - box.top - copyY : height * .53
    const routeTop = route ? route.getBoundingClientRect().top - box.top - copyY : height * .84
    const margin = short ? 8 : 18
    const drift = short ? 3 : 7
    const requestedHeight = short ? 100 : mobile ? Math.max(220, Math.min(240, width * .60))
      : Math.min(240, height * .30)
    const room = Math.max(45, routeTop - captionBottom - margin * 2)
    let horseHeight = Math.min(requestedHeight, Math.max(45, room - drift * 2 - (short ? 4 : 10)))
    const pairWidth = mobile ? width - 44 : Math.max(360, Math.min(540, width * .52))
    const angles = short ? [.025, -.03] : [.055, -.07]
    const tiltRoom = short ? .01 : .02
    const copyBox = copy?.getBoundingClientRect()
    const copyLeft = copyBox ? copyBox.left - box.left : width * .25
    const copyRight = copyBox ? copyBox.right - box.left : width * .75
    const textGap = short ? 14 : 20
    const edgeGap = 18
    const widthFactor = (horse, angle) => Math.abs(Math.cos(Math.abs(angle) + tiltRoom)) * horse.aspect
      + Math.abs(Math.sin(Math.abs(angle) + tiltRoom))
    const flankHeight = Math.min(short ? Math.min(220, height * .42) : Math.max(260, Math.min(380, height * .36)),
      (copyLeft - textGap - edgeGap - 2) / widthFactor(horses[0], angles[0]),
      (width - copyRight - textGap - edgeGap - 2) / (.93 * widthFactor(horses[1], angles[1])))
    const flank = width >= 1100 && flankHeight >= (short ? 180 : 260)
    if (flank) horseHeight = flankHeight
    const leftHeight = horseHeight, rightHeight = horseHeight * .93
    const leftWidth = leftHeight * horses[0].aspect, rightWidth = rightHeight * horses[1].aspect
    const leftY = leftHeight / 2, rightY = horseHeight * .07 + rightHeight / 2
    const halfHeight = (imageWidth, imageHeight, angle) =>
      (Math.abs(Math.cos(Math.abs(angle) + tiltRoom)) * imageHeight + Math.abs(Math.sin(Math.abs(angle) + tiltRoom)) * imageWidth) / 2
    const leftHalf = halfHeight(leftWidth, leftHeight, angles[0])
    const rightHalf = halfHeight(rightWidth, rightHeight, angles[1])
    const minExtent = Math.min(leftY - leftHalf, rightY - rightHalf) - drift
    const maxExtent = Math.max(leftY + leftHalf, rightY + rightHalf) + drift
    const minTop = (flank ? 16 : captionBottom + margin) - minExtent
    const maxTop = routeTop - margin - maxExtent
    const wantedTop = flank ? height * .59 - horseHeight / 2 : height * (short ? .61 : .60)
    const top = Math.min(Math.max(wantedTop, minTop), Math.max(minTop, maxTop))
    const leftHalfWidth = widthFactor(horses[0], angles[0]) * leftHeight / 2 + 1
    const rightHalfWidth = widthFactor(horses[1], angles[1]) * rightHeight / 2 + 1
    const leftX = flank ? Math.min(Math.max(width * .17, edgeGap + leftHalfWidth), copyLeft - textGap - leftHalfWidth)
      : width / 2 - pairWidth / 2 + leftWidth / 2
    const rightX = flank ? Math.max(Math.min(width * .83, width - edgeGap - rightHalfWidth), copyRight + textGap + rightHalfWidth)
      : width / 2 + pairWidth / 2 - rightWidth / 2
    const poses = [
      { x: leftX, y: top + leftY, width: leftWidth, height: leftHeight, angle: angles[0] },
      { x: rightX, y: top + rightY, width: rightWidth, height: rightHeight, angle: angles[1] },
    ]
    poses.forEach((pose, index) => Object.assign(horses[index].holder.style, {
      left: `${pose.x.toFixed(3)}px`, top: `${pose.y.toFixed(3)}px`,
      width: `${pose.width.toFixed(3)}px`, height: `${pose.height.toFixed(3)}px`,
      transform: `translate(-50%, -50%) rotate(${pose.angle}rad)`,
    }))
    reveal = staticView || reduced.matches ? 1 : smooth(.03, .34, progress)
    layer.style.opacity = reveal.toFixed(4)
    layer.style.setProperty('--seahorse-drift', `${drift}px`)
    layer.style.setProperty('--seahorse-tilt', short ? '.5deg' : '1deg')
    layer.dataset.filmSeahorsesProgress = progress.toFixed(4)
    layer.dataset.filmSeahorsesReveal = reveal.toFixed(4)
    layer.dataset.filmSeahorsesLayout = flank ? 'flanking-copy' : 'below-copy'
    layer.dataset.filmSeahorsesPoses = JSON.stringify(poses.map(pose => Object.fromEntries(
      Object.entries(pose).map(([key, value]) => [key, Number(value.toFixed(3))]),
    )))
    sync()
  }

  const intersection = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const horse = horses.find(item => item.holder === entry.target)
      if (horse) horse.intersecting = entry.isIntersecting
    })
    sync()
  }, { threshold: 0 })
  horses.forEach(horse => intersection.observe(horse.holder))
  const resize = new ResizeObserver(measure)
  resize.observe(stage)
  if (copy) resize.observe(copy)
  if (route) resize.observe(route)
  const availability = new MutationObserver(sync)
  availability.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'open', 'inert', 'hidden'] })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', measure, { signal })
  horses.forEach(horse => {
    horse.image.addEventListener('load', () => {
      if (disposed) return
      horse.loaded = true
      horse.aspect = horse.image.naturalWidth / horse.image.naturalHeight || horse.aspect
      horse.image.dataset.filmSeahorseLoad = 'loaded'
      horse.image.classList.add('is-loaded')
      measure()
    }, { once: true, signal })
    horse.image.addEventListener('error', () => {
      if (disposed) return
      horse.image.dataset.filmSeahorseLoad = 'error'
      horse.image.hidden = true
      sync()
    }, { once: true, signal })
    horse.image.src = `/images/work-film-seahorse-${horse.side}-v1.png`
  })
  document.fonts?.ready.then(() => { if (!disposed) measure() })
  measure()

  return {
    render(value, { staticView: nextStaticView = false } = {}) {
      if (disposed) return
      progress = clamp(value)
      staticView = nextStaticView
      measure()
    },
    destroy() {
      if (disposed) return
      disposed = true
      controller.abort()
      intersection.disconnect()
      resize.disconnect()
      availability.disconnect()
      layer.remove()
    },
  }
}
