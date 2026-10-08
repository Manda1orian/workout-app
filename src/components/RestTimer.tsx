import { useEffect, useRef, useState } from 'react'
import { beep, tick, vibrate } from '../lib/alert'
import { formatSeconds } from '../lib/date'

interface Props {
  seconds: number
  nextLabel: string
  sound: boolean
  vibrateOn: boolean
  onDone: () => void
  onSkip: () => void
}

export function RestTimer({ seconds, nextLabel, sound, vibrateOn, onDone, onSkip }: Props) {
  const [total, setTotal] = useState(seconds)
  const [left, setLeft] = useState(seconds)
  const endAt = useRef(Date.now() + seconds * 1000)
  const finished = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const iv = setInterval(() => {
      const remain = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(remain)
      if (remain > 0 && remain <= 3 && sound) tick()
      if (remain === 0 && !finished.current) {
        finished.current = true
        if (sound) beep(3)
        if (vibrateOn) vibrate([300, 150, 300, 150, 500])
        clearInterval(iv)
        setTimeout(() => onDoneRef.current(), 900)
      }
    }, 250)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const add = (n: number) => {
    endAt.current += n * 1000
    setTotal((t) => t + n)
  }

  const r = 120
  const circ = 2 * Math.PI * r
  const ratio = total > 0 ? left / total : 0

  return (
    <div className="overlay">
      <div className="muted" style={{ fontWeight: 700 }}>휴식</div>
      <div className="timer-ring">
        <svg viewBox="0 0 260 260">
          <circle className="bg" cx="130" cy="130" r={r} />
          <circle className="fg" cx="130" cy="130" r={r} strokeDasharray={circ} strokeDashoffset={circ * (1 - ratio)} />
        </svg>
        <div className={`timer-num ${left === 0 ? 'done' : ''}`}>{left === 0 ? '✓' : formatSeconds(left)}</div>
      </div>
      <div className="timer-next">다음: {nextLabel}</div>
      <div className="row">
        <button className="btn" onClick={() => add(30)}>+30초</button>
        <button className="btn primary" onClick={onSkip}>건너뛰기</button>
      </div>
    </div>
  )
}
