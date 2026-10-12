import { addTexts, languages } from '@/shared/i18n'
import { buildHarness } from '../lib/buildHarness'
import { buildTemplate } from '../lib/buildTemplate'
import type { TaskDef, TaskMeta, TestCase } from './types'

// Every folder in entities/task/data/ is a task: <slug>/{task,tests,en,ru}.json.
// Adding a task means adding a folder; nothing needs to be registered.
const files = import.meta.glob('../data/*/*.json', { eager: true, import: 'default' })

const sources = import.meta.glob('../data/*/solution.go', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const read = <T>(slug: string, file: string): T => {
  const content = files[`../data/${slug}/${file}.json`]
  if (content === undefined) throw new Error(`Task "${slug}" is missing ${file}.json`)
  return content as T
}

const slugs = Object.keys(files)
  .map((path) => path.match(/^\.\.\/data\/([^/]+)\/task\.json$/)?.[1])
  .filter((s): s is string => !!s)
  .sort()

export const tasks: TaskDef[] = slugs.map((slug) => {
  const { template, ...meta } = read<TaskMeta>(slug, 'task')
  const tests = read<TestCase[]>(slug, 'tests')
  addTexts('tasks', slug, Object.fromEntries(languages.map((lng) => [lng, read<object>(slug, lng)])) as Record<(typeof languages)[number], object>)
  return {
    ...meta,
    slug,
    tests,
    solution: sources[`../data/${slug}/solution.go`],
    template: template ?? buildTemplate(meta.signature),
    harness: buildHarness(meta.signature, tests),
  }
})

const seen = new Set<number>()
for (const t of tasks) {
  if (seen.has(t.number)) throw new Error(`Task number ${t.number} is used twice (${t.slug})`)
  seen.add(t.number)
}
tasks.sort((a, b) => a.number - b.number)

export const findTask = (slug: string | undefined) => tasks.find((t) => t.slug === slug)
