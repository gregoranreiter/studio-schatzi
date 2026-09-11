import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const load = (path, dependencies = {}) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText
  const exports = {}
  vm.runInNewContext(compiled, {exports, URLSearchParams, TextDecoder, Uint8Array, require: (id) => dependencies[id] || require(id)})
  return exports
}
const mapper = load('../src/lib/content/project.ts')
const {buildPreviewContent} = load('../src/lib/preview/content.ts', {'../content/project': mapper})
const {PREVIEW_CHANNEL, isTrustedPreviewEvent} = load('../src/lib/preview/protocol.ts')
const project = {
  _id: 'project-one', _type: 'project', title: 'Published title', slug: {current: 'one'},
  summary: 'Summary', description: 'Description', scope: ['Design'],
  cover: {asset: {_ref: 'image-abc123-1600x1000-jpg'}, alt: 'Cover', backgroundTone: '#ffdd00'},
  gallery: [{asset: {_ref: 'image-def456-1000x1500-jpg'}, alt: 'Gallery', layout: 'portrait'}],
}
const home = {_id: 'homePage', _type: 'homePage', headline: 'Home', projects: [{placement: 'left', project: {_ref: 'project-one'}}]}
const build = (docs, current = null) => buildPreviewContent(docs, current, 'cun0jylh', 'production')

test('draft references win regardless of query order and unsaved editor values win over saved drafts', () => {
  const draft = {...project, _id: 'drafts.project-one', title: 'Draft title'}
  for (const docs of [[project, draft, home], [draft, project, home]]) {
    assert.equal(build(docs).home.projects[0].project.title, 'Draft title')
    assert.equal(build(docs, {...project, title: 'Unsaved title'}).home.projects[0].project.title, 'Unsaved title')
  }
})

test('valid preview images and crop geometry use the production mapper unchanged', () => {
  const cropped = {...project, cover: {...project.cover, crop: {top: .1, bottom: .1, left: .2, right: .1}}}
  const expected = mapper.createProjectMapper('cun0jylh', 'production').mapProject({
    ...cropped, slug: 'one', cover: {...cropped.cover, dimensions: {width: 1600, height: 1000}},
    gallery: [{...project.gallery[0], dimensions: {width: 1000, height: 1500}}], related: [],
  })
  assert.equal(JSON.stringify(build([cropped]).projects[0]), JSON.stringify(expected))
})

test('cleared fields and incomplete unpublished projects never reuse published content', () => {
  const cleared = build([project], {...project, title: '', summary: '', gallery: [], scope: []}).projects[0]
  assert.equal(cleared.title, '')
  assert.equal(cleared.summary, '')
  assert.equal(cleared.gallery.length, 0)
  const fresh = build([], {_id: 'drafts.new-project', _type: 'project', title: 'New draft'}).projects[0]
  assert.equal(fresh.slug, 'draft-new-project')
  assert.equal(fresh.title, 'New draft')
  assert.ok(fresh.cover.src.startsWith('data:image/'))
})

test('home reordering, placements and deletions are reflected immediately', () => {
  const other = {...project, _id: 'project-two', slug: {current: 'two'}}
  const current = {...home, projects: [{placement: 'right', project: {_ref: 'project-two'}}, {placement: 'full', project: {_ref: 'project-one'}}]}
  assert.equal(build([home, project, other], current).home.projects.map(({project, placement}) => `${project.slug}:${placement}`).join(','), 'two:right,one:full')
  assert.equal(build([home, project], {...home, headline: '', projects: []}).home.projects.length, 0)
  assert.equal(build([home, project], {...home, headline: '', projects: []}).home.headline, '')
})

test('preview messages require the exact origin, window and protocol channel', () => {
  const source = {}
  const event = {source, origin: 'https://cms.studioschatzi.at', data: {channel: PREVIEW_CHANNEL, type: 'connect', session: 'session'}}
  const allowed = ['https://cms.studioschatzi.at']
  assert.equal(isTrustedPreviewEvent(event, source, allowed), true)
  assert.equal(isTrustedPreviewEvent({...event, origin: 'https://cms.studioschatzi.at.evil.test'}, source, allowed), false)
  assert.equal(isTrustedPreviewEvent({...event, source: {}}, source, allowed), false)
  assert.equal(isTrustedPreviewEvent({...event, data: null}, source, allowed), false)
  assert.equal(isTrustedPreviewEvent({...event, data: {...event.data, channel: 'other'}}, source, allowed), false)
})

