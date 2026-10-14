import { useTranslation } from 'react-i18next'
import type { TaskDef } from '../model/types'

/** The cases the runner checks the solution against (same data the generated Go harness embeds). */
export function TestCases({ task }: { task: TaskDef }) {
  const { t } = useTranslation()
  if (task.tests.length === 0) return <p className="text-[var(--muted)]">{t('task.noTests')}</p>
  return (
    <>
      <p className="mb-4 text-sm text-[var(--muted)]">{t('task.testsHint', { count: task.tests.length })}</p>
      <ol className="flex flex-col gap-3">
        {task.tests.map((test, i) => (
          <li key={i} className="output">
            <div className="mb-2 font-semibold text-[var(--cyan)]">{test.name ?? t('task.testN', { n: i + 1 })}</div>
            {task.signature.params.map((p) => (
              <div key={p.name}>
                <span className="text-[var(--muted)]">{p.name} = </span>
                {JSON.stringify(test.input[p.name])}
              </div>
            ))}
            <div>
              <span className="text-[var(--muted)]">{t('task.expected')}: </span>
              <span className="text-[var(--green)]">{JSON.stringify(test.expected)}</span>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
