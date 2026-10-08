export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} aria-label="감소">−</button>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        value={Number.isNaN(value) ? '' : value}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          onChange(Number.isNaN(v) ? NaN : Math.max(min, v))
        }}
      />
      <button onClick={() => onChange((Number.isNaN(value) ? 0 : value) + 1)} aria-label="증가">+</button>
    </div>
  )
}
