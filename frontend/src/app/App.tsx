import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from '@/pages/admin'
import { MistakeTypePage } from '@/pages/mistake-type'
import { MistakesPage } from '@/pages/mistakes'
import { ProblemListPage } from '@/pages/problem-list'
import { ProblemsPage } from '@/pages/problems'
import { TaskPage } from '@/pages/task'
import { TheoryPage } from '@/pages/theory'
import { TheoryListPage } from '@/pages/theory-list'
import { Header } from '@/widgets/header'

export function App() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/problems" replace />} />
          <Route path="/theory" element={<TheoryListPage />} />
          <Route path="/theory/:slug" element={<TheoryPage />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/problems/:category" element={<ProblemListPage />} />
          <Route path="/tasks/:slug" element={<TaskPage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/mistakes/:id" element={<MistakeTypePage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}