const {isPreviewPayload, readPreviewPayload, MAX_PREVIEW_BYTES} = load('../src/lib/preview/request.ts')
test('renderer accepts production-mapped content and rejects malformed shapes, URLs and CSS', () => {
  const payload = {content: build([home, project]), slug: 'one'}
  assert.equal(isPreviewPayload(payload), true)
  for (const change of [
    {cover: {src: 'javascript:alert(1)', alt: ''}},
    {tone: '#ffffff; background: url(https://example.com)'},
    {gallery: null}, {scope: [null]}, {cardImage: {aspectRatio: '1 / 1', position: 'url(x)'}},
  ]) {
    const invalid = structuredClone(payload)
    Object.assign(invalid.content.projects[0], change)
    assert.equal(isPreviewPayload(invalid), false)
  }
})
test('renderer bounds streamed requests and rejects invalid payloads', async () => {
  const payload = {content: build([home, project]), slug: 'one'}
  const request = (body) => new Request('https://example.com/cms-preview/home/', {method: 'POST', body: new URLSearchParams({payload: body})})
  assert.equal((await readPreviewPayload(request(JSON.stringify(payload)))).slug, 'one')
  await assert.rejects(readPreviewPayload(request('null')))
  await assert.rejects(readPreviewPayload(request('x'.repeat(MAX_PREVIEW_BYTES + 1))))
})

test('rendered preview matches public home and every project; requests are isolated and uncached', {skip: !process.env.PREVIEW_TEST_URL}, async () => {
  const {createClient} = await import('@sanity/client')
  const client = createClient({projectId: 'cun0jylh', dataset: 'production', apiVersion: '2026-09-04', perspective: 'published', useCdn: false})
  const documents = await client.fetch('*[_type in ["homePage", "project"]]{_id,_type,headline,projects,title,shortTitle,slug,summary,description,scope,cover,gallery,relatedProjects}')
  const content = build(documents)
  const origin = new URL(process.env.PREVIEW_TEST_URL).origin
  const main = (html) => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]
  for (const slug of ['', ...content.projects.map((project) => project.slug)]) {
    const endpoint = `${origin}/cms-preview/${slug ? 'project' : 'home'}/`
    const response = await fetch(endpoint, {method: 'POST', headers: {origin}, body: new URLSearchParams({payload: JSON.stringify({content, slug})})})
    assert.equal(response.status, 200, response.status === 200 ? '' : await response.text())
    assert.match(response.headers.get('cache-control'), /no-store/)
    assert.match(response.headers.get('x-robots-tag'), /noindex/)
    const preview = await response.text()
    const published = await (await fetch(`${origin}/${slug ? `projekte/${slug}/` : ''}`)).text()
    assert.ok(main(preview), 'Rendered main exists')
    assert.equal(main(preview), main(published), `Markup parity: ${slug || 'homepage'}`)
    for (const img of preview.matchAll(/<img\b[^>]*>/g)) assert.match(img[0], /crossorigin="anonymous"/)
    const empty = await (await fetch(endpoint)).text()
    assert.ok(!main(empty).includes(content.home.headline), 'GET never returns another request’s draft')
  }
  assert.equal((await fetch(`${origin}/cms-preview/home/`, {method: 'POST', headers: {origin}, body: new URLSearchParams({payload: 'null'})})).status, 400)
  assert.equal((await fetch(`${origin}/cms-preview/home/`, {method: 'POST', headers: {origin: 'https://untrusted.example'}, body: new URLSearchParams({payload: 'null'})})).status, 403)
})

const {splitWidth, readSplitRatio} = load('../src/lib/preview/split.ts')
test('resizing protects both panes and restores the preferred ratio after a narrow window', () => {
  assert.equal(splitWidth(1000, 0), 360)
  assert.equal(splitWidth(1000, 1), 680)
  assert.equal(splitWidth(1200, 0.6), 720)
  assert.equal(splitWidth(800, 0.6), 480)
  assert.equal(splitWidth(1200, 0.6), 720)
  assert.equal(splitWidth(1200, 0.5), 600)
})
test('stored split preferences tolerate unavailable or invalid values', () => {
  for (const value of [null, '', 'NaN', 'Infinity', '-0.2', '0', '1', 'broken']) assert.equal(readSplitRatio(value), 0.5)
  assert.equal(readSplitRatio('0.65'), 0.65)
})

const {previewViewport} = load('../src/lib/preview/viewport.ts')
test('Auto tracks the available column at actual size without frame insets', () => {
  for (const width of [320, 520, 1000]) {
    const view = previewViewport('auto', {width, height: 700})
    assert.equal(view.width, width)
    assert.equal(view.scale, 1)
    assert.equal(view.frameWidth, width)
    assert.equal(view.height, 700)
    assert.equal(view.top, 0)
    assert.equal(view.left, 0)
  }
})
test('device width stays fixed as its frame scales within a resized CMS column', () => {
  for (const [mode, width] of [['mobile', 390], ['tablet', 768], ['desktop', 1280]]) {
    for (const columnWidth of [320, 520, 1600]) {
      const view = previewViewport(mode, {width: columnWidth, height: 700})
      assert.equal(view.width, width)
      assert.ok(view.scale > 0 && view.scale <= 1)
      assert.ok(view.frameWidth <= columnWidth - 32)
      assert.equal(view.height * view.scale + 2, view.frameHeight)
      assert.equal(view.top + view.frameHeight + 16, 700)
    }
  }
})
