import assert from 'node:assert/strict'
import test from 'node:test'
import {preservePreviewScroll} from '../src/lib/preview/scroll.ts'

function environment() {
  const doc = new EventTarget()
  const calls = []
  const win = {scrollX: 0, scrollY: 0, scrollTo(options) {
    calls.push(options)
    this.scrollX = options.left
    this.scrollY = options.top
  }}
  const cleanup = preservePreviewScroll(doc, win)
  return {win, calls, cleanup, fire: (name) => doc.dispatchEvent(new Event(name))}
}

test('draft updates restore the latest scroll immediately after Astro resets it', () => {
  const {win, calls, fire} = environment()
  win.scrollY = 400
  fire('astro:before-preparation')
  // The editor can still scroll while the new HTML is being fetched.
  win.scrollY = 625
  win.scrollX = 12
  fire('astro:before-swap')
  win.scrollY = 0
  win.scrollX = 0
  fire('astro:after-swap')
  assert.deepEqual(calls, [{left: 12, top: 625, behavior: 'instant'}])
  // Script loading must not rewind scrolling after the new page is visible.
  win.scrollY = 750
  fire('astro:page-load')
  fire('astro:after-swap')
  assert.equal(win.scrollY, 750)
  assert.equal(calls.length, 1)
})

test('successive edits preserve their own positions and cleanup removes listeners', () => {
  const {win, calls, cleanup, fire} = environment()
  for (const top of [0, 200, 850, 40]) {
    win.scrollY = top
    fire('astro:before-swap')
    win.scrollY = 0
    fire('astro:after-swap')
    assert.equal(win.scrollY, top)
  }
  cleanup()
  fire('astro:before-swap')
  fire('astro:after-swap')
  assert.equal(calls.length, 4)
})
