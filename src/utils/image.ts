const DEFAULT_MAX_DIMENSION = 384
const DEFAULT_SIZE_THRESHOLD = 180 * 1024
const DEFAULT_QUALITY = 0.84

/**
 * Shrinks uploaded artwork before it is embedded in a character/tree JSON file.
 * WebP keeps node artwork crisp while avoiding multi-megabyte save files.
 */
export function optimizeEmbeddedImage(
  base64: string,
  maxDimension = DEFAULT_MAX_DIMENSION,
  sizeThreshold = DEFAULT_SIZE_THRESHOLD,
): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const approximateBytes = (base64.length * 3) / 4
      const needsResize = Math.max(image.width, image.height) > maxDimension
      if (!needsResize && approximateBytes <= sizeThreshold) {
        resolve(base64)
        return
      }

      const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * ratio))
      canvas.height = Math.max(1, Math.round(image.height * ratio))
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(base64)
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/webp', DEFAULT_QUALITY))
    }
    image.onerror = () => resolve(base64)
    image.src = base64
  })
}
