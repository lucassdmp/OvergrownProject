import { useEffect, useRef } from 'react'

/** Runs the current page export when the user presses Ctrl+S (or Cmd+S). */
export function useSaveShortcut(onSave: () => void) {
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        (event.key.toLowerCase() === 's' || event.code === 'KeyS')

      if (!isSaveShortcut) return

      event.preventDefault()
      event.stopImmediatePropagation()
      event.returnValue = false

      if (event.repeat) return
      onSaveRef.current()
    }

    // Capture the event before the browser/page bubble handlers can invoke Save Page.
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])
}
