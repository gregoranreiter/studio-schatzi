import {navigate} from 'astro:transitions/client'
import {PREVIEW_CHANNEL, isPreviewMessage, isTrustedPreviewEvent, studioOrigins} from '../lib/preview/protocol'
import {isPreviewPayload} from '../lib/preview/request'
import {preservePreviewScroll} from '../lib/preview/scroll'

// The CMS alone chooses the document. Nothing inside this frame changes its URL.
const previewUrl = location.href
let parentOrigin = ''
let session = ''
let pending = ''
let rendered = ''
let rendering = false
let timer: ReturnType<typeof setTimeout>
const abort = new AbortController()
const options = {capture: true, signal: abort.signal}
const send = (type: string) => {
  if (parentOrigin) window.parent.postMessage({channel: PREVIEW_CHANNEL, type, session}, parentOrigin)
}

function lock(event: Event) {
  const target = event.target instanceof Element ? event.target : null
  if (event.type === 'submit' || target?.closest('a, button, input, select, textarea, [role="button"]')) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}
for (const name of ['click', 'auxclick', 'contextmenu', 'dragstart', 'submit']) window.addEventListener(name, lock, options)
window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') lock(event)
}, options)
function lockFocus() {
  for (const element of document.querySelectorAll<HTMLElement>('a, button, input, select, textarea, [tabindex]')) {
    element.tabIndex = -1
    if (element.matches('a, button, input, select, textarea')) element.setAttribute('aria-disabled', 'true')
  }
}
// Astro owns markup, assets and script lifecycle. No field selectors or templates.
async function render() {
  if (rendering || !pending || pending === rendered) return
  const payload = pending
  rendering = true
  try {
    const form = document.createElement('form')
    form.setAttribute('enctype', 'application/x-www-form-urlencoded')
    const formData = new FormData()
    formData.set('payload', payload)
    await navigate(previewUrl, {history: 'replace', formData, sourceElement: form})
    if (!document.documentElement.hasAttribute('data-cms-preview')) throw new Error('Invalid preview response')
    rendered = payload
    send('rendered')
  } catch {send('error')}
  finally {rendering = false}
  if (pending !== payload) void render()
}

function receive(event: MessageEvent) {
  if (!isTrustedPreviewEvent(event, window.parent, studioOrigins) || !isPreviewMessage(event.data)) return
  const message = event.data
  if (message.type === 'connect') {
    parentOrigin = event.origin
    session = message.session
    send('ready')
  } else if (message.type === 'content' && message.session === session && event.origin === parentOrigin) {
    const payload = {content: message.content, slug: message.slug}
    if (!isPreviewPayload(payload)) {send('error'); return}
    const next = JSON.stringify(payload)
    if (next === pending) return
    pending = next
    clearTimeout(timer)
    timer = setTimeout(render, 180)
  }
}
const cleanupScroll = preservePreviewScroll()
lockFocus()
window.addEventListener('message', receive, {signal: abort.signal})
document.addEventListener('astro:after-swap', lockFocus, {signal: abort.signal})
import.meta.hot?.dispose(() => {abort.abort(); clearTimeout(timer); cleanupScroll()})
