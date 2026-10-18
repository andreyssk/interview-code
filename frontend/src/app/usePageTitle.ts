import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { matchPath, useLocation } from 'react-router-dom'
import { useContent } from '@/shared/content/ContentContext'
import { adminCrumbs } from '@/shared/lib/adminTabs'

const APP_NAME = 'Interview Prep'

/** Sets the browser tab title to "Page name – App name" from the current route. */
export function usePageTitle() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { tasks, articles, categories, questionCategories, questionSubcategories } = useContent()

  useEffect(() => {
    const param = (pattern: string, key: string) => matchPath(pattern, pathname)?.params[key]
    const name = <T extends { slug: string }>(list: T[], slug: string | undefined, pick: (x: T) => string) => {
      const found = list.find((x) => x.slug === slug)
      return found ? pick(found) : undefined
    }

    let page: string | undefined
    if (pathname.startsWith('/admin')) page = adminCrumbs(pathname).reverse().join(' · ')
    else if (pathname.startsWith('/theory/')) page = name(articles, param('/theory/:slug', 'slug'), (a) => a.title)
    else if (pathname.startsWith('/tasks/')) page = name(tasks, param('/tasks/:slug', 'slug'), (x) => x.title)
    else if (pathname.startsWith('/problems/')) page = name(categories, param('/problems/:category', 'category'), (c) => c.name)
    else if (pathname.startsWith('/questions/')) {
      const p: { category?: string; sub?: string } = matchPath('/questions/:category/:sub', pathname)?.params ?? matchPath('/questions/:category', pathname)?.params ?? {}
      page = name(questionSubcategories, p.sub, (s) => s.name) ?? name(questionCategories, p.category, (c) => c.name)
    }
    if (!page) {
      const section = pathname.split('/')[1]
      const key = { theory: 'theory', problems: 'problems', questions: 'questions', quizzes: 'quizzes', mistakes: 'mistakes' }[section]
      page = key ? t(`nav.${key}`) : undefined
    }
    document.title = page ? `${page} – ${APP_NAME}` : APP_NAME
  }, [pathname, t, tasks, articles, categories, questionCategories, questionSubcategories])
}
