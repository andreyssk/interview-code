import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { highlightGo } from '@/shared/lib/highlight'
import { RichBlocks } from '@/shared/ui'
import type { TaskDef } from '../model/types'

/** The interview-ready answer with complexity and notes. Hidden until asked for, to avoid spoiling yourself. */
export function ReferenceSolution({ task }: { task: TaskDef }) {
  const { t } = useTranslation()
  const { solutionNotes, commonMistakes } = task
  const [revealed, setRevealed] = useState(false)

  if (!task.solution && commonMistakes.length === 0) return <p className="text-[var(--muted)]">{t('solution.none')}</p>

  if (!revealed) {
    return (
      <div className="panel flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-[var(--muted)]">{t('solution.spoiler')}</p>
        <button className="btn-run" onClick={() => setRevealed(true)}>
          {t('solution.reveal')}
        </button>
      </div>
    )
  }

  return (
    <>
      {task.complexity && task.solution && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="tag neon-cyan">
            {t('solution.time')}: {task.complexity.time}
          </span>
          <span className="tag neon-pink">
            {t('solution.space')}: {task.complexity.space}
          </span>
        </div>
      )}
      {task.solution && <pre className="code-block mb-6">{highlightGo(task.solution)}</pre>}
      {solutionNotes.length > 0 && <RichBlocks blocks={solutionNotes} />}
      {commonMistakes.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 font-semibold">{t('solution.commonMistakes')}</h3>
          <RichBlocks blocks={commonMistakes} />
        </section>
      )}
    </>
  )
}
