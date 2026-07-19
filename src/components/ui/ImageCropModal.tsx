import Modal from './Modal'

interface Props {
  title: string
  base64: string
  x: number
  y: number
  scale: number
  circular?: boolean
  onX: (value: number) => void
  onY: (value: number) => void
  onScale: (value: number) => void
  onApply: () => void
  onClose: () => void
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function ImageCropModal({
  title,
  base64,
  x,
  y,
  scale,
  circular = false,
  onX,
  onY,
  onScale,
  onApply,
  onClose,
}: Props) {
  return (
    <Modal title={title} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div
          className={`mx-auto h-60 w-60 overflow-hidden border-2 border-gray-600 bg-gray-950 ${circular ? 'rounded-full' : 'rounded-xl'}`}
        >
          <img
            src={base64}
            alt="Prévia do recorte"
            className="h-full w-full object-cover"
            style={{
              objectPosition: `${x}% ${y}%`,
              transformOrigin: `${x}% ${y}%`,
              transform: `scale(${scale})`,
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <CropRange label="Posição horizontal" value={x} min={0} max={100} onChange={onX} />
          <CropRange label="Posição vertical" value={y} min={0} max={100} onChange={onY} />
          <CropRange
            label="Zoom"
            value={scale}
            min={0.5}
            max={2.5}
            step={0.05}
            suffix="×"
            onChange={onScale}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-amber-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-600"
          >
            Aplicar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CropRange({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '%',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  const shownValue = step < 1 ? value.toFixed(2) : Math.round(value)
  return (
    <label className="text-xs text-gray-500 dark:text-gray-400">
      {label}: {shownValue}
      {suffix}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="mt-1 w-full accent-amber-700"
      />
    </label>
  )
}
