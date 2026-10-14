import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { buildHarness } from '@/entities/task'
import { saveTask } from '@/shared/api/admin'
import { normalizeSignature, type ApiTask, type Difficulty, type Signature, type TestCase } from '@/shared/api/content'
import { queryKeys } from '@/shared/api/queryKeys'
import { runGo, type RunResult } from '@/shared/api/run'
import { useContent } from '@/shared/content/ContentContext'
import { BlockEditor, ChipPicker, CompanyPicker, Field, type Block } from '@/shared/ui'

const blank: Initial = {
  slug: '',
  title: '',
  difficulty: 'easy',
  categories: [],
  companies: [],
  leetcodeUrl: null,
  description: [{ p: '' }],
  solutionNotes: null,
  commonMistakes: null,
  solution: null,
  signature: { name: '', params: [{ name: '', type: '' }], returns: '' },
  tests: [],
  complexity: null,
  template: null,
}

/** Blank rows are dropped; an entirely empty signature is saved as {} (a task with no function to write). */
function cleanSignature(sig: Signature): Partial<Signature> {
  const params = sig.params.filter((p) => p.name.trim() || p.type.trim())
  if (!sig.name && params.length === 0 && !sig.returns && !sig.mutates) return {}
  return { ...sig, params, returns: sig.returns || undefined, mutates: sig.mutates || undefined, compare: sig.compare || undefined }
}

const TESTS_HINT = '[{ "name": "example 1", "input": { "param": value }, "expected": value }, …]'

interface Props {
  /** The task to edit; omit to create a new one */
  slug?: string
  /** Called after a successful save */
  onDone: () => void
  onCancel: () => void
  /** Inside a dialog that already has a title: no heading and no top Cancel button */
  compact?: boolean
}

/** Create or edit a task. Used as an admin page and as a dialog on the task page. */
export function TaskForm({ slug, onDone, onCancel, compact }: Props) {
  const { tasks, categories, sections } = useContent()
  const existing = tasks.find((t) => t.slug === slug)
  if (slug && !existing) return <p className="text-[var(--pink)]">No such task.</p>
  return (
    <Form
      key={slug ?? 'new'}
      initial={existing ? { ...existing, signature: normalizeSignature(existing.signature) } : blank}
      isNew={!existing}
      categories={categories}
      sections={sections}
      onDone={onDone}
      onCancel={onCancel}
      compact={compact}
    />
  )
}

/** What the form edits: like a stored task, but the signature is always complete. */
type Initial = Omit<ApiTask, 'number' | 'signature'> & { signature: Signature }

