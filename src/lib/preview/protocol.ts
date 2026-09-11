export const PREVIEW_CHANNEL = 'studio-schatzi-preview-v1'
export const studioOrigins = [
  'http://127.0.0.1:3333', 'http://localhost:3333',
  'https://studio-schatzi-cms.fragrant-buffer.workers.dev',
  'https://cms.studioschatzi.at',
]

export function isPreviewMessage(value: unknown): value is {channel: string; type: string; session: string; [key: string]: unknown} {
  if (!value || typeof value !== 'object') return false
  const message = value as Record<string, unknown>
  return message.channel === PREVIEW_CHANNEL && typeof message.type === 'string' && typeof message.session === 'string'
}

export function isTrustedPreviewEvent(event: {source: unknown; origin: string; data: unknown}, source: unknown, origins: readonly string[]) {
  return event.source === source && origins.includes(event.origin) && isPreviewMessage(event.data)
}
