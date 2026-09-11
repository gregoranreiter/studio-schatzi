export const DEVICE_PRESETS = {
  mobile: {label: 'Mobil', width: 390},
  tablet: {label: 'Tablet', width: 768},
  desktop: {label: 'Desktop', width: 1280},
} as const
export type PreviewMode = 'auto' | keyof typeof DEVICE_PRESETS

// Frame chrome lives outside the scaled iframe, so the simulated CSS width
// remains fixed while the editor/preview divider changes its display scale.
export function previewViewport(mode: PreviewMode, stage: {width: number; height: number}) {
  const device = mode !== 'auto'
  const inset = device ? 16 : 0
  const top = device ? 44 : 0
  const border = device ? 1 : 0
  const width = device ? DEVICE_PRESETS[mode].width : Math.max(1, stage.width)
  const available = Math.max(1, stage.width - inset * 2 - border * 2)
  const scale = device ? Math.min(1, available / width) : 1
  const height = Math.max(1, (stage.height - top - inset - border * 2) / scale)
  const frameWidth = width * scale + border * 2
  return {width, height, scale, frameWidth, frameHeight: height * scale + border * 2, top, left: Math.max(0, (stage.width - frameWidth) / 2)}
}
