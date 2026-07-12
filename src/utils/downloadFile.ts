export function fileNamePart(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, '_')
  return normalized || fallback
}

export function downloadTextFile(contents: string, fileName: string, type = 'application/json') {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
