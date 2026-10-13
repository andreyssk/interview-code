import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { queryKeys } from '@/shared/api/queryKeys'
import { downloadJson } from '../lib/download'

interface Item {
  slug: string
  title?: string
  [key: string]: unknown
}

interface Props {
  /** "task" or "article": only used in the labels */
  noun: string
  /** Slugs that already exist, to flag "replaces" */
  existing: string[]
  /** Saves one parsed item; throws with the server's message on failure */
  save: (item: Item) => Promise<unknown>
  /** Sample file offered for download */
  example: Item
}

type Result = { slug: string; ok: boolean; message?: string }

/** Pick a .json file (one object or an array), review it, import it item by item. */
export function UploadJson({ noun, existing, save, example }: Props) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Result[] | null>(null)

  const read = async (file: File) => {
    setError('')
    setResults(null)
    setItems(null)
    try {
      const data: unknown = JSON.parse(await file.text())
      const list = Array.isArray(data) ? data : [data]
      if (list.length === 0 || list.some((x) => typeof x !== 'object' || x === null || typeof (x as Item).slug !== 'string')) {
        throw new Error(`Every ${noun} needs a "slug". Expected one object or an array of objects.`)
      }
      // The number is assigned by the server; a number in the file is ignored.
      setItems(list.map((x) => ({ ...(x as Item), number: undefined })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file')
    }
    if (input.current) input.current.value = ''
  }

  const run = useMutation({
    mutationFn: async () => {
      const out: Result[] = []
      for (const item of items ?? []) {
        try {
          await save(item)
          out.push({ slug: item.slug, ok: true })
        } catch (e) {
          out.push({ slug: item.slug, ok: false, message: e instanceof Error ? e.message : 'failed' })
        }
      }
      return out
    },
    onSuccess: (out) => {
      setResults(out)
      setItems(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.content })
    },
  })

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
        <button type="button" className="btn-ghost" onClick={() => input.current?.click()}>
          Upload {noun} JSON…
        </button>
        <button type="button" className="btn-ghost" onClick={() => downloadJson(`${noun}-example.json`, example)}>
          Download example
        </button>
        <span className="text-xs text-[var(--muted)]">One {noun} or an array. An existing slug is replaced.</span>
      </div>
      {error && <p className="mt-3 text-sm text-[var(--pink)]">{error}</p>}
      {items && (
        <div className="mt-3 flex flex-col gap-2">
          <ul className="flex flex-col gap-1 text-sm">
            {items.map((x) => (
              <li key={x.slug}>
                <b>{x.slug}</b> {x.title && <span className="text-[var(--muted)]">· {x.title}</span>}{' '}
                <span className={existing.includes(x.slug) ? 'text-[var(--amber)]' : 'text-[var(--green)]'}>{existing.includes(x.slug) ? 'replaces existing' : 'new'}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button type="button" className="btn-run" disabled={run.isPending} onClick={() => run.mutate()}>
              Import {items.length}
            </button>
            <button type="button" className="btn-ghost" disabled={run.isPending} onClick={() => setItems(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {results && (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {results.map((r) => (
            <li key={r.slug} className={r.ok ? 'text-[var(--green)]' : 'text-[var(--pink)]'}>
              {r.ok ? '✓' : '✗'} {r.slug}
              {r.message && <span> — {r.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
