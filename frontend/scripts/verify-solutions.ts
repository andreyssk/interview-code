// Runs every task's reference solution (solution.go) against its tests.json, using the same generated harness
// the app uses. Usage: npm run verify   (needs the Go toolchain)
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildHarness } from '../src/entities/task/lib/buildHarness.ts'

const root = fileURLToPath(new URL('../src/entities/task/data/', import.meta.url))
let failed = 0

for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const dir = join(root, entry.name)
  const meta = JSON.parse(readFileSync(join(dir, 'task.json'), 'utf8'))
  const tests = JSON.parse(readFileSync(join(dir, 'tests.json'), 'utf8'))

  if (!existsSync(join(dir, 'solution.go'))) {
    console.log(`- ${entry.name}: no reference solution yet (skipped)`)
    continue
  }

  const work = mkdtempSync(join(tmpdir(), 'verify-'))
  try {
    writeFileSync(join(work, 'go.mod'), 'module sandbox\n\ngo 1.22\n')
    writeFileSync(join(work, 'solution.go'), readFileSync(join(dir, 'solution.go')))
    writeFileSync(join(work, 'harness.go'), buildHarness(meta.signature, tests))
    const run = spawnSync('go', ['run', '.'], { cwd: work, encoding: 'utf8', timeout: 60_000 })
    if (run.status === 0) {
      console.log(`✓ ${entry.name} (${tests.length} tests)`)
    } else {
      failed++
      console.log(`✗ ${entry.name}\n${run.stdout}${run.stderr}`)
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

process.exit(failed ? 1 : 0)
