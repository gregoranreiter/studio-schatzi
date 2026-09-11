import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {resolve} from 'node:path'

const port = process.env.PREVIEW_TEST_PORT || '4339'
const origin = `http://127.0.0.1:${port}`
const worker = spawn(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), 'dev', '--local', '--ip', '127.0.0.1', '--port', port], {stdio: ['ignore', 'pipe', 'pipe']})
let logs = ''
for (const stream of [worker.stdout, worker.stderr]) stream.on('data', (chunk) => {logs = (logs + chunk).slice(-12000)})
let exited = false
const finished = once(worker, 'exit').then(() => {exited = true})
try {
  const deadline = Date.now() + 30000
  let ready = false
  while (!exited && Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/cms-preview/home/`, {signal: AbortSignal.timeout(1000)})
      if (response.ok && (await response.text()).includes('data-cms-preview')) {ready = true; break}
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error(`Local preview worker did not start.\n${logs}`)
  const tests = spawn(process.execPath, ['--test', 'tests/studio-preview.test.mjs'], {
    stdio: 'inherit', env: {...process.env, PREVIEW_TEST_URL: origin},
  })
  const [code] = await once(tests, 'exit')
  process.exitCode = code ?? 1
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  worker.kill('SIGTERM')
  await finished
}
