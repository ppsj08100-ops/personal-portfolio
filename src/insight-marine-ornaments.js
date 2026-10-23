const TAU = Math.PI * 2
const SILVER_RATIO = 2109 / 746
const JELLY_RATIO = 1024 / 1536

// An uneven diagonal school crosses the open water behind the wreck. Smaller,
// quieter fish trail the broad middle; spacing leaves each silver outline clear.
const PASSING_SCHOOL = [
  { x: -278, y: -24, width: 22, opacity: .48, phase: .3 },
  { x: -236, y: -48, width: 26, opacity: .56, phase: .85 },
  { x: -213, y: 4, width: 20, opacity: .46, phase: 1.4, desktopOnly: true },
  { x: -180, y: -29, width: 30, opacity: .65, phase: 2.15 },
  { x: -154, y: 19, width: 24, opacity: .53, phase: 2.7 },
  { x: -126, y: -11, width: 33, opacity: .70, phase: 3.4 },
  { x: -96, y: 32, width: 23, opacity: .48, phase: 4.1, desktopOnly: true },
  { x: -65, y: 2, width: 28, opacity: .59, phase: 4.65 },
  { x: -36, y: 43, width: 36, opacity: .75, phase: 5.4 },
  { x: -6, y: 18, width: 29, opacity: .63, phase: 6.1 },
  { x: 28, y: 54, width: 25, opacity: .57, phase: 6.8, desktopOnly: true },
  { x: 62, y: 30, width: 34, opacity: .72, phase: 7.35 },
  { x: 98, y: 58, width: 27, opacity: .63, phase: 8.1 },
  { x: 135, y: 38, width: 31, opacity: .66, phase: 8.7, desktopOnly: true },
  { x: 169, y: 71, width: 22, opacity: .48, phase: 9.4 },
  { x: 202, y: 50, width: 28, opacity: .60, phase: 10.15, desktopOnly: true },
  { x: 236, y: 76, width: 24, opacity: .53, phase: 10.8 },
  { x: 269, y: 59, width: 21, opacity: .46, phase: 11.5 },
]

export function getSilverSchoolPoses(time = 0, mobile = false, ratios) {
  const artWidth = mobile ? 941 : 1672
  const cruise = mobile ? 8.7 : 10.2
  const margin = 140
  const travel = artWidth + margin * 2
  const arc = time * cruise / travel * TAU
  const currentHeight = mobile ? 24 : 20
  const currentY = Math.sin(arc) * currentHeight
  const velocityY = Math.cos(arc) * currentHeight * TAU * cruise / travel
  const ratio = ratios?.[3] || SILVER_RATIO
  const spacingX = mobile ? .73 : 1
  const spacingY = mobile ? 1.2 : 1
  return PASSING_SCHOOL.flatMap((fish, index) => {
    if (mobile && fish.desktopOnly) return []
    const initialX = (mobile ? 470 : 780) + fish.x * spacingX
    const progress = (initialX + margin + time * cruise) / travel
    const wrapped = ((progress % 1) + 1) % 1
    const frequency = TAU / (21 + index % 5 * 2.7)
    const phase = time * frequency + fish.phase
    const dx = cruise + Math.cos(phase) * 2.8 * frequency
    const dy = velocityY + Math.cos(phase + .65) * 3.6 * frequency
    const width = mobile ? Math.max(24, fish.width * 1.1) : fish.width
    return [{
      id: `silver-passing-${index}`, zone: 'passing-silver-school',
      x: -margin + wrapped * travel + Math.sin(phase) * 2.8,
      y: (mobile ? 610 : 260) + fish.y * spacingY + currentY + Math.sin(phase + .65) * 3.6,
      width, height: width / ratio,
      texture: 3, kind: 1, hinge: .2, direction: 1, behindWreck: true,
      angle: Math.atan2(dy, dx), phase: fish.phase,
      opacity: fish.opacity, speed: 3.05 + index % 4 * .16, sway: .052 + index % 3 * .004,
    }]
  })
}

