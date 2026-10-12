import { addTexts } from '@/shared/i18n'
import type { TheoryDef } from '../../types'
import ru from './ru.json'

addTexts('theory', 'go-strings-basics', { ru })

export const goStringsBasics: TheoryDef = { slug: 'go-strings-basics', category: 'strings', source: { name: 'algocode.io', url: 'https://algocode.io' } }
