import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/i18n' // must initialise before any content registers its translations
import '@/app/styles/index.css'
import { App } from '@/app/App'
import { restoreTheme } from '@/shared/lib/theme'
import { AuthGate } from '@/app/providers/AuthGate'
import { Providers } from '@/app/providers/Providers'
import { ContentProvider } from '@/shared/content/ContentProvider'

restoreTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AuthGate>
        <ContentProvider>
          <App />
        </ContentProvider>
      </AuthGate>
    </Providers>
  </StrictMode>,
)