// Each jelly follows one slow diagonal current. The offsets reverse softly at
// their limits, without an orbital path, a reset or a change in visibility.
const JELLIES = {
  desktop: [
    { id: 'jelly-distant', x: 1105, y: 130, height: 95, dx: 20, dy: 24,
      duration: 43, phase: 2.2, opacity: .43, speed: .59, sway: .028 },
    { id: 'jelly-under-light', x: 520, y: 255, height: 75, dx: 18, dy: 18,
      duration: 31, phase: 4.6, opacity: .38, speed: .65, sway: .03 },
  ],
  mobile: [
    { id: 'jelly-under-light', x: 200, y: 430, height: 125, dx: 18, dy: 23,
      duration: 33, phase: 3.1, opacity: .43, speed: .61, sway: .028 },
  ],
}

// An uneven, shallow arc makes a small distant school. The portrait scene keeps
// five members and narrower spacing, leaving the surrounding animals room.
const SCHOOL = [
  { x: -72, y: 10, width: 19, opacity: .29, phase: .2 },
  { x: -48, y: -5, width: 14, opacity: .25, phase: .85 },
  { x: -25, y: -15, width: 22, opacity: .42, phase: 1.65 },
  { x: 2, y: -20, width: 16, opacity: .33, phase: 2.5 },
  { x: 25, y: -12, width: 24, opacity: .38, phase: 3.4 },
  { x: 51, y: 3, width: 17, opacity: .3, phase: 4.45 },
  { x: 76, y: 14, width: 13, opacity: .26, phase: 5.3 },
]

function jellyPoses(time, mobile, ratio) {
  return JELLIES[mobile ? 'mobile' : 'desktop'].map(jelly => {
    const current = Math.sin(time * TAU / jelly.duration + jelly.phase)
    return {
      id: jelly.id, zone: 'open-water-ornament',
      x: jelly.x + current * jelly.dx,
      y: jelly.y - current * jelly.dy,
      width: jelly.height * ratio, height: jelly.height,
      texture: 4, kind: 2, hinge: .39, direction: 1,
      angle: current * .025, phase: jelly.phase,
      opacity: jelly.opacity, speed: jelly.speed, sway: jelly.sway,
    }
  })
}

function schoolPoses(time, mobile, ratio) {
  const horizontal = time * TAU / 158 + .5
  const vertical = time * TAU / 191 + 1.1
  const driftX = mobile ? 66 : 130, driftY = mobile ? 28 : 25
  const centerX = (mobile ? 435 : 800) + Math.sin(horizontal) * driftX
  const centerY = (mobile ? 710 : 250) + Math.sin(vertical) * driftY
  const velocityX = Math.cos(horizontal) * driftX * TAU / 158
  const velocityY = Math.cos(vertical) * driftY * TAU / 191
  const spacing = mobile ? .68 : 1

  return SCHOOL.slice(0, mobile ? 5 : 7).map((fish, index) => {
    const frequency = TAU / (25 + index * 2.6)
    const phase = time * frequency + fish.phase
    const dx = velocityX + Math.cos(phase) * 2.6 * frequency
    const dy = velocityY + Math.cos(phase + .7) * 2.1 * frequency
    // Individual headings turn a little apart while the school remains close.
    // A fixed velocity scale keeps yaw steady even at a near-stationary turn.
    const direction = Math.tanh(dx / (mobile ? 1.1 : 1.8) * 1.75)
    const width = fish.width * (mobile ? .92 : 1)
    return {
      id: `distant-school-${index}`, zone: 'open-water-school',
      x: centerX + fish.x * spacing + Math.sin(phase) * 2.6,
      y: centerY + fish.y * spacing + Math.sin(phase + .7) * 2.1,
      width, height: width / ratio,
      texture: 3, kind: 1, hinge: .2, direction,
      angle: Math.tanh(dy / (mobile ? .9 : 1.2)) * direction * .13,
      phase: fish.phase + index * 1.6,
      opacity: fish.opacity, speed: 3.05 + index % 3 * .17, sway: .045,
    }
  })
}

// Additional native-artwork poses only; existing fish and mermaid routes stay
// owned by the marine-life module. Loaded sprite ratios can be passed directly.
export function getMarineOrnaments(time = 0, mobile = false, ratios) {
  const jellyRatio = ratios?.[4] || JELLY_RATIO
  const silverRatio = ratios?.[3] || SILVER_RATIO
  return [
    ...getSilverSchoolPoses(time, mobile, ratios),
    ...jellyPoses(time, mobile, jellyRatio),
    ...schoolPoses(time, mobile, silverRatio),
  ]
}
