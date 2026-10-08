let ctx: AudioContext | null = null

/** iOS는 사용자 제스처 안에서 오디오 컨텍스트를 깨워야 함 */
export function primeAudio() {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    // 무음 버퍼 재생으로 잠금 해제
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    /* ignore */
  }
}

export function beep(times = 3) {
  if (!ctx) return
  try {
    const now = ctx.currentTime
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, now + i * 0.25)
      gain.gain.exponentialRampToValueAtTime(0.5, now + i * 0.25 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.25 + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.25)
      osc.stop(now + i * 0.25 + 0.22)
    }
  } catch {
    /* ignore */
  }
}

export function tick() {
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.1)
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}
