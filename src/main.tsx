import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootEl = document.getElementById('root')!

// If the element already has children it was pre-rendered — hydrate to
// attach event handlers without discarding the static markup.
// Otherwise (dev / no prerender) mount fresh.
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, <StrictMode><App /></StrictMode>)
} else {
  createRoot(rootEl).render(<StrictMode><App /></StrictMode>)
}
