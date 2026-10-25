// Traced from the existing background, never from a separate sand asset.
// Desktop points follow the actual bright crest in the 1672 × 941 source,
// rather than a neighboring slope. Mobile uses its bottom-aligned source.
const desktopCrest = [[0, .8788523], [.2093301, .8788523], [.2392344, .8756642], [.2691388, .8735388], [.2990431, .8724761], [.3289474, .869288], [.3588517, .8660999], [.388756, .8607864], [.4186603, .8575983], [.4485646, .8554729], [.4784689, .858661], [.5083732, .8682253], [.5382775, .8756642], [.5681818, .8841658], [1, .8841658]]
const mobileCrest = [[0, .6998698], [.0488281, .6998698], [.0976563, .7044271], [.1464844, .7115885], [.1953125, .7161458], [.2441406, .719401], [.2929688, .7220052], [.3417969, .7246094], [.390625, .7285156], [.4394531, .7356771], [.4882813, .7415365], [.5371094, .7460938], [.5859375, .7421875], [.6347656, .7356771], [.6835938, .7356771], [.7324219, .7363281], [1, .7363281]]

function crestHeight(points, x) {
  const position = Math.max(0, Math.min(1, x))
  let index = 0
  while (index < points.length - 2 && position > points[index + 1][0]) index++
  const a = points[index], b = points[index + 1]
  const t = (position - a[0]) / (b[0] - a[0])
  const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 2)]
  const span = b[0] - a[0]
  const slopeA = (b[1] - before[1]) / (b[0] - before[0]) * span
  const slopeB = (after[1] - a[1]) / (after[0] - a[0]) * span
  return (2 * t ** 3 - 3 * t ** 2 + 1) * a[1] + (t ** 3 - 2 * t ** 2 + t) * slopeA
    + (-2 * t ** 3 + 3 * t ** 2) * b[1] + (t ** 3 - t ** 2) * slopeB
}

