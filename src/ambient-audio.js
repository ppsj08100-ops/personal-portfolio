// Quiet, local ambient sound. Nothing plays until the user enables SOUND.
export function createAmbientAudio() {
  let context
  let master
  let sources = []
  let enabled = false
  let disposed = false

  function prepare() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) throw new Error('Audio is unavailable')

    context = new AudioContextClass()
    master = context.createGain()
    master.gain.value = 0
    master.connect(context.destination)

    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1

    const noise = context.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const lowPass = context.createBiquadFilter()
    lowPass.type = 'lowpass'
    lowPass.frequency.value = 480
    const noiseGain = context.createGain()
    noiseGain.gain.value = 0.08
    noise.connect(lowPass).connect(noiseGain).connect(master)
    noise.start()
    sources.push(noise)

    // Soft sustained tones, kept well below the noise layer.
    for (const frequency of [130.81, 196]) {
      const tone = context.createOscillator()
      const toneGain = context.createGain()
      tone.type = 'sine'
      tone.frequency.value = frequency
      toneGain.gain.value = 0.018
      tone.connect(toneGain).connect(master)
      tone.start()
      sources.push(tone)
    }
  }

  async function setEnabled(next) {
    if (disposed) return false
    if (next && !context) prepare()
    if (!context) return false
    if (next) await context.resume()
    if (disposed) return false
    enabled = next
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(next ? 0.08 : 0, now, 0.15)
    return enabled
  }

  async function setVisible(visible) {
    if (!context || disposed) return
    if (visible && enabled) await context.resume()
    if (!visible) await context.suspend()
  }

  function dispose() {
    disposed = true
    enabled = false
    sources.forEach((source) => source.stop())
    sources = []
    context?.close().catch(() => {})
  }

  return { setEnabled, setVisible, dispose }
}
