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

/* Blendkit: API nie wysyła nagłówków CORS, a materiały wydawane są jako `.blend`, więc przeglądarka
   nie zrobi tego sama. Serwer dev pośredniczy w szukaniu i na żądanie uruchamia Blendera bez okna,
   który wyciąga mapy (barwa, normalne, chropowatość, metaliczność, AO, wysokość) i koduje je do KTX2.
   Wynik ląduje w `tekstury/<id>/` i od tej pory działa też w zbudowanej wersji strony. */
function blendkitLokalnie(): Plugin {
  return {
    name: 'blendkit-lokalnie',
    apply: 'serve',
    configureServer(server) {
      const narzedzie = () => import(new URL('./narzedzia/blendkit.mjs', import.meta.url).href)
      const odpowiedz = (res: any, kod: number, dane: unknown) => {
        res.statusCode = kod
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(dane))
      }
      server.middlewares.use('/__lokalne/blendkit', async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const bk = await narzedzie()
          if (url.pathname.startsWith('/szukaj')) {
            return odpowiedz(res, 200, await bk.szukaj(url.searchParams.get('q') ?? '', { ile: Math.min(48, +(url.searchParams.get('ile') ?? 24)) }))
          }
          if (url.pathname.startsWith('/pobierz')) {
            const id = url.searchParams.get('id')
            if (!id) return odpowiedz(res, 400, { blad: 'brak id' })
            const rozdzielczosc = (url.searchParams.get('res') ?? '2k') as '1k' | '2k' | '4k'
            return odpowiedz(res, 200, await bk.pobierzTeksture(id, { rozdzielczosc, log: (t: string) => server.config.logger.info(`[blendkit] ${t}`) }))
          }
          odpowiedz(res, 404, { blad: 'nieznana ścieżka' })
        } catch (e) {
          odpowiedz(res, 500, { blad: e instanceof Error ? e.message : String(e) })
        }
      })
    }
  }
}

export default defineConfig({
  root: 'edytor',
  base: './',
  plugins: [vue(), tailwindcss(), silnikBezTransformacji(), kluczLokalny(), blendkitLokalnie()],
  resolve: { alias: { '@': fileURLToPath(new URL('./edytor/src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  build: { outDir: '../dist-edytor', emptyOutDir: true }
})
