export const PREVIEW_SPLIT_KEY = 'studio-schatzi.preview-split.v1'
export const MIN_EDITOR_WIDTH = 360
export const MIN_PREVIEW_WIDTH = 320

export function readSplitRatio(value: string | null): number {
  const ratio = value === null || value.trim() === '' ? NaN : Number(value)
  return Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : 0.5
}

export function splitWidth(width: number, ratio: number): number {
  if (width < MIN_EDITOR_WIDTH + MIN_PREVIEW_WIDTH) return width / 2
  return Math.max(MIN_EDITOR_WIDTH, Math.min(width - MIN_PREVIEW_WIDTH, width * ratio))
}
