export const SWIM_ENVELOPES = [28, 12, 28]
export const MAX_SWIM_PIXELS = 2_400_000
const MAX_DPR = 2.5
const FISH_HEADS = [[.10, .33], [.50, .50], [.34, .76]]

function include(bounds, x, y) {
  bounds.left = Math.min(bounds.left, x)
  bounds.top = Math.min(bounds.top, y)
  bounds.right = Math.max(bounds.right, x)
  bounds.bottom = Math.max(bounds.bottom, y)
}

/** Crop the framebuffer, preserving original image UVs and CSS coordinates. */
export function swimFrameBounds(record, poses, progress, deviceRatio = 1) {
  const box = record.box
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  if (record.index === 1 && record.parts?.length === 3) {
    record.parts.forEach((part, index) => {
      const pose = poses[index]
      if (pose.progress < 0) return
      const pivot = FISH_HEADS[index]
      const px = pivot[0] * box.imageWidth, py = pivot[1] * box.imageHeight
      const radians = pose.turn * Math.PI / 180
      const c = Math.cos(radians), s = Math.sin(radians)
      for (const u of [part[0], part[2]]) for (const v of [part[1], part[3]]) {
        const x = u * box.imageWidth - px, y = v * box.imageHeight - py
        include(bounds, px + c * x - s * y + pose.x, py + s * x + c * y + pose.y)
      }
    })
  }
  if (!Number.isFinite(bounds.left)) {
    include(bounds, 0, 0)
    include(bounds, box.imageWidth, box.imageHeight)
  }
  const margin = SWIM_ENVELOPES[record.index] + 4
  bounds.left -= margin; bounds.top -= margin
  bounds.right += margin; bounds.bottom += margin
  if (record.index === 1 && progress < 1) {
    bounds.left = Math.floor(bounds.left / 16) * 16
    bounds.top = Math.floor(bounds.top / 16) * 16
    bounds.right = Math.ceil(bounds.right / 16) * 16
    bounds.bottom = Math.ceil(bounds.bottom / 16) * 16
  }

  // Grow through an entrance instead of reallocating a different size every
  // frame. Once settled, use the tight final bounds for maximum detail.
  if (record.index === 1 && progress < 1 && record.cropBounds) {
    include(bounds, record.cropBounds.left, record.cropBounds.top)
    include(bounds, record.cropBounds.right, record.cropBounds.bottom)
  }
  record.cropBounds = { ...bounds }
  const area = (bounds.right - bounds.left) * (bounds.bottom - bounds.top)
  const sourceRatio = record.image.naturalWidth / box.imageWidth || MAX_DPR
  let ratio = Math.min(Number(deviceRatio) || 1, MAX_DPR, sourceRatio,
    Math.sqrt((MAX_SWIM_PIXELS - 8192) / area))
  let left, top, right, bottom
  do {
    left = Math.floor(bounds.left * ratio)
    top = Math.floor(bounds.top * ratio)
    right = Math.ceil(bounds.right * ratio)
    bottom = Math.ceil(bounds.bottom * ratio)
    if ((right - left) * (bottom - top) <= MAX_SWIM_PIXELS) break
    ratio *= .999
  } while (ratio > .01)
  return {
    originX: left / ratio, originY: top / ratio,
    width: (right - left) / ratio, height: (bottom - top) / ratio,
    bufferWidth: right - left, bufferHeight: bottom - top, ratio,
  }
}
