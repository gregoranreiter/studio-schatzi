import {createClient} from '@sanity/client'
import {writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'

const outputPath = resolve(process.cwd(), 'dist', '_redirects')

if (process.env.CONTENT_SOURCE === 'local') {
  await writeFile(outputPath, '# No redirects in the local migration snapshot.\n', 'utf8')
  process.exit(0)
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'cun0jylh',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-02-19',
  useCdn: false,
  perspective: 'published',
})

const redirects = await client.fetch(
  '*[_type == "redirect"] | order(from asc){from, to, status}',
  {},
  {tag: 'cloudflare-redirects'},
)

if (!Array.isArray(redirects)) throw new Error('Sanity redirects query did not return an array')

const sources = new Set()
const lines = redirects.map((redirect, index) => {
  const {from, to, status} = redirect || {}
  if (typeof from !== 'string' || !from.startsWith('/') || /\s/.test(from)) {
    throw new Error(`Redirect ${index + 1} has an invalid source path`)
  }
  if (typeof to !== 'string' || (!to.startsWith('/') && !to.startsWith('https://')) || /[\r\n]/.test(to)) {
    throw new Error(`Redirect ${from} has an invalid destination`)
  }
  if (![301, 302, 307, 308].includes(status)) {
    throw new Error(`Redirect ${from} has an unsupported status`)
  }
  if (from === to) throw new Error(`Redirect ${from} points to itself`)
  if (sources.has(from)) throw new Error(`Duplicate redirect source: ${from}`)
  sources.add(from)
  return `${from} ${to} ${status}`
})

const file = lines.length > 0
  ? `# Generated from Sanity. Edit redirects in the Studio.\n${lines.join('\n')}\n`
  : '# Generated from Sanity. No redirects are currently published.\n'

await writeFile(outputPath, file, 'utf8')
process.stdout.write(`Generated ${lines.length} Cloudflare redirect${lines.length === 1 ? '' : 's'}.\n`)
