// Astro resets scroll during navigation. Restore immediately after its DOM swap,
// before the next paint, using the position from just before the swap (not fetch).
export function preservePreviewScroll(doc: Document = document, win: Window = window) {
  let position: {left: number; top: number} | undefined
  const capture = () => {position = {left: win.scrollX, top: win.scrollY}}
  const restore = () => {
    if (!position) return
    win.scrollTo({...position, behavior: 'instant'})
    position = undefined
  }
  doc.addEventListener('astro:before-swap', capture)
  doc.addEventListener('astro:after-swap', restore)
  return () => {
    doc.removeEventListener('astro:before-swap', capture)
    doc.removeEventListener('astro:after-swap', restore)
    position = undefined
  }
}
