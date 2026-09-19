#!/usr/bin/env node
/* Strażnik rozmiaru modułów.

   Koszt edycji pliku przez model językowy jest wprost proporcjonalny do jego długości:
   żeby zmienić jedną funkcję, trzeba otworzyć cały plik. 1 800 linii to ~27 000 tokenów
   za jedno otwarcie, 200 linii to ~3 000. Limit jest tu po to, żeby nikt nie odbudował
   monolitu przez przypadek.

   Użycie:  node narzedzia/rozmiar.mjs [--limit 300] [--lista] */
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join, extname, relative} from 'node:path'

const LIMIT = +(process.argv[process.argv.indexOf('--limit') + 1] || 300)
const KOD = new Set(['.js', '.mjs', '.ts', '.vue'])
const POMIN = new Set(['node_modules', '.git', 'archiwum', 'dist-edytor', 'edytor-app', 'tests', 'meble'])
const korzen = process.cwd()
const pliki = []
;(function chodz(d) {
  for (const w of readdirSync(d)) {
    if (POMIN.has(w) || w.startsWith('.')) continue
    const p = join(d, w)
    if (statSync(p).isDirectory()) chodz(p)
    else if (KOD.has(extname(w)) && !w.endsWith('.d.ts'))
      pliki.push({p: relative(korzen, p), l: readFileSync(p, 'utf8').split('\n').length})
  }
})(korzen)

pliki.sort((a, b) => b.l - a.l)
if (process.argv.includes('--lista')) {
  for (const f of pliki.slice(0, 25)) console.log(String(f.l).padStart(5), f.p)
  process.exit(0)
}
const zaDuze = pliki.filter(f => f.l > LIMIT)
if (!zaDuze.length) {
  console.log(`OK — ${pliki.length} modułów, najdłuższy ${pliki[0].l} l. (limit ${LIMIT}).`)
  process.exit(0)
}
console.error(`Ponad limit ${LIMIT} linii (${zaDuze.length}):\n`)
for (const f of zaDuze) console.error(String(f.l).padStart(5), f.p)
console.error('\nPodziel te moduły albo podnieś limit świadomie — patrz CLAUDE.md.')
process.exit(1)
