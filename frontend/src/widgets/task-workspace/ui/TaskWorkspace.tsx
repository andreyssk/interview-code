import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { CategoryTag } from '@/entities/category'
import { CompanyTag, DifficultyTag, ReferenceSolution, SolvedTag, TestCases, useTaskStats, type TaskDef } from '@/entities/task'
import { AddToMistakes } from '@/features/add-to-mistakes'
import { AttemptHistory } from '@/features/attempt-history'
import { SolveTimer, useSolveTimer } from '@/features/solve-timer'
import { RunConsole, RunOutput, statusTone, useRunCode, useSaveSolution } from '@/features/run-code'
import { useAuth } from '@/shared/auth/AuthContext'
import type { EditorLanguage } from '@/shared/lib/highlight'
import { usePersistentState } from '@/shared/lib/storage'
import { CodeEditor, ConfirmDialog, RichBlocks } from '@/shared/ui'

const LANGUAGES: { id: EditorLanguage; label: string }[] = [
  { id: 'go', label: 'Go' },
  { id: 'java', label: 'Java' },
]

const TABS = ['description', 'tests', 'solution', 'attempts', 'output'] as const

/** LeetCode-style split view: statement and output on the left, editor on the right. */
export function TaskWorkspace({ task, editorActions, adminActions }: { task: TaskDef; editorActions?: ReactNode; adminActions?: ReactNode }) {
  const { t } = useTranslation()
  const { title, description } = task
  const { isSolved, counts } = useTaskStats()
  const { passed, failed } = counts(task.slug)
  const { user } = useAuth()
  // Drafts belong to the signed-in user; the admin also inherits drafts saved before accounts existed.
  const [language, setLanguage] = usePersistentState<EditorLanguage>(`u${user.id}:editor-language`, 'go')
  // One draft per language; the Go key is unchanged so existing drafts are kept.
  const [goCode, setGoCode] = usePersistentState(`u${user.id}:code:${task.slug}`, task.template, user.role === 'admin' ? `code:${task.slug}` : undefined)
  const [javaCode, setJavaCode] = usePersistentState(`u${user.id}:code:java:${task.slug}`, task.javaTemplate)
  const code = language === 'java' ? javaCode : goCode
  const setCode = language === 'java' ? setJavaCode : setGoCode
  const hasTests = task.tests.length > 0 // without tests there is nothing to check a solution against
  const canRun = language === 'go' && hasTests // Java code cannot be run yet
  const requested = useSearchParams()[0].get('tab') // lets a tab be linked to, e.g. ?tab=attempts
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS.find((x) => x === requested) ?? 'description')
  const [resetting, setResetting] = useState(false)
  // Submit records an attempt (and the timer, stats, Output tab); Run only runs the code and prints into the console.
  const { run: submitRun, status, result, isPending } = useRunCode(task.slug)
  const dry = useRunCode(task.slug, { dryRun: true })
  const [consoleOpen, setConsoleOpen] = useState(false)
  const busy = isPending || dry.isPending
  const timer = useSolveTimer(task.slug)
  const saver = useSaveSolution(task.slug)
  const [justSaved, setJustSaved] = useState(false)

  // For code that cannot be run (no tests yet, or Java): keep it as a "saved" submission instead.
  const save = () => {
    if (!code.trim() || saver.isPending) return
    saver.mutate(
      { code, language },
      {
        onSuccess: () => {
          setJustSaved(true)
          setTimeout(() => setJustSaved(false), 2000)
        },
      },
    )
  }

  const runOnly = () => {
    if (!canRun || busy) return
    // The console opens by itself when the output is in.
    dry.run({ code, harness: task.harness }, { onSettled: () => setConsoleOpen(true) })
  }

  const submit = () => {
    if (!canRun || busy) return
    setTab('output')
    // Only a running timer is attached; on a pass the backend stores it and the timer freezes at that reading.
    const solveTimeMs = timer.running ? timer.elapsed() : undefined
    submitRun(
      { code, harness: task.harness, solveTimeMs },
      { onSuccess: (r) => r.status === 'passed' && solveTimeMs !== undefined && timer.finish(solveTimeMs) },
    )
  }

  return (
    <div className="workspace">
      <section className="panel flex min-h-0 flex-col">
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-[var(--border)]">
          {TABS.map((id) => (
            <button key={id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'tab-active' : ''}`}>
              {t(`task.${id}`)}
              {id === 'output' && status !== 'idle' && <span className={`ml-2 text-xs ${statusTone[status]}`}>●</span>}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {tab === 'description' ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <Link to="/problems" className="text-[var(--muted)] hover:text-[var(--cyan)]">
                  {t('task.back')}
                </Link>
                <span className="flex items-center gap-3">
                  {adminActions}
                  {task.leetcodeUrl && (
                    <a href={task.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--amber)] hover:underline">
                      {t('task.leetcode')}
                    </a>
                  )}
                </span>
              </div>
              <h1 className="neon-title mb-3 text-2xl font-bold">
                <span className="mr-2 text-[var(--muted)]">#{task.number}</span>
                {title}
              </h1>
              <div className="mb-5 flex flex-wrap gap-2">
                <DifficultyTag difficulty={task.difficulty} />
                {isSolved(task.slug) && <SolvedTag />}
                {task.categories.map((c) => (
                  <CategoryTag key={c} slug={c} />
                ))}
                {task.companies.map((c) => (
                  <CompanyTag key={c} slug={c} />
                ))}
              </div>
              {(passed > 0 || failed > 0) && (
                <p className="mb-5 text-sm text-[var(--muted)]">
                  <span className="text-[var(--green)]">{t('task.statsSolved', { count: passed })}</span>
                  {' · '}
                  <span className="text-[var(--pink)]">{t('task.statsFailed', { count: failed })}</span>
                </p>
              )}
              <RichBlocks blocks={description} />
            </>
          ) : tab === 'tests' ? (
            <TestCases task={task} />
          ) : tab === 'solution' ? (
            <ReferenceSolution key={task.slug} task={task} />
          ) : tab === 'attempts' ? (
            <AttemptHistory
              taskSlug={task.slug}
              renderActions={(attempt) => <AddToMistakes attempt={attempt} />}
              onRestore={(old, lang) => {
                setLanguage(lang) // the code goes back into the editor it was written in
                if (lang === 'java') setJavaCode(old)
                else setGoCode(old)
                setTab('description')
              }}
            />
          ) : (
            <RunOutput status={status} result={result} />
          )}
        </div>
      </section>

      <section className="panel flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--border)] p-3">
          <span className="flex gap-1" role="group" aria-label={t('task.language')}>
            {LANGUAGES.map((l) => (
              <button key={l.id} className={`chip ${language === l.id ? 'chip-active' : ''}`} aria-pressed={language === l.id} onClick={() => setLanguage(l.id)}>
                {l.label}
              </button>
            ))}
          </span>
          <button className="btn-ghost" onClick={() => setResetting(true)}>
            {t('task.reset')}
          </button>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {editorActions}
            <SolveTimer timer={timer} />
            {!canRun && (
              <button className="btn-ghost" onClick={save} disabled={saver.isPending || !code.trim()} title={t('task.saveHint')}>
                {justSaved ? t('task.saved') : saver.isError ? t('task.saveFailed') : t('task.save')}
              </button>
            )}
            <span className="tip" data-tip={!hasTests ? t('task.noTestsRun') : canRun ? t('task.runHint') : t('task.javaNotRunnable')}>
              <button className="btn-ghost" onClick={runOnly} disabled={busy || !canRun}>
                {dry.isPending && <span className="spinner" aria-hidden="true" />}
                {dry.isPending ? t('task.running') : t('task.run')}
              </button>
            </span>
            <span className="tip" data-tip={!hasTests ? t('task.noTestsRun') : canRun ? t('task.submitHint') : t('task.javaNotRunnable')}>
              <button className="btn-run" onClick={submit} disabled={busy || !canRun}>
                {isPending && <span className="spinner" aria-hidden="true" />}
                {isPending ? t('task.submitting') : t('task.submit')}
              </button>
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor
            value={code}
            onChange={setCode}
            onRun={canRun ? runOnly : save}
            onSubmit={canRun ? submit : undefined}
            label={LANGUAGES.find((l) => l.id === language)?.label}
            language={language}
          />
        </div>
        <RunConsole status={dry.status} result={dry.result} open={consoleOpen} onOpenChange={setConsoleOpen} />
      </section>
      <ConfirmDialog
        open={resetting}
        title={t('task.resetTitle')}
        message={t('task.resetConfirm')}
        confirmLabel={t('task.resetAction')}
        onConfirm={() => {
          setCode(language === 'java' ? task.javaTemplate : task.template)
          setResetting(false)
        }}
        onCancel={() => setResetting(false)}
      />
    </div>
  )
}
