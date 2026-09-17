import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import sirv from 'sirv'
import { defineConfig, type Plugin } from 'vite'

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
        if (/^\/(renderery|plan|meble)\//.test(req.url ?? '')) return surowe(req, res, next)
        next()
      })
    }
  }
}

export default defineConfig({
  root: 'edytor',
  base: './',
  plugins: [vue(), tailwindcss(), silnikBezTransformacji()],
  resolve: { alias: { '@': fileURLToPath(new URL('./edytor/src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  build: { outDir: '../dist-edytor', emptyOutDir: true }
})
