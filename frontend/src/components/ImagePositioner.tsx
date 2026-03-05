import { useRef, useState, useCallback, useEffect } from 'react'

interface ImagePositionerProps {
  imageUrl: string | null
  position: string
  onPositionChange: (position: string) => void
  onImageSelect: (file: File) => void
  onImageRemove: () => void
  uploading?: boolean
  height?: number
}

export function ImagePositioner({
  imageUrl,
  position,
  onPositionChange,
  onImageSelect,
  onImageRemove,
  uploading = false,
  height = 300,
}: ImagePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 50, y: 50 })
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const displayUrl = localPreview || imageUrl

  const [posX, posY] = position.split(' ').map(Number)
  const currentX = isNaN(posX) ? 50 : posX
  const currentY = isNaN(posY) ? 50 : posY

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (localPreview) URL.revokeObjectURL(localPreview)

    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    onPositionChange('50 50')
    onImageSelect(file)
  }

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const handleImageLoad = () => {
    if (imgRef.current) {
      setNaturalSize({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      })
    }
  }

  const handleImageError = () => {
    if (localPreview && imgRef.current && imgRef.current.src !== localPreview) {
      imgRef.current.src = localPreview
    }
  }

  const canDrag = useCallback(() => {
    if (!containerRef.current || !naturalSize.w || !naturalSize.h) return { x: false, y: false }
    const rect = containerRef.current.getBoundingClientRect()
    const containerAspect = rect.width / height
    const imageAspect = naturalSize.w / naturalSize.h
    return {
      x: imageAspect > containerAspect,
      y: imageAspect < containerAspect,
    }
  }, [naturalSize, height])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!displayUrl) return
    const drag = canDrag()
    if (!drag.x && !drag.y) return

    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setStartPos({ x: currentX, y: currentY })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const drag = canDrag()

    let newX = currentX
    let newY = currentY

    if (drag.x) {
      const deltaX = e.clientX - dragStart.x
      const pctDelta = (deltaX / rect.width) * 100
      newX = Math.max(0, Math.min(100, startPos.x - pctDelta))
    }

    if (drag.y) {
      const deltaY = e.clientY - dragStart.y
      const pctDelta = (deltaY / rect.height) * 100
      newY = Math.max(0, Math.min(100, startPos.y - pctDelta))
    }

    onPositionChange(`${Math.round(newX)} ${Math.round(newY)}`)
  }

  const handlePointerUp = () => {
    setDragging(false)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
    onImageRemove()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="label">Превью-изображение</label>

      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border-2 border-dashed border-border transition-colors"
        style={{
          height: `${height}px`,
          cursor: displayUrl
            ? dragging
              ? 'grabbing'
              : 'grab'
            : 'pointer',
          borderStyle: displayUrl ? 'solid' : 'dashed',
          borderColor: displayUrl ? 'transparent' : undefined,
        }}
        onClick={() => !displayUrl && fileInputRef.current?.click()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {displayUrl ? (
          <>
            <img
              ref={imgRef}
              src={displayUrl}
              alt="Preview"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="absolute inset-0 w-full h-full select-none"
              style={{
                objectFit: 'cover',
                objectPosition: `${currentX}% ${currentY}%`,
              }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

            {(canDrag().x || canDrag().y) && !dragging && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm">
                Перетащите для позиционирования
              </div>
            )}

            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
              title="Удалить изображение"
            >
              ×
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm"
            >
              Заменить
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            {uploading ? (
              <span className="text-sm">Загрузка...</span>
            ) : (
              <>
                <svg
                  className="w-10 h-10 opacity-40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">Нажмите, чтобы загрузить превью</span>
                <span className="text-xs opacity-60">JPG, PNG, GIF, WebP (до 10 МБ)</span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
