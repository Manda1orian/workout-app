import { useRef } from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
}

/**
 * 횟수 입력. −/+ 탭으로 1씩, 꾹 누르면 연속 증감(점점 빨라짐).
 * 숫자를 탭하면 키패드로 직접 입력.
 */
export function Stepper({ value, onChange, min = 0 }: Props) {
  const valueRef = useRef(value)
  valueRef.current = value
  const timer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const step = (d: number) => {
    const cur = Number.isNaN(valueRef.current) ? 0 : valueRef.current
    const next = Math.max(min, cur + d)
    valueRef.current = next
    onChange(next)
  }

  const stop = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  const start = (d: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    inputRef.current?.blur()
    stop()
    step(d)
    let delay = 400
    let count = 0
    const loop = () => {
      step(d)
      count++
      // 점점 빨라짐: 400 → 120 → 60ms
      delay = count < 5 ? 160 : count < 15 ? 90 : 50
      timer.current = window.setTimeout(loop, delay)
    }
    timer.current = window.setTimeout(loop, delay)
  }

  const holdProps = (d: number) => ({
    onPointerDown: start(d),
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })

  return (
    <div className="stepper">
      <button type="button" {...holdProps(-1)} aria-label="감소">−</button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        value={Number.isNaN(value) ? '' : String(value)}
        placeholder="0"
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '')
          if (digits === '') {
            onChange(NaN)
            return
          }
          onChange(Math.max(min, parseInt(digits, 10)))
        }}
      />
      <button type="button" {...holdProps(1)} aria-label="증가">+</button>
    </div>
  )
}
