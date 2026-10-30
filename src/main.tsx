import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app/App'
import { CrashScreen } from './app/CrashScreen'
import { installChunkRecovery } from './app/recover'
import { installPagePattern } from './ui/pagePattern'

installChunkRecovery()
// only the backdrop: never worth stopping the site starting over
try {
  installPagePattern()
} catch {
  /* plain navy */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashScreen>
      <App />
    </CrashScreen>
  </StrictMode>,
)
