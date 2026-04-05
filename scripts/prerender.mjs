/**
 * Pre-render the React app to static HTML and inject it into dist/index.html.
 * This runs as a postbuild step after `vite build` and `vite build --ssr`.
 *
 * Crawlers and social cards read the static HTML directly.
 * The browser then uses hydrateRoot to attach React event handlers.
 */
import { readFileSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Set up a real DOM environment with jsdom so Framer Motion can use
// addEventListener, createElement, etc. during renderToString.
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>')
global.window = dom.window
global.document = dom.window.document
// navigator is a getter-only property in Node v21+ — define it safely
try {
  Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true })
} catch { /* already defined */ }
global.HTMLElement = dom.window.HTMLElement
global.Element = dom.window.Element
global.Node = dom.window.Node
global.requestAnimationFrame = (cb) => setTimeout(cb, 0)
global.cancelAnimationFrame = clearTimeout
global.matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const { render } = await import(join(root, 'dist/server/entry-server.js'))

const template = readFileSync(join(root, 'dist/index.html'), 'utf-8')
const appHtml = render()

const output = template.replace(
  '<div id="root"></div>',
  `<div id="root">${appHtml}</div>`
)

writeFileSync(join(root, 'dist/index.html'), output)

// Clean up the temporary server bundle
rmSync(join(root, 'dist/server'), { recursive: true, force: true })

console.log('[prerender] ✓ dist/index.html pre-rendered successfully')
