import type {PreviewContent} from './content'

export const MAX_PREVIEW_BYTES = 2_000_000
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 100_000
const list = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.length <= 300 && value.every(check)
const optional = (value: unknown, check: (item: unknown) => boolean) => value === undefined || check(value)
const dimension = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100_000
const imageUrl = (value: unknown) => typeof value === 'string' && (
  /^https:\/\/cdn\.sanity\.io\/images\/[\w./?=&%,()-]+$/.test(value) || /^\/(?!\/)[\w./%-]+$/.test(value) ||
  value === 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
)
const image = (value: unknown): boolean => record(value) && imageUrl(value.src) && text(value.alt) &&
  optional(value.width, dimension) && optional(value.height, dimension) &&
  optional(value.srcset, (srcset) => typeof srcset === 'string' && srcset.split(', ').length <= 20 && srcset.split(', ').every((entry) => {
    const [url, size, extra] = entry.split(' ')
    return imageUrl(url) && /^\d+w$/.test(size) && !extra
  })) && optional(value.format, (format) => ['wide', 'half', 'portrait'].includes(String(format)))
const project = (value: unknown): boolean => record(value) &&
  ['slug', 'title', 'summary', 'description'].every((key) => text(value[key])) &&
  optional(value.shortTitle, text) && list(value.scope, text) && list(value.related, text) &&
  image(value.cover) && list(value.gallery, image) && typeof value.tone === 'string' && /^#[\da-f]{6}$/i.test(value.tone) &&
  optional(value.coverVisibleHeight, dimension) && optional(value.cardImage, (card) => record(card) &&
    typeof card.aspectRatio === 'string' && /^\d+(?:\.\d+)? \/ \d+(?:\.\d+)?$/.test(card.aspectRatio) &&
    typeof card.position === 'string' && /^(center|\d+(?:\.\d+)?% \d+(?:\.\d+)?%)$/.test(card.position))

export function isPreviewPayload(value: unknown): value is {content: PreviewContent; slug: string} {
  return record(value) && text(value.slug) && record(value.content) && record(value.content.home) &&
    text(value.content.home.headline) && list(value.content.projects, project) &&
    list(value.content.home.projects, (entry) => record(entry) && project(entry.project) && ['full', 'left', 'right'].includes(String(entry.placement)))
}

// Bound the actual streamed body, including requests without Content-Length.
export async function readPreviewPayload(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new Error('Unsupported body')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Missing body')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const {value, done} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_PREVIEW_BYTES) {await reader.cancel(); throw new Error('Body too large')}
      chunks.push(value)
    }
  } finally {reader.releaseLock()}
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength}
  const payload: unknown = JSON.parse(new URLSearchParams(new TextDecoder().decode(bytes)).get('payload') || '')
  if (!isPreviewPayload(payload)) throw new Error('Invalid preview content')
  return payload
}
