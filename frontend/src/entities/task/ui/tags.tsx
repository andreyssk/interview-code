import { useTranslation } from 'react-i18next'
import { companyTone } from '../model/companies'
import type { Difficulty } from '../model/types'

const DIFFICULTY_CLASS: Record<Difficulty, string> = { easy: 'neon-cyan', medium: 'neon-amber', hard: 'neon-pink' }
const FLAMES: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 }

export function DifficultyTag({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useTranslation()
  return <span className={`tag ${DIFFICULTY_CLASS[difficulty]}`}><span className="flame">{'🔥'.repeat(FLAMES[difficulty])}</span> {t(`difficulty.${difficulty}`)}</span>
}

export function CompanyTag({ slug }: { slug: string }) {
  const { t } = useTranslation()
  return <span className={`tag ${companyTone(slug)}`}># {t(`companies.${slug}`, { defaultValue: slug })}</span>
}

export function SolvedTag() {
  const { t } = useTranslation()
  return <span className="tag neon-green"># {t('tags.solved')}</span>
}
