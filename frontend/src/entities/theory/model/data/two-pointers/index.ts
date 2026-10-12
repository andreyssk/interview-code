import { addTexts } from '@/shared/i18n'
import type { TheoryDef } from '../../types'
import en from './en.json'
import ru from './ru.json'

addTexts('theory', 'two-pointers', { en, ru })

export const twoPointers: TheoryDef = { slug: 'two-pointers', category: 'two-pointers' }
