import { useEffect, useState } from 'react'

interface IntegerInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
}

/**
 * Number input that keeps its own draft string while typing, so the field
 * can be cleared/retyped (e.g. "0" -> "" -> "12") without forcing a
 * leading zero like a plain controlled `<input type="number">` would.
 */
export default function IntegerInput({ value, onChange, min, max, className }: IntegerInputProps) {
  const [raw, setRaw] = useState(String(value))

  useEffect(() => {
    setRaw(String(value))
  }, [value])

  function clamp(n: number) {
    let result = n
    if (min != null) result = Math.max(min, result)
    if (max != null) result = Math.min(max, result)
    return result
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={raw}
      onChange={(e) => {
        const val = e.target.value
        setRaw(val)
        if (val === '' || val === '-') return
        const n = Number(val)
        if (!isNaN(n)) onChange(clamp(n))
      }}
      onBlur={() => {
        const n = Number(raw)
        const clamped = raw === '' || isNaN(n) ? (min ?? 0) : clamp(n)
        onChange(clamped)
        setRaw(String(clamped))
      }}
      className={className}
    />
  )
}
