import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import sirv from 'sirv'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const korzen = fileURLToPath(new URL('.', import.meta.url))

/* Silnik (renderery/) działa na importmap z CDN i nie może przejść przez transformacje Vite.
   W trybie dev serwujemy go surowo z katalogu repo, pod tym samym originem co edytor,
   żeby ramka z rendererem była dostępna z powłoki (ukrycie starego panelu, później API). */
function silnikBezTransformacji(): Plugin {
  const surowe = sirv(korzen, { dev: true })
  return {
    name: 'silnik-bez-transformacji',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/^\/(renderery|plan|meble|tekstury)\//.test(req.url ?? '')) return surowe(req, res, next)
        next()
      })
    }
  }
}

/* Klucz OpenAI tylko lokalnie: `.env.local` w katalogu repo (OPENAI_API_KEY, poza gitem) czyta wyłącznie
   serwer dev i oddaje go stronie z localhost. Nie ma prefiksu VITE_, więc nigdy nie trafia do builda. */
function kluczLokalny(): Plugin {
  return {
    name: 'klucz-lokalny',
    apply: 'serve',
    configureServer(server) {
      const klucz = loadEnv(server.config.mode, korzen, '').OPENAI_API_KEY ?? ''
      server.middlewares.use('/__lokalne/openai', (req, res) => {
        const lokalny = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ klucz: lokalny ? klucz : '' }))
      })
    }
  }
}

export default defineConfig({
  root: 'edytor',
  base: './',
  plugins: [vue(), tailwindcss(), silnikBezTransformacji(), kluczLokalny()],
  resolve: { alias: { '@': fileURLToPath(new URL('./edytor/src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  build: { outDir: '../dist-edytor', emptyOutDir: true }
})
