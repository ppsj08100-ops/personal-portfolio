/** Anatomical fin motion; all positions and envelopes use source-image CSS pixels. */
export const APPROACH_SWIM_VERTEX = `
precision highp float;
attribute vec2 a_uv;
uniform vec2 u_size, u_canvas, u_origin, u_offset, u_head;
uniform float u_time, u_kind, u_entity, u_turn, u_progress;
varying vec2 v_uv;
const float TAU = 6.28318530718;

float area(vec2 uv, vec4 bounds, float feather) {
  return smoothstep(bounds.x, bounds.x + feather, uv.x)
    * (1.0 - smoothstep(bounds.z - feather, bounds.z, uv.x))
    * smoothstep(bounds.y, bounds.y + feather, uv.y)
    * (1.0 - smoothstep(bounds.w - feather, bounds.w, uv.y));
}
float softCycle(float value) {
  float t = clamp(value, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
float powerStroke(float phase) {
  // A quicker push and a slower recovery, with zero velocity at both reversals.
  float cycle = fract(phase / TAU);
  if (cycle < .37) return mix(-.75, 1.0, softCycle(cycle / .37));
  return mix(1.0, -.75, softCycle((cycle - .37) / .63));
}
vec2 hinge(vec2 p, vec2 anchor, float angle) {
  vec2 d = p - anchor * u_size;
  float c = cos(angle), s = sin(angle);
  return mat2(c, s, -s, c) * d - d;
}
float limb(vec2 p, vec2 anchor, vec2 tip, float halfWidth) {
  vec2 base = anchor * u_size;
  vec2 axis = (tip - anchor) * u_size;
  float span = max(length(axis), .001);
  vec2 tangent = axis / span;
  float along = dot(p - base, tangent) / span;
  float across = abs(dot(p - base, vec2(-tangent.y, tangent.x)));
  float width = halfWidth * u_size.x * mix(.86, .64, softCycle(along));
  return smoothstep(.08, .65, along) * (1.0 - smoothstep(1.04, 1.18, along))
    * (1.0 - smoothstep(width * .65, width, across));
}

void main() {
  v_uv = a_uv;
  vec2 uv = a_uv, p = uv * u_size, bend = vec2(0.0);
  float strength = clamp(u_size.x / 500.0, .55, 1.0);
  bool fish = u_kind > .5 && u_kind < 1.5;
  // The added entry phase eases to a constant at q=1: no pose or speed jump.
  float entryPhase = softCycle(max(0.0, u_progress)) * TAU * .35;

  if (u_kind < .5) {
    float phase = u_time * TAU / 3.6 + entryPhase;
    float nearFin = limb(p, vec2(.64, .50), vec2(.43, .94), .16)
      * area(uv, vec4(.35, .50, .75, .995), .025) * smoothstep(.51, .62, uv.y);
    float farFin = limb(p, vec2(.77, .46), vec2(.92, .70), .09)
      * area(uv, vec4(.70, .42, .98, .79), .025) * smoothstep(.46, .57, uv.y);
    float rearFin = limb(p, vec2(.25, .54), vec2(.045, .66), .08)
      * area(uv, vec4(.012, .50, .29, .74), .022) * smoothstep(.54, .64, uv.y);
    float rearFar = limb(p, vec2(.33, .61), vec2(.18, .76), .065)
      * area(uv, vec4(.13, .57, .38, .82), .022) * smoothstep(.61, .70, uv.y);

    bend += hinge(p, vec2(.64, .50), powerStroke(phase) * .145) * nearFin;
    bend += hinge(p, vec2(.77, .46), powerStroke(phase - .62) * .135) * farFin;
    bend += hinge(p, vec2(.25, .54), powerStroke(phase + 1.25) * .055) * rearFin;
    bend += hinge(p, vec2(.33, .61), powerStroke(phase + .75) * -.052) * rearFar;

    // Pin the engraved shell and face; only the articulated appendages move.
    float shellFree = smoothstep(.92, 1.06, length((uv - vec2(.42, .35)) / vec2(.34, .29)));
    float headFree = smoothstep(.85, 1.08, length((uv - vec2(.88, .20)) / vec2(.13, .17)));
    bend *= shellFree * headFree;
    bend *= min(1.0, 24.0 / max(length(bend), .001));
  } else if (fish) {
    // Keep the existing independent fish-tail motion and rigid head regions.
    float whiteTail = area(uv, vec4(.06, .11, .59, .52), .025) * smoothstep(.36, .555, uv.x);
    float blueTail = area(uv, vec4(.47, .33, .97, .64), .025) * smoothstep(.73, .955, uv.x);
    float smallTail = area(uv, vec4(.32, .62, .705, .905), .025) * smoothstep(.50, .69, uv.x);
    float whiteWave = sin(u_time * TAU / 3.8 - (uv.x - .36) * 7.0);
    float blueWave = sin(u_time * TAU / 3.3 + 1.7 - (uv.x - .73) * 7.0);
    float smallWave = sin(u_time * TAU / 4.2 + 3.1 - (uv.x - .50) * 8.0);
    float whiteFin = area(uv, vec4(.17, .14, .48, .53), .03) * smoothstep(.20, .31, uv.x)
      * (smoothstep(.37, .49, uv.y) + 1.0 - smoothstep(.19, .26, uv.y));
    float blueFin = area(uv, vec4(.58, .34, .86, .64), .03) * smoothstep(.54, .62, uv.y);
    float smallFin = area(uv, vec4(.39, .67, .59, .89), .025) * smoothstep(.80, .88, uv.y);
    if (u_entity < .5) {
      bend.y = whiteTail * whiteWave * 5.8 + whiteFin * sin(u_time * TAU / 3.8 + .8) * 1.1;
      bend.x = whiteTail * cos(u_time * TAU / 3.8) * .65;
    } else if (u_entity < 1.5) {
      bend.y = blueTail * blueWave * 5.2 + blueFin * sin(u_time * TAU / 3.3 + 2.2) * 1.0;
      bend.x = blueTail * cos(u_time * TAU / 3.3 + 1.7) * .65;
    } else {
      bend.y = smallTail * smallWave * 4.8 + smallFin * sin(u_time * TAU / 4.2 + 3.7) * .9;
      bend.x = smallTail * cos(u_time * TAU / 4.2 + 3.1) * .65;
    }
    bend *= min(1.0, 8.0 / max(length(bend), .001)) * strength;
  } else {
    float phase = u_time * TAU / 4.6 + entryPhase;
    vec2 spineStart = vec2(.61, .30) * u_size;
    vec2 spineAxis = (vec2(.37, .76) - vec2(.61, .30)) * u_size;
    float spineLength = max(length(spineAxis), .001);
    vec2 tangent = spineAxis / spineLength;
    vec2 outward = vec2(-tangent.y, tangent.x);
    float along = clamp(dot(p - spineStart, tangent) / spineLength, 0.0, 1.0);
    float across = dot(p - spineStart, outward);
    float leftSpan = clamp(across / max(1.0, u_size.x * .38), 0.0, 1.0);
    float rightSpan = clamp(-across / max(1.0, u_size.x * .23), 0.0, 1.0);
    float leftWing = smoothstep(.11, .94, leftSpan);
    float rightWing = smoothstep(.15, .96, rightSpan);
    float headFree = smoothstep(.68, 1.18, length((uv - vec2(.61, .30)) / vec2(.15, .16)));
    float wingGate = headFree * (1.0 - smoothstep(.72, .82, uv.y));
    leftWing *= wingGate;
    rightWing *= wingGate;

    float leftStroke = powerStroke(phase - leftSpan * 1.15 - along * .45);
    float rightStroke = powerStroke(phase - .58 - rightSpan * 1.15 - along * .45);
    float amplitude = clamp(u_size.x * .045, 9.0, 24.0);
    bend.y += amplitude * (leftWing * leftStroke + rightWing * rightStroke * .85);
    bend += outward * amplitude * .14 * (leftWing * leftStroke - rightWing * rightStroke * .85);
    float tail = smoothstep(.76, .96, uv.y) * (1.0 - smoothstep(.35, .50, uv.x));
    bend.x += tail * sin(phase * .86 - uv.y * 4.8) * clamp(u_size.x * .008, 2.0, 4.5);
    bend.y += tail * sin(phase * .86 - uv.y * 4.8 + .5) * 1.2;
    bend *= min(1.0, 24.0 / max(length(bend), .001));
  }

  float angle = sin(u_time * TAU / 10.8 + u_kind * .8) * .004363323;
  float c = cos(angle), s = sin(angle);
  vec2 center = u_size * .5;
  vec2 rotated = mat2(c, s, -s, c) * (p - center) + center;
  vec2 glide = vec2(sin(u_time * TAU / 9.8 + u_kind) * 3.0,
    sin(u_time * TAU / 11.0 + u_kind * .7) * 1.0) * strength;
  vec2 displacement = rotated - p + bend + glide;
  float envelope = fish ? 12.0 : 28.0;
  displacement *= min(1.0, envelope / max(length(displacement), .001));
  vec2 animated = p + displacement;
  if (fish) {
    float c2 = cos(u_turn), s2 = sin(u_turn);
    vec2 pivot = u_head * u_size;
    animated = mat2(c2, s2, -s2, c2) * (animated - pivot) + pivot + u_offset;
  }
  vec2 clip = ((animated - u_origin) / u_canvas) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`