function svgImage(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Project a point on the unchanged dune back onto the tilted metal surface.
function plateProjection(tag, style) {
  const matrix = new DOMMatrixReadOnly(style.transform)
  const [originX, originY] = style.transformOrigin.split(' ').map(parseFloat)
  const offsetX = tag.offsetLeft + originX
  const offsetY = tag.offsetTop + originY
  return {
    toScene(u, v) {
      const x = u * tag.clientWidth - originX
      const y = v * tag.clientHeight - originY
      const w = matrix.m14 * x + matrix.m24 * y + matrix.m44
      return [offsetX + (matrix.m11 * x + matrix.m21 * y + matrix.m41) / w,
        offsetY + (matrix.m12 * x + matrix.m22 * y + matrix.m42) / w]
    },
    toPlate(x, y) {
      const u = x - offsetX
      const v = y - offsetY
      const a = matrix.m11 - u * matrix.m14
      const b = matrix.m21 - u * matrix.m24
      const c = matrix.m12 - v * matrix.m14
      const d = matrix.m22 - v * matrix.m24
      const p = u * matrix.m44 - matrix.m41
      const q = v * matrix.m44 - matrix.m42
      const determinant = a * d - b * c
      return [originX + (p * d - b * q) / determinant, originY + (a * q - p * c) / determinant]
    },
  }
}

// Hide only the buried metal. The original sand, its light and grain remain
// a single scene, instead of repainting a strip of it in front of the plate.
export function initFooterGrounding(footer) {
  const wrapper = footer.querySelector('[data-footer-buried-tag]')
  const tag = footer.querySelector('.site-footer__nametag')
  const leftAnchor = footer.querySelector('[data-footer-sand-left]')
  const rightAnchor = footer.querySelector('[data-footer-sand-right]')
  if (!wrapper || !tag || !leftAnchor || !rightAnchor) return () => {}
  const variables = [[wrapper, '--footer-burial-mask'], [tag, '--footer-tag-bottom'],
    [tag, '--footer-tag-turn'], [tag, '--footer-contact-shade'], [tag, '--footer-plate-alpha']]
  const originalStyles = variables.map(([element, property]) => [element, property, element.style.getPropertyValue(property), element.style.getPropertyPriority(property)])
  const mobile = matchMedia('(max-width: 991px)')
  let request = 0
  let disposed = false

  function update() {
    request = 0
    if (disposed) return
    const bounds = footer.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    // The mobile scene is 110% tall and aligned to the footer's bottom.
    const sceneHeight = bounds.height * (mobile.matches ? 1.1 : 1)
    const sceneOffset = sceneHeight - bounds.height
    const points = mobile.matches ? mobileCrest : desktopCrest
    const crest = x => crestHeight(points, x / bounds.width) * sceneHeight - sceneOffset
    // Match the rigid base to the dune's local slope; otherwise one end floats.
    for (let pass = 0; pass < 2; pass++) {
      const left = leftAnchor.getBoundingClientRect()
      const right = rightAnchor.getBoundingClientRect()
      const dx = right.left - left.left
      const targetAngle = Math.atan2(crest(right.left - bounds.left) - crest(left.left - bounds.left), dx)
      const currentAngle = Math.atan2(right.top - left.top, dx)
      const style = getComputedStyle(tag)
      const tilt = parseFloat(style.getPropertyValue('--footer-tag-tilt')) * Math.PI / 180
      const turn = parseFloat(style.getPropertyValue('--footer-tag-turn'))
      const adjusted = turn + (targetAngle - currentAngle) / Math.cos(tilt) * 180 / Math.PI
      tag.style.setProperty('--footer-tag-turn', `${Math.max(-12, Math.min(12, adjusted))}deg`)
    }
    const anchor = leftAnchor.getBoundingClientRect()
    const anchorX = anchor.left - bounds.left
    // Only the outside rim sinks below the crest; the writing face stays free.
    const burial = 4
    // Keep the same corner tucked behind the original dune at every viewport.
    const desiredY = crest(anchorX) + burial
    const bottom = parseFloat(getComputedStyle(tag).bottom)
    tag.style.setProperty('--footer-tag-bottom', `${bottom + anchor.top - bounds.top - desiredY}px`)

    // Let the base settle into the existing uneven crest while protecting the
    // complete writing face. This closes the hollow beneath its middle too.
    function measureContact() {
      const projection = plateProjection(tag, getComputedStyle(tag))
      let maximumGap = -Infinity
      let faceClearance = Infinity
      for (let index = 0; index <= 32; index++) {
        const amount = index / 32
        const [rimX, rimY] = projection.toScene(.25 + amount * .63, mobile.matches ? .86045 : .843)
        maximumGap = Math.max(maximumGap, crest(rimX) - rimY)
        const faceU = mobile.matches ? .205 + amount * .691 : .235 + amount * .668
        const [faceX, faceY] = projection.toScene(faceU, mobile.matches ? .779107 : .734411)
        faceClearance = Math.min(faceClearance, crest(faceX) - faceY)
      }
      return { maximumGap, faceClearance }
    }
    let contact = measureContact()
    if (contact.faceClearance < 8) {
      const positionedBottom = parseFloat(getComputedStyle(tag).bottom)
      tag.style.setProperty('--footer-tag-bottom', `${positionedBottom + 8 - contact.faceClearance}px`)
      contact = measureContact()
    }
    const settle = Math.min(Math.max(0, contact.maximumGap + 1.2), Math.max(0, contact.faceClearance - 8))
    if (settle > .05) {
      const positionedBottom = parseFloat(getComputedStyle(tag).bottom)
      tag.style.setProperty('--footer-tag-bottom', `${positionedBottom - settle}px`)
    }
    const count = Math.ceil(bounds.width / 2)
    const edge = Array.from({ length: count + 1 }, (_, index) => {
      const x = index / count * bounds.width
      return [x, crest(x)]
    })
    const path = `M-4 -4H${bounds.width + 4}V${crest(bounds.width).toFixed(2)}L${edge.reverse().map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}L-4 ${crest(0).toFixed(2)}Z`
    wrapper.style.setProperty('--footer-burial-mask', svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}"><defs><filter id="edge" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".48"/></filter></defs><path d="${path}" fill="white" filter="url(#edge)"/></svg>`))

    const projection = plateProjection(tag, getComputedStyle(tag))
    const rect = tag.getBoundingClientRect()
    const start = Math.max(0, rect.left - bounds.left)
    const end = Math.min(bounds.width, rect.right - bounds.left)
    const shade = Array.from({ length: 97 }, (_, index) => {
      const x = start + (end - start) * index / 96
      const [u, v] = projection.toPlate(x, crest(x) - .65)
      return `${index ? 'L' : 'M'}${u.toFixed(2)} ${v.toFixed(2)}`
    }).join('')
    tag.style.setProperty('--footer-contact-shade', svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="${tag.clientWidth}" height="${tag.clientHeight}" viewBox="0 0 ${tag.clientWidth} ${tag.clientHeight}"><defs><filter id="soft"><feGaussianBlur stdDeviation=".7"/></filter></defs><path d="${shade}" fill="none" stroke="#010611" stroke-opacity=".46" stroke-width="3" filter="url(#soft)"/></svg>`))
    const image = tag.querySelector('img')
    if (image?.currentSrc) tag.style.setProperty('--footer-plate-alpha', `url(${JSON.stringify(image.currentSrc)})`)
    footer.classList.add('is-grounded')
  }
  function schedule() {
    if (!request && !disposed) request = requestAnimationFrame(update)
  }
  const resize = new ResizeObserver(schedule)
  resize.observe(footer)
  resize.observe(tag)
  mobile.addEventListener('change', schedule)
  const image = tag.querySelector('img')
  image?.addEventListener('load', schedule)
  document.fonts.ready.then(schedule)
  schedule()
  return () => {
    disposed = true
    cancelAnimationFrame(request)
    resize.disconnect()
    mobile.removeEventListener('change', schedule)
    image?.removeEventListener('load', schedule)
    footer.classList.remove('is-grounded')
    originalStyles.forEach(([element, property, value, priority]) => {
      if (value) element.style.setProperty(property, value, priority)
      else element.style.removeProperty(property)
    })
  }
}
