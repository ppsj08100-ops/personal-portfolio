const KNOTS = [0, .28, .48, .64, .80, .864, 1]
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const DEFAULTS = {
  desktop: { s: [.625, .53], e: [.465, .405], w: [.39, .53] },
  mobile: { s: [.73, .51], e: [.455, .455], w: [.34, .51] },
}
const valid = point => Array.isArray(point) && point.length >= 2 && point.every(Number.isFinite)

/** Head landmarks: right/top → final S → middle E after L → W → flowing S → lower/left.
 * The supplied glyph anchors and returned coordinates are normalized.
 * Derivatives use global progress; the original opaque profile stays in front. */
export function sampleWorkDolphinPath(progress, mobile = false, anchors) {
  const p = clamp(progress), fallback = DEFAULTS[mobile ? 'mobile' : 'desktop']
  const s = valid(anchors?.s) ? anchors.s : fallback.s
  const e = valid(anchors?.e) ? anchors.e : fallback.e
  const w = valid(anchors?.w) ? anchors.w : fallback.w
  const points = [[1.18, -.12], [s[0] + .015, s[1] + .02],
    [e[0] + .010, e[1] - .020], [w[0] - .02, w[1] + .02],
    [w[0] - .08, w[1] + .19], [.16, .86], [-.30, 1.25]]
  // Horizontal arrival/departure at S and E rounds the upward hook. Adaptive
  // E/W handles retain leftward travel even when those glyphs sit close together.
  const gap = Math.max(.001, points[2][0] - points[3][0])
  const eSpeed = Math.min(.30, gap / .16), wSpeed = Math.min(.70, gap * 1.6 / .16)
  const velocities = [[-1.5, 2.1], [-1.3, 0], [-eSpeed, 0],
    [-wSpeed, wSpeed * .9 / .7], [-.7, 1.0], [-2.2, 1.7], [-3.5, 2.5]]
  let segment = 0
  while (segment < KNOTS.length - 2 && p > KNOTS[segment + 1]) segment++
  const span = KNOTS[segment + 1] - KNOTS[segment]
  const t = (p - KNOTS[segment]) / span, u = 1 - t
  const a = points[segment], d = points[segment + 1]
  const b = a.map((value, axis) => value + velocities[segment][axis] * span / 3)
  const c = d.map((value, axis) => value - velocities[segment + 1][axis] * span / 3)
  const result = { z: 1, dz: 0, orbit: clamp(p / .8), diving: clamp((p - .8) / .2),
    pathSegment: segment, impactX: .16, impactY: .86 }
  for (const [axis, key] of ['x', 'y'].entries()) {
    result[key] = u ** 3 * a[axis] + 3 * u * u * t * b[axis] + 3 * u * t * t * c[axis] + t ** 3 * d[axis]
    result[`d${key}`] = (3 * u * u * (b[axis] - a[axis]) + 6 * u * t * (c[axis] - b[axis]) + 3 * t * t * (d[axis] - c[axis])) / span
  }
  return result
}
