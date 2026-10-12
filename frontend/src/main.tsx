import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/i18n' // must initialise before any content registers its translations
import '@/app/styles/index.css'
import { App } from '@/app/App'
import { restoreTheme } from '@/shared/lib/theme'
import { Providers } from '@/app/providers/Providers'

restoreTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)
