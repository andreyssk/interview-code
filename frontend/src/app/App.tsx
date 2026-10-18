import { Navigate, Route, Routes, useLocation, useMatch } from 'react-router-dom'
import { AdminPage, QuestionForm } from '@/pages/admin'
import { MistakeTypePage } from '@/pages/mistake-type'
import { MistakesPage } from '@/pages/mistakes'
import { ProblemListPage } from '@/pages/problem-list'
import { QuestionListPage } from '@/pages/question-list'
import { QuestionsPage } from '@/pages/questions'
import { ProblemsPage } from '@/pages/problems'
import { TaskPage } from '@/pages/task'
import { TheoryPage } from '@/pages/theory'
import { TheoryListPage } from '@/pages/theory-list'
import { ErrorBoundary } from '@/shared/ui'
import { Header } from '@/widgets/header'

export function App() {
  const { pathname } = useLocation()
  // The question editor takes the whole viewport: no header, no admin tabs.
  const isNew = useMatch('/admin/questions/new')
  const isEdit = useMatch('/admin/questions/edit/:id')
  const focus = isNew !== null || isEdit !== null
  return (
    <div className="app">
      {!focus && <Header />}
      <main className={focus ? 'main main-focus' : 'main'}>
        {/* A crash on one page leaves the header usable, and navigating elsewhere clears it. */}
        <ErrorBoundary resetKey={pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/problems" replace />} />
            <Route path="/theory" element={<TheoryListPage />} />
            <Route path="/theory/:slug" element={<TheoryPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/:category" element={<ProblemListPage />} />
            <Route path="/questions" element={<QuestionsPage />} />
            <Route path="/questions/:category" element={<QuestionListPage />} />
            <Route path="/questions/:category/:sub" element={<QuestionListPage />} />
            <Route path="/tasks/:slug" element={<TaskPage />} />
            <Route path="/mistakes" element={<MistakesPage />} />
            <Route path="/mistakes/:id" element={<MistakeTypePage />} />
            <Route path="/admin/questions/new" element={<QuestionForm />} />
            <Route path="/admin/questions/edit/:id" element={<QuestionForm />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