function Form({
  initial,
  isNew,
  categories,
  sections,
  onDone,
  onCancel,
  compact,
}: { initial: Initial; isNew: boolean } & Pick<ReturnType<typeof useContent>, 'categories' | 'sections'> & Pick<Props, 'onDone' | 'onCancel' | 'compact'>) {
  const queryClient = useQueryClient()
  const [t, setT] = useState(initial)
  const [testsText, setTestsText] = useState(() => JSON.stringify(initial.tests, null, 2))
  const [verify, setVerify] = useState<RunResult | 'running' | string | null>(null)

  const set = <K extends keyof Initial>(k: K, v: Initial[K]) => setT((p) => ({ ...p, [k]: v }))
  const setSig = (p: Partial<Signature>) => set('signature', { ...t.signature, ...p })

  const parsed = useMemo((): { tests?: TestCase[]; error?: string } => {
    try {
      const v: unknown = JSON.parse(testsText)
      return Array.isArray(v) ? { tests: v as TestCase[] } : { error: 'Tests must be a JSON array' }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid JSON' }
    }
  }, [testsText])

  const payload = (): Omit<ApiTask, 'number'> => ({
    ...t,
    tests: parsed.tests ?? [],
    leetcodeUrl: t.leetcodeUrl?.trim() || null,
    solution: t.solution?.trim() ? t.solution : null,
    solutionNotes: t.solutionNotes && t.solutionNotes.length > 0 ? t.solutionNotes : null,
    commonMistakes: t.commonMistakes && t.commonMistakes.length > 0 ? t.commonMistakes : null,
    complexity: t.complexity && (t.complexity.time || t.complexity.space) ? t.complexity : null,
    template: t.template?.trim() ? t.template : null,
    signature: cleanSignature(t.signature),
  })

  const save = useMutation({
    mutationFn: () => saveTask(payload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
      onDone()
    },
  })

  // Runs the reference solution against the tests through the same generated harness the app uses.
  const runVerify = async () => {
    if (!t.solution?.trim() || !parsed.tests) return
    setVerify('running')
    try {
      setVerify(await runGo('', t.solution, buildHarness(normalizeSignature(payload().signature), parsed.tests)))
    } catch (e) {
      setVerify(e instanceof Error ? e.message : 'failed')
    }
  }

  const sectionName = (slug: string) => sections.find((s) => s.slug === slug)?.name ?? slug
  const canSave = t.slug !== '' && t.title.trim() !== '' && !parsed.error && !save.isPending

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) save.mutate()
      }}
    >
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{isNew ? 'New task' : `Edit ${initial.slug}`}</h2>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Slug" hint={isNew ? 'lowercase-with-dashes; used in the URL and by saved attempts' : 'cannot be changed'}>
          <input className="search" value={t.slug} disabled={!isNew} onChange={(e) => set('slug', e.target.value.trim())} placeholder="two-sum" />
        </Field>
        <Field label="Title">
          <input className="search" value={t.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Difficulty">
          <select className="search" value={t.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </Field>
        <Field label="LeetCode link (optional)">
          <input className="search" value={t.leetcodeUrl ?? ''} onChange={(e) => set('leetcodeUrl', e.target.value)} placeholder="https://leetcode.com/problems/…" />
        </Field>
      </div>

      <Field label="Categories" group>
        <ChipPicker
          options={categories.map((c) => ({ value: c.slug, label: `${sectionName(c.section)} · ${c.name}` }))}
          value={t.categories}
          onChange={(v) => set('categories', v)}
        />
      </Field>
      <Field label="Companies" group>
        <CompanyPicker value={t.companies} onChange={(v) => set('companies', v)} />
      </Field>

      <Field label="Statement" group>
        <BlockEditor initial={initial.description} onChange={(b: Block[]) => set('description', b)} />
      </Field>

      <fieldset className="panel flex flex-col gap-3 p-4">
        <legend className="px-2 text-xs uppercase tracking-wider text-[var(--muted)]">Function signature (Go)</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Function name">
            <input className="search" value={t.signature.name} onChange={(e) => setSig({ name: e.target.value.trim() })} placeholder="twoSum" />
          </Field>
          <Field label="Returns (empty for in-place)">
            <input className="search" value={t.signature.returns ?? ''} onChange={(e) => setSig({ returns: e.target.value.trim() })} placeholder="[]int" />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-[var(--muted)]">Parameters</span>
          {t.signature.params.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input className="search" placeholder="name" value={p.name} onChange={(e) => setSig({ params: t.signature.params.map((x, j) => (j === i ? { ...x, name: e.target.value.trim() } : x)) })} />
              <input className="search" placeholder="Go type, e.g. []int" value={p.type} onChange={(e) => setSig({ params: t.signature.params.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })} />
              <button type="button" className="btn-danger" aria-label="Remove parameter" onClick={() => setSig({ params: t.signature.params.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <div>
            <button type="button" className="chip" onClick={() => setSig({ params: [...t.signature.params, { name: '', type: '' }] })}>
              + Parameter
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Modifies in place" hint="For tasks that change an argument instead of returning">
            <select className="search" value={t.signature.mutates ?? ''} onChange={(e) => setSig({ mutates: e.target.value })}>
              <option value="">no</option>
              {t.signature.params.filter((p) => p.name).map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Compare results" hint="Unordered: the answer may come in any order">
            <select className="search" value={t.signature.compare ?? ''} onChange={(e) => setSig({ compare: (e.target.value || undefined) as Signature['compare'] })}>
              <option value="">exactly</option>
              <option value="unordered">unordered</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <Field label="Tests (JSON)" hint={TESTS_HINT}>
        <textarea className="search font-mono text-sm" rows={10} value={testsText} onChange={(e) => setTestsText(e.target.value)} spellCheck={false} />
        {parsed.error ? (
          <span className="text-sm text-[var(--pink)]">{parsed.error}</span>
        ) : parsed.tests?.length ? (
          <span className="text-sm text-[var(--green)]">{parsed.tests.length} test(s)</span>
        ) : (
          <span className="text-sm text-[var(--amber)]">No tests: users will see the task but cannot run or submit code until you add some.</span>
        )}
      </Field>

      <fieldset className="panel flex flex-col gap-3 p-4">
        <legend className="px-2 text-xs uppercase tracking-wider text-[var(--muted)]">Reference solution (optional)</legend>
        <Field label="Go code">
          <textarea className="search font-mono text-sm" rows={12} value={t.solution ?? ''} onChange={(e) => set('solution', e.target.value)} spellCheck={false} />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Time complexity">
            <input className="search" value={t.complexity?.time ?? ''} onChange={(e) => set('complexity', { time: e.target.value, space: t.complexity?.space ?? '' })} placeholder="O(n)" />
          </Field>
          <Field label="Space complexity">
            <input className="search" value={t.complexity?.space ?? ''} onChange={(e) => set('complexity', { time: t.complexity?.time ?? '', space: e.target.value })} placeholder="O(1)" />
          </Field>
        </div>
        <Field label="Notes shown under the solution" group>
          <BlockEditor initial={initial.solutionNotes ?? []} onChange={(b) => set('solutionNotes', b)} />
        </Field>
        <Field label="Common mistakes (separate block on the solution tab)" group>
          <BlockEditor initial={initial.commonMistakes ?? []} onChange={(b) => set('commonMistakes', b)} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-ghost" disabled={!t.solution?.trim() || !!parsed.error || !parsed.tests?.length || verify === 'running'} onClick={runVerify}>
            Verify solution against tests
          </button>
          {verify === 'running' && <span className="text-sm text-[var(--cyan)]">Running…</span>}
          {typeof verify === 'string' && verify !== 'running' && <span className="text-sm text-[var(--pink)]">{verify}</span>}
          {verify && typeof verify === 'object' && (
            <span className={`text-sm ${verify.ok ? 'text-[var(--green)]' : 'text-[var(--pink)]'}`}>{verify.ok ? '✓ all tests pass' : `✗ ${verify.status}`}</span>
          )}
        </div>
        {verify && typeof verify === 'object' && !verify.ok && <pre className="attempt-output">{verify.output}</pre>}
      </fieldset>

      <details className="panel p-4">
        <summary className="cursor-pointer text-sm text-[var(--muted)]">Advanced: custom starter code</summary>
        <div className="mt-3">
          <Field label="Starter code (leave empty to generate it from the signature)">
            <textarea className="search font-mono text-sm" rows={8} value={t.template ?? ''} onChange={(e) => set('template', e.target.value)} spellCheck={false} />
          </Field>
        </div>
      </details>

      {save.isError && <p className="text-sm text-[var(--pink)]">{save.error.message}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-run" disabled={!canSave}>
          {save.isPending ? 'Saving…' : 'Save task'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
